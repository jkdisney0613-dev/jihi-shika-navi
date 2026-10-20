import type { Metadata } from "next";
import Link from "next/link";
import { getPublishedArticles } from "@/lib/data";

export const revalidate = 3600;
export const metadata: Metadata = {
  title: "自費歯科治療の選び方ガイド",
  description: "ホワイトニング・矯正・インプラント・自費クリーニングの費用相場と医院の選び方を解説します。",
  alternates: { canonical: "/articles" },
};

export default async function ArticlesPage() {
  const articles = await getPublishedArticles();
  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-bold">自費歯科治療の選び方ガイド</h1>
      {articles.length === 0 && <p className="text-gray-500">記事は準備中です。</p>}
      <ul className="space-y-4">
        {articles.map((a) => (
          <li key={a.slug}>
            <Link href={`/articles/${a.slug}`} className="block rounded-xl border p-4 hover:border-sky-400">
              <span className="block font-bold">{a.title}</span>
              <span className="block text-sm text-gray-600">{a.description}</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
