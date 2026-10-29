// Stripe Webhook：決済完了でPR枠を有効化し、解約・支払い失敗で自動的に掲載を外す
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { FROM, getResend } from "@/lib/resend";
import { getStripe } from "@/lib/stripe";
import { getSupabaseAdmin } from "@/lib/supabase";

const STATUS: Record<string, "active" | "past_due" | "canceled"> = {
  active: "active",
  trialing: "active",
  past_due: "past_due",
  unpaid: "past_due",
  incomplete: "past_due",
  canceled: "canceled",
  incomplete_expired: "canceled",
  paused: "canceled",
};

function periodEnd(sub: Stripe.Subscription): string | null {
  const end = sub.items.data[0]?.current_period_end;
  return end ? new Date(end * 1000).toISOString() : null;
}

export async function POST(req: Request) {
  const stripe = getStripe();
  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, req.headers.get("stripe-signature") ?? "", process.env.STRIPE_WEBHOOK_SECRET ?? "");
  } catch {
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  const db = getSupabaseAdmin();
  if (!db) return NextResponse.json({ error: "Supabase 未設定" }, { status: 500 });

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const sponsorshipId = session.client_reference_id;
    if (sponsorshipId && session.mode === "subscription" && typeof session.subscription === "string") {
      const sub = await stripe.subscriptions.retrieve(session.subscription);
      const { data: sp } = await db
        .from("sponsorships")
        .update({
          status: STATUS[sub.status] ?? "past_due",
          stripe_customer_id: typeof session.customer === "string" ? session.customer : null,
          stripe_subscription_id: sub.id,
          current_period_end: periodEnd(sub),
          updated_at: new Date().toISOString(),
        })
        .eq("id", sponsorshipId)
        .select("clinic_name, contact_email")
        .single();

      if (sp) {
        await getResend().emails.send({
          from: FROM,
          to: sp.contact_email,
          subject: "【自費歯科ナビ】PR枠の掲載を開始しました",
          html: `<p>${sp.clinic_name} ご担当者様</p><p>お申込みありがとうございます。サイトトップの「PR枠（PR）」への掲載を開始しました。</p><p>解約は Stripe から届く領収メールのリンクよりいつでも行えます。</p>`,
        });
      }
      revalidatePath("/start");
    }
  }

  if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
    const sub = event.data.object;
    await db
      .from("sponsorships")
      .update({
        status: event.type === "customer.subscription.deleted" ? "canceled" : STATUS[sub.status] ?? "past_due",
        current_period_end: periodEnd(sub),
        updated_at: new Date().toISOString(),
      })
      .eq("stripe_subscription_id", sub.id);
    revalidatePath("/start");
  }

  return NextResponse.json({ received: true });
}
