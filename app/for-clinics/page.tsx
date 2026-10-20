import type { Metadata } from "next";
import { PREFECTURES } from "@/lib/options";

export const metadata: Metadata = {
  title: "歯科医院様向け：おすすめ枠のご案内",
  description: "自費診療を検討している患者様に医院を紹介する「おすすめ枠（月額掲載）」のお申込みページです。",
  robots: { index: false },
};

export default async function ForClinicsPage({ searchParams }: { searchParams: Promise<{ applied?: string }> }) {
  const { applied } = await searchParams;
  const leadPrice = Number(process.env.CONSULT_LEAD_PRICE ?? 5000).toLocaleString("ja-JP");
  const price = process.env.NEXT_PUBLIC_SPONSOR_PRICE_LABEL ?? "月額 30,000円（税込）";
  return (
    <main className="mx-auto max-w-xl px-4 py-10">
      <section className="mb-12 rounded-2xl border-2 border-[#0B6E63] p-5">
        <h1 className="text-2xl font-bold">オンライン相談の受付（月額なし・1件ごと）</h1>
        <ul className="mt-4 list-disc space-y-1 pl-5 text-gray-700">
          <li>比較中の患者さまが、来院前に先生を指名して概算を聞きに来ます（写真つきの相談もあります）</li>
          <li>メールのリンクから概算と担当医のひとことを返信するだけ。患者さまはそのまま予約ページへ進みます</li>
          <li>相談1件 {leadPrice}円（税込）。月額費用・初期費用なし。同じ方からの30日以内の再相談は数えません</li>
          <li>毎月1日に前月分を Stripe の請求書でお送りします（カード・振込）</li>
        </ul>
        <p className="mt-3 text-xs text-gray-500">
          ※料金は相談の取り次ぎに対する定額で、治療の成約や治療費に応じた手数料ではありません。表示順は口コミ評価順で、料金とは関係ありません。担当医の資格表記は医療広告ガイドラインに沿って当サイトで確認します。
        </p>
        {applied === "consult" ? (
          <p className="mt-6 rounded-xl bg-[#E7F4F2] p-4 font-bold text-[#0B5A51]">お申込みを受け付けました。担当医の情報を確認のうえ、掲載開始をご連絡します。</p>
        ) : (
          <form action="/api/partner/apply" method="post" className="mt-6 space-y-4">
            <Field label="医院名" name="clinic_name" required />
            <Field label="相談の通知先メールアドレス" name="contact_email" type="email" required />
            <Field label="公式サイトURL" name="website_url" type="url" />
            <label className="block">
              <span className="mb-1 block text-sm font-bold">オンライン相談を担当する先生<span className="text-red-500"> *</span></span>
              <textarea name="doctors" rows={4} required placeholder={"例：山田 花子（矯正担当・日本矯正歯科学会 認定医・経験12年・火木土）"} className="w-full rounded-lg border border-gray-300 px-3 py-2" />
            </label>
            <button className="w-full rounded-xl bg-[#0B6E63] py-4 font-bold text-white hover:bg-[#08534B]">申し込む（費用は相談が届いてから）</button>
          </form>
        )}
      </section>

      <h2 className="text-2xl font-bold">おすすめ枠（月額掲載）のご案内</h2>
      <ul className="mt-4 list-disc space-y-1 pl-5 text-gray-700">
        <li>サイトトップの「おすすめ枠」に医院を掲載します（「PR」表記あり）</li>
        <li>決済完了後すぐに自動で掲載が始まります</li>
        <li>{price}・いつでも解約可能。解約すると次回更新日に掲載が終わります</li>
      </ul>
      <p className="mt-3 text-xs text-gray-500">
        ※診断結果の順位は掲載の有無に関係なく、予算・エリア・ご希望との一致度だけで決まります。掲載内容は医療広告ガイドラインに沿って当サイトで確認し、不適切な場合は掲載をお断りすることがあります。
      </p>

      <form action="/api/sponsor/apply" method="post" className="mt-8 space-y-4">
        <Field label="医院名" name="clinic_name" required />
        <Field label="ご担当者メールアドレス" name="contact_email" type="email" required />
        <Field label="公式サイトURL" name="website_url" type="url" />
        <label className="block">
          <span className="mb-1 block text-sm font-bold">都道府県</span>
          <select name="prefecture" className="w-full rounded-lg border border-gray-300 px-3 py-2">
            {PREFECTURES.map((p) => <option key={p}>{p}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-bold">掲載したい内容・ご要望（任意）</span>
          <textarea name="message" rows={3} className="w-full rounded-lg border border-gray-300 px-3 py-2" />
        </label>
        <button className="w-full rounded-xl bg-sky-600 py-4 font-bold text-white hover:bg-sky-700">決済ページへ進む（Stripe）</button>
      </form>
    </main>
  );
}

function Field({ label, name, type = "text", required }: { label: string; name: string; type?: string; required?: boolean }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-bold">{label}{required && <span className="text-red-500"> *</span>}</span>
      <input name={name} type={type} required={required} className="w-full rounded-lg border border-gray-300 px-3 py-2" />
    </label>
  );
}
