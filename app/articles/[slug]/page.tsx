import { marked } from "marked";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getArticle } from "@/lib/data";
import { siteUrl } from "@/lib/cron-auth";

export const revalidate = 86400;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const a = await getArticle((await params).slug);
  if (!a) return {};
  return {
    title: a.title,
    description: a.description,
    alternates: { canonical: `/articles/${a.slug}` },
    openGraph: { title: a.title, description: a.description, type: "article", publishedTime: a.published_at, modifiedTime: a.updated_at },
  };
}

export default async function ArticlePage({ params }: Props) {
  const a = await getArticle((await params).slug);
  if (!a) notFound();

  // 構造化データ：記事 + FAQ（Google のリッチリザルトと AI 検索の引用元判定に効く）
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: a.title,
      description: a.description,
      datePublished: a.published_at,
      dateModified: a.updated_at,
      mainEntityOfPage: siteUrl(`/articles/${a.slug}`),
      author: { "@type": "Organization", name: "自費歯科ナビ編集部" },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: a.faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
    },
  ];

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <p className="text-sm text-gray-500">
        <Link href="/articles" className="hover:underline">記事一覧</Link>　更新日 {a.updated_at.slice(0, 10)}
      </p>
      <h1 className="mt-2 text-2xl font-bold text-gray-900">{a.title}</h1>
      <article className="prose prose-sky mt-6 max-w-none" dangerouslySetInnerHTML={{ __html: await marked.parse(a.body_md) }} />
      <section className="mt-10">
        <h2 className="mb-3 text-xl font-bold">よくある質問</h2>
        <dl className="space-y-4">
          {a.faq.map((f) => (
            <div key={f.q}>
              <dt className="font-bold">Q. {f.q}</dt>
              <dd className="mt-1 text-gray-700">A. {f.a}</dd>
            </div>
          ))}
        </dl>
      </section>
      <Link href="/diagnosis" className="mt-10 block rounded-xl bg-sky-600 py-4 text-center font-bold text-white hover:bg-sky-700">
        予算と希望から医院を診断する（無料）
      </Link>
    </main>
  );
}
