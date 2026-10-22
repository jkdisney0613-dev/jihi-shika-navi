import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PRICE_DISCLAIMER } from "@/lib/compliance";
import { getActiveSponsors, getPublishedClinics } from "@/lib/data";
import { OPTIONS, formatPrice } from "@/lib/options";

export const revalidate = 86400;

type Props = { params: Promise<{ slug: string }> };

async function find(slug: string) {
  return (await getPublishedClinics()).find((c) => c.slug === slug) ?? null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const c = await find((await params).slug);
  if (!c) return {};
  return {
    title: `${c.name}の自費診療メニューと費用｜${c.nearest_station}`,
    description: `${c.name}（${c.prefecture}${c.city}）のホワイトニング・矯正・インプラントなど自費メニューの費用目安と特徴。`,
    alternates: { canonical: `/clinics/${c.slug}` },
  };
}

const formatDate = (iso: string) => new Date(iso).toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo" });
const optionLabel = (code: string) => Object.values(OPTIONS).flat().find((o) => o.value === code)?.label ?? code;

export default async function ClinicPage({ params }: Props) {
  const c = await find((await params).slug);
  if (!c) notFound();
  const isSponsor = (await getActiveSponsors()).some((s) => s.clinic?.slug === c.slug);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Dentist",
    name: c.name,
    address: { "@type": "PostalAddress", addressRegion: c.prefecture, addressLocality: c.city, addressCountry: "JP" },
    ...(c.booking_url ? { url: c.booking_url } : {}),
  };
  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {isSponsor && (
        <p className="mb-2 inline-block rounded bg-gray-100 px-2 py-0.5 text-xs font-bold text-gray-600">PR：この医院からは広告掲載料をいただいています</p>
      )}
      <h1 className="text-2xl font-bold">{c.name}</h1>
      <p className="mt-1 text-sm text-gray-500">{c.prefecture}{c.city}・{c.nearest_station} 徒歩{c.walk_minutes}分</p>
      <p className="mt-4 text-gray-700">{c.catch_copy}</p>
      <h2 className="mt-8 mb-3 text-lg font-bold">自費メニューと費用の目安</h2>
      <table className="w-full text-sm">
        <tbody>
          {c.treatments.map((t) => (
            <tr key={t.option_code} className="border-b align-top">
              <td className="py-2">{optionLabel(t.option_code)}</td>
              <td className="py-2">
                {formatPrice(t.price_min)}〜{formatPrice(t.price_max)}
                {(t.source_url || t.updated_at) && (
                  <span className="block text-[11px] text-gray-400">
                    {t.updated_at && `${formatDate(t.updated_at)}時点`}
                    {t.source_url && <>・<a href={t.source_url} target="_blank" rel="noopener nofollow" className="underline">出典：医院公式サイト</a></>}
                  </span>
                )}
              </td>
              <td className="py-2 text-gray-500">{t.duration_label}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-4 text-xs text-gray-500">{PRICE_DISCLAIMER}</p>
      <p className="mt-2 text-xs text-gray-500">
        この医院の情報は、医院の公式サイトなどの公開情報をもとに当サイトが独自にまとめたものです。最新の内容は医院にご確認ください。
      </p>
      <Link href={`/consult?clinic=${c.slug}`} className="mt-8 block rounded-xl bg-[#0B6E63] py-4 text-center font-bold text-white hover:bg-[#08534B]">行く前に先生へオンライン相談（無料）</Link>
      <Link href="/diagnosis" className="mt-3 block rounded-xl bg-sky-600 py-4 text-center font-bold text-white hover:bg-sky-700">ほかの医院とも条件で比べる</Link>
      <p className="mt-8 text-center text-xs text-gray-500">
        この医院の関係者の方へ：<Link href={`/for-clinics/request?clinic=${c.slug}`} className="underline">情報の修正・掲載停止のご依頼はこちら</Link>
      </p>
    </main>
  );
}
