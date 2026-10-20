import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PRICE_DISCLAIMER } from "@/lib/compliance";
import { getPublishedClinics } from "@/lib/data";
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

const optionLabel = (code: string) => Object.values(OPTIONS).flat().find((o) => o.value === code)?.label ?? code;

export default async function ClinicPage({ params }: Props) {
  const c = await find((await params).slug);
  if (!c) notFound();
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
      <h1 className="text-2xl font-bold">{c.name}</h1>
      <p className="mt-1 text-sm text-gray-500">{c.prefecture}{c.city}・{c.nearest_station} 徒歩{c.walk_minutes}分</p>
      <p className="mt-4 text-gray-700">{c.catch_copy}</p>
      <h2 className="mt-8 mb-3 text-lg font-bold">自費メニューと費用の目安</h2>
      <table className="w-full text-sm">
        <tbody>
          {c.treatments.map((t) => (
            <tr key={t.option_code} className="border-b">
              <td className="py-2">{optionLabel(t.option_code)}</td>
              <td>{formatPrice(t.price_min)}〜{formatPrice(t.price_max)}</td>
              <td className="text-gray-500">{t.duration_label}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-4 text-xs text-gray-500">{PRICE_DISCLAIMER}</p>
      <Link href={`/consult?clinic=${c.slug}`} className="mt-8 block rounded-xl bg-[#0B6E63] py-4 text-center font-bold text-white hover:bg-[#08534B]">行く前に先生へオンライン相談（無料）</Link>
      <Link href="/diagnosis" className="mt-3 block rounded-xl bg-sky-600 py-4 text-center font-bold text-white hover:bg-sky-700">ほかの医院とも比べて診断する</Link>
    </main>
  );
}
