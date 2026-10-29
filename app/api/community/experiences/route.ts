// みんなの記録（体験記録）の投稿。機械チェックを通れば公開、通らなければ管理画面で確認してから公開
import { NextResponse } from "next/server";
import { AGE_BANDS, CHOOSE_AGAIN, COMMUNITY_OPTIONS, DURATIONS, communityDb, hashIp, moderate, statusFor, tooMany } from "@/lib/community";

const int = (v: unknown) => (typeof v === "number" && Number.isInteger(v) ? v : typeof v === "string" && /^\d+$/.test(v) ? Number(v) : null);
const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export async function POST(req: Request) {
  const db = communityDb();
  if (!db) return NextResponse.json({ error: "ただいま準備中のため、投稿はまだ受け付けていません" }, { status: 503 });
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  const option = COMMUNITY_OPTIONS.find((o) => o.value === b.option_code)?.value;
  const total = int(b.total_paid);
  const months = int(b.months);
  const pain = int(b.pain);
  const satisfaction = int(b.satisfaction);
  const again = typeof b.choose_again === "string" && b.choose_again in CHOOSE_AGAIN ? b.choose_again : null;
  const age = AGE_BANDS.find((a) => a === b.age_band) ?? null;
  const good = text(b.good, 300);
  const regret = text(b.regret, 300);
  if (!option || !total || total < 1000 || total > 5_000_000 || !satisfaction || satisfaction < 1 || satisfaction > 5) {
    return NextResponse.json({ error: "治療・総額・満足度を入力してください" }, { status: 400 });
  }
  if (b.agree !== true) return NextResponse.json({ error: "投稿ルールへの同意が必要です" }, { status: 400 });

  const ipHash = hashIp(req);
  if (await tooMany("community_experiences", ipHash)) return NextResponse.json({ error: "今日の投稿数の上限に達しました。また明日お願いします" }, { status: 429 });

  const flags = await moderate([good, regret].filter(Boolean).join("\n"));
  // 文章なしの記録は数字だけなのでチェック不要
  const finalFlags = good || regret ? flags : [];
  const status = statusFor(finalFlags);
  const { error } = await db.from("community_experiences").insert({
    option_code: option, total_paid: total,
    months: months !== null && DURATIONS.some((d) => d.value === months) ? months : null,
    pain: pain && pain >= 1 && pain <= 5 ? pain : null, satisfaction, choose_again: again, age_band: age,
    good: good || null, regret: regret || null, status, flags: finalFlags, ip_hash: ipHash,
  });
  if (error) return NextResponse.json({ error: "保存できませんでした。時間をおいてお試しください" }, { status: 500 });
  return NextResponse.json({ status });
}
