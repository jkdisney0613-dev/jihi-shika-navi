import type { Metadata } from "next";
import Link from "next/link";
import { getPublishedClinics } from "@/lib/data";

export const metadata: Metadata = {
  title: "医院情報の修正・掲載停止のご依頼",
  description: "当サイトに掲載している歯科医院の情報について、医院の方からの修正・掲載停止のご依頼を受け付けます。",
  robots: { index: false },
};

// 医院の許諾なく公開情報から掲載しているため、医院側がいつでも直せる・止められる窓口を用意する
export default async function ClinicRequestPage({ searchParams }: { searchParams: Promise<{ clinic?: string; sent?: string }> }) {
  const { clinic: slug, sent } = await searchParams;
  const clinic = slug ? (await getPublishedClinics()).find((c) => c.slug === slug) ?? null : null;
  return (
    <main className="mx-auto max-w-xl px-4 py-10">
      <h1 className="text-2xl font-bold">医院情報の修正・掲載停止のご依頼</h1>
      <p className="mt-3 text-sm leading-relaxed text-gray-700">
        当サイトの医院情報は、各医院の公式サイトなどの公開情報をもとに独自にまとめています。内容の誤りや、掲載を望まれない場合はこちらからご連絡ください。
        掲載停止のご依頼は受付と同時に非公開にし、修正のご依頼は3営業日以内に確認して反映します。費用は一切かかりません。
      </p>
      {sent ? (
        <p className="mt-6 rounded-xl bg-[#E7F4F2] p-4 font-bold text-[#0B5A51]">
          {sent === "remove" ? "ご依頼を受け付け、掲載を停止しました。" : "ご依頼を受け付けました。確認のうえ、ご連絡します。"}
        </p>
      ) : (
        <form action="/api/clinic-request" method="post" className="mt-6 space-y-4">
          <input type="hidden" name="clinic_slug" value={clinic?.slug ?? ""} />
          <label className="block">
            <span className="mb-1 block text-sm font-bold">医院名<span className="text-red-500"> *</span></span>
            <input name="clinic_name" required defaultValue={clinic?.name ?? ""} maxLength={100} className="w-full rounded-lg border border-gray-300 px-3 py-2" />
          </label>
          <fieldset>
            <legend className="mb-1 text-sm font-bold">ご依頼の内容<span className="text-red-500"> *</span></legend>
            <label className="mr-4 inline-flex items-center gap-2 text-sm">
              <input type="radio" name="kind" value="correct" defaultChecked className="accent-[#0B6E63]" />情報を修正してほしい
            </label>
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="radio" name="kind" value="remove" className="accent-[#0B6E63]" />掲載をやめてほしい
            </label>
          </fieldset>
          <label className="block">
            <span className="mb-1 block text-sm font-bold">ご担当者名・お立場<span className="text-red-500"> *</span></span>
            <input name="requester" required maxLength={100} placeholder="例：山田（院長）" className="w-full rounded-lg border border-gray-300 px-3 py-2" />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-bold">ご連絡先メールアドレス<span className="text-red-500"> *</span></span>
            <input name="contact_email" type="email" required maxLength={200} className="w-full rounded-lg border border-gray-300 px-3 py-2" />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-bold">修正内容・ご要望（任意）</span>
            <textarea name="message" rows={4} maxLength={2000} placeholder="例：マウスピース矯正の料金が改定されました（新料金：〇〇円）" className="w-full rounded-lg border border-gray-300 px-3 py-2" />
          </label>
          <button className="w-full rounded-xl bg-[#0B6E63] py-4 font-bold text-white hover:bg-[#08534B]">送信する</button>
        </form>
      )}
      {clinic && (
        <Link href={`/clinics/${clinic.slug}`} className="mt-6 block text-center text-sm text-sky-700 hover:underline">医院のページに戻る</Link>
      )}
    </main>
  );
}
