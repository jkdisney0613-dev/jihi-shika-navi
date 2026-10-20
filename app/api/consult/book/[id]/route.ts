// GET /api/consult/book/:id：患者さんが返信メールの「予約する」を押したら記録して医院の予約ページへ送る
// （医院に「相談から予約につながった数」を見せるための記録。課金には使わない）
import { NextResponse } from "next/server";
import { siteUrl } from "@/lib/cron-auth";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getSupabaseAdmin();
  if (!db || !/^[0-9a-f-]{36}$/.test(id)) return NextResponse.redirect(siteUrl("/"), 302);

  const { data: r } = await db.from("consultation_requests").select("id, status, clinics(slug, booking_url)").eq("id", id).maybeSingle();
  if (!r) return NextResponse.redirect(siteUrl("/"), 302);
  if (r.status === "replied") await db.from("consultation_requests").update({ status: "booked" }).eq("id", id);

  const clinic = r.clinics as unknown as { slug: string; booking_url: string | null };
  return NextResponse.redirect(clinic.booking_url ?? siteUrl(`/clinics/${clinic.slug}`), 302);
}
