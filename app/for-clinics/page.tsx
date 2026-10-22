import type { Metadata } from "next";
import { PREFECTURES } from "@/lib/options";

export const metadata: Metadata = {
  title: "歯科医院様向け：PR枠・オンライン相談のご案内",
  description: "自費診療を検討している方に医院情報を届ける「PR枠（月額定額）」と、無料のオンライン相談受付のご案内です。",
  robots: { index: false },
};

export default async function ForClinicsPage({ searchParams }: { searchParams: Promise<{ applied?: string }> }) {
  const { applied } = await searchParams;
  const price = process.env.NEXT_PUBLIC_SPONSOR_PRICE_LABEL ?? "月額 30,000円（税込）";
  return (
    <main className="mx-auto max-w-xl px-4 py-10">
      <section className="mb-12 rounded-2xl border-2 border-[#0B6E63] p-5">
        <h1 className="text-2xl font-bold">オンライン相談の受付（無料）</h1>
        <ul className="mt-4 list-disc space-y-1 pl-5 text-gray-700">
          <li>比較中の患者さまが、来院前に先生を指名して概算を聞きに来ます（写真つきの相談もあります）</li>
          <li>メールのリンクから概算と担当医のひとことを返信するだけ。患者さまはそのまま予約ページへ進みます</li>
          <li>受付・相談とも費用はかかりません。相談件数や来院・成約に応じた料金もいただきません</li>
        </ul>
        <p className="mt-3 text-xs text-gray-500">
          ※相談先の表示順は最寄り駅からの近さで決め、料金や口コミ評価は使いません。担当医の資格表記は医療広告ガイドラインに沿って当サイトで確認します。
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
            <button className="w-full rounded-xl bg-[#0B6E63] py-4 font-bold text-white hover:bg-[#08534B]">申し込む（無料）</button>
          </form>
        )}
      </section>

      <h2 className="text-2xl font-bold">PR枠（月額定額の広告掲載）のご案内</h2>
      <ul className="mt-4 list-disc space-y-1 pl-5 text-gray-700">
        <li>サイトトップの「PR枠」に医院を掲載します（広告であることがわかるよう「PR」と表示します）</li>
        <li>決済完了後すぐに自動で掲載が始まります</li>
        <li>{price}の定額・いつでも解約可能。解約すると次回更新日に掲載が終わります</li>
        <li>相談件数・来院数・成約に応じた料金はいただきません</li>
      </ul>
      <p className="mt-3 text-xs text-gray-500">
        ※検索結果の順位は掲載の有無に関係なく、予算・エリア・ご希望との一致度だけで決まります。掲載内容は医療広告ガイドライン（限定解除要件を含む）に沿って当サイトで確認し、体験談・ビフォーアフター写真・「No.1」などの比較表現は掲載できません。不適切な場合は掲載をお断りすることがあります。
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
