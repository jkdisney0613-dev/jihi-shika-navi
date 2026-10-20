// 月次タスク：先月までに届けたオンライン相談を、医院ごとに Stripe の請求書にまとめて送る
// 1件ごとの定額（治療費の割合ではない）。請求書は Stripe からメールで届き、カード・振込で払える
import { NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/cron-auth";
import { getStripe } from "@/lib/stripe";
import { getSupabaseAdmin } from "@/lib/supabase";

export const maxDuration = 300;

export async function GET(req: Request) {
  if (!isAuthorizedCron(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const db = getSupabaseAdmin();
  if (!db) return NextResponse.json({ error: "Supabase 未設定" }, { status: 500 });
  const stripe = getStripe();

  // 今月1日（日本時間）より前の未請求分
  const now = new Date(Date.now() + 9 * 3600_000);
  const cutoff = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1) - 9 * 3600_000).toISOString();

  const { data: rows, error } = await db
    .from("consultation_requests")
    .select("id, partner_id, lead_price, created_at, clinic_partners(clinic_name, contact_email, stripe_customer_id, plan)")
    .eq("billable", true)
    .is("billed_at", null)
    .lt("created_at", cutoff);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const byPartner = new Map<string, typeof rows>();
  for (const r of rows ?? []) byPartner.set(r.partner_id, [...(byPartner.get(r.partner_id) ?? []), r]);

  const results = [];
  for (const [partnerId, items] of byPartner) {
    const p = items[0].clinic_partners as unknown as { clinic_name: string; contact_email: string; stripe_customer_id: string | null; plan: string };
    if (p.plan !== "per_lead") continue; // 月額プランは相談を課金しない
    try {
      let customer = p.stripe_customer_id;
      if (!customer) {
        customer = (await stripe.customers.create({ name: p.clinic_name, email: p.contact_email, metadata: { partner_id: partnerId } }, { idempotencyKey: `partner-${partnerId}` })).id;
        await db.from("clinic_partners").update({ stripe_customer_id: customer }).eq("id", partnerId);
      }
      for (const r of items) {
        // 同じ相談を二重に請求しないよう、相談IDを冪等キーにする
        const ii = await stripe.invoiceItems.create(
          { customer, currency: "jpy", amount: r.lead_price, description: `オンライン相談 1件（${new Date(r.created_at).toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo" })}）` },
          { idempotencyKey: `lead-${r.id}` },
        );
        await db.from("consultation_requests").update({ stripe_invoice_item_id: ii.id, billed_at: new Date().toISOString() }).eq("id", r.id);
      }
      const invoice = await stripe.invoices.create({
        customer,
        collection_method: "send_invoice",
        days_until_due: 14,
        pending_invoice_items_behavior: "include",
        description: "自費歯科ナビ オンライン相談のご請求",
      });
      await stripe.invoices.finalizeInvoice(invoice.id!);
      await stripe.invoices.sendInvoice(invoice.id!);
      results.push({ partnerId, leads: items.length, invoice: invoice.id });
    } catch (e) {
      console.error("[billing] failed", partnerId, e);
      results.push({ partnerId, error: (e as Error).message });
    }
  }

  // プライバシーポリシーどおり、1年を過ぎた相談の写真を消す
  const yearAgo = new Date(Date.now() - 365 * 86_400_000).toISOString();
  const { data: old } = await db.from("consultations").select("id, photo_paths").lt("created_at", yearAgo).neq("photo_paths", "{}");
  for (const c of old ?? []) {
    const { error: se } = await db.storage.from("consult-photos").remove(c.photo_paths);
    if (!se) await db.from("consultations").update({ photo_paths: [] }).eq("id", c.id);
  }

  const failed = results.filter((r) => "error" in r).length;
  await db.from("routine_runs").insert({ routine: "billing", status: failed ? (failed === results.length ? "failed" : "partial") : "success", summary: { results }, finished_at: new Date().toISOString() });
  return NextResponse.json({ results });
}
