// 医院向け：届いたオンライン相談を見て、概算と担当医のひとことを返信する画面（メールのリンクから開く）
import type { Metadata } from "next";
import { REPLY_TTL_DAYS, concernLabel, hashToken, optionLabel, range } from "@/lib/consult-mail";
import { formatPrice } from "@/lib/options";
import { getSupabaseAdmin } from "@/lib/supabase";

export const metadata: Metadata = { title: "オンライン相談への返信", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function ClinicReplyPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ sent?: string; error?: string }> }) {
  const { token } = await params;
  const { sent, error } = await searchParams;
  const db = getSupabaseAdmin();
  if (!db) return <Notice text="現在ご利用いただけません。" />;

  const { data: r } = await db
    .from("consultation_requests")
    .select("id, status, created_at, reply_min, reply_max, clinics(name), doctors(name), consultations(name, age_range, concern, option, budget_max, wishes, note, photo_paths, estimate_min, estimate_max)")
    .eq("reply_token_hash", hashToken(token))
    .maybeSingle();
  if (!r) return <Notice text="このリンクは無効です。" />;
  if (Date.now() - new Date(r.created_at).getTime() > REPLY_TTL_DAYS * 86_400_000) return <Notice text="返信の期限が過ぎています。" />;

  const c = r.consultations as unknown as {
    name: string; age_range: string | null; concern: string; option: string; budget_max: number | null;
    wishes: string[]; note: string | null; photo_paths: string[]; estimate_min: number | null; estimate_max: number | null;
  };
  const clinic = (r.clinics as unknown as { name: string }).name;
  const doctor = (r.doctors as unknown as { name: string } | null)?.name ?? null;

  const photos: string[] = [];
  for (const path of c.photo_paths) {
    const { data } = await db.storage.from("consult-photos").createSignedUrl(path, 60 * 60);
    if (data) photos.push(data.signedUrl);
  }

  return (
    <main className="mx-auto max-w-xl px-4 py-8 text-[#15202B]">
      <p className="text-sm text-gray-500">{clinic} 様</p>
      <h1 className="mt-1 text-xl font-bold">オンライン相談への返信</h1>

      <dl className="mt-6 grid grid-cols-[7rem_1fr] gap-y-2 rounded-2xl border border-gray-200 bg-white p-4 text-sm">
        <dt className="text-gray-500">ご指名</dt><dd>{doctor ? `${doctor} 先生` : "指定なし"}</dd>
        <dt className="text-gray-500">お名前</dt><dd>{c.name}（{c.age_range ?? "年代未回答"}）</dd>
        <dt className="text-gray-500">お悩み</dt><dd>{concernLabel(c.concern)}</dd>
        <dt className="text-gray-500">希望の治療</dt><dd>{optionLabel(c.option)}</dd>
        <dt className="text-gray-500">ご予算</dt><dd>{c.budget_max ? `${formatPrice(c.budget_max)}まで` : "未定"}</dd>
        <dt className="text-gray-500">重視すること</dt><dd>{c.wishes.join("、") || "—"}</dd>
        <dt className="text-gray-500">ご相談内容</dt><dd className="whitespace-pre-wrap">{c.note ?? "—"}</dd>
        <dt className="text-gray-500">サイトの目安</dt><dd>{range(c.estimate_min, c.estimate_max)}</dd>
      </dl>

      {photos.length > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-2">
          {photos.map((src, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <a key={src} href={src} target="_blank" rel="noreferrer"><img src={src} alt={`患者さまの写真 ${i + 1}`} className="aspect-square w-full rounded-xl object-cover" /></a>
          ))}
        </div>
      )}

      {r.status !== "sent" || sent ? (
        <p className="mt-6 rounded-xl bg-[#E7F4F2] p-4 text-sm font-bold text-[#0B5A51]">
          返信済みです（{range(r.reply_min, r.reply_max)}）。患者さまにメールでお届けしました。
        </p>
      ) : (
        <form action="/api/consult/reply" method="post" className="mt-6 space-y-4">
          {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error.slice(0, 300)}</p>}
          <input type="hidden" name="token" value={token} />
          <div className="grid grid-cols-2 gap-3">
            <Num name="reply_min" label="概算 下限（円・税込）" />
            <Num name="reply_max" label="概算 上限（円・税込）" />
          </div>
          <label className="block">
            <span className="mb-1 block text-sm font-bold">考えられる治療（任意）</span>
            <input name="reply_plan" maxLength={100} placeholder="例：部分矯正（マウスピース）、3〜6ヶ月" className="w-full rounded-lg border border-gray-300 px-3 py-2" />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-bold">担当医からのひとこと（任意）</span>
            <textarea name="reply_message" rows={4} maxLength={800} className="w-full rounded-lg border border-gray-300 px-3 py-2" />
          </label>
          <p className="text-xs text-gray-500">
            検査前の目安としてお伝えください。追加費用（検査料・調整料・保定装置など）は概算に含めてください。「必ず治る」「痛くない」など効果を保証する表現は避けてください（医療広告ガイドライン）。
          </p>
          <button className="w-full rounded-xl bg-[#0B6E63] py-4 font-bold text-white hover:bg-[#08534B]">患者さまに返信する</button>
        </form>
      )}
    </main>
  );
}

function Num({ name, label }: { name: string; label: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-bold">{label}</span>
      <input name={name} type="number" required min={1000} step={1000} inputMode="numeric" className="w-full rounded-lg border border-gray-300 px-3 py-2" />
    </label>
  );
}

function Notice({ text }: { text: string }) {
  return <main className="mx-auto max-w-xl px-4 py-16 text-center text-gray-600">{text}</main>;
}
