// 投稿ルール。医院名を出さない・宣伝をしない・診断はしない、の3つが柱
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "投稿ルール｜みんなの記録・質問ひろば", alternates: { canonical: "/community/rules" } };

const RULES: [string, string][] = [
  ["医院名・先生の名前は書かない", "このサイトの記録と質問は、医院をおすすめしたり評価したりする場所ではありません。医院名・先生の名前・医院がわかる住所や特徴は書かないでください。"],
  ["個人がわかる情報は書かない", "自分や他の人の名前、連絡先、SNSのアカウント、顔や口元の写真は受け付けていません。"],
  ["医院・業者の方の投稿は禁止", "医院や関係する業者の方が、患者のふりをして投稿することは禁止です（ステルスマーケティングにあたります）。宣伝・紹介コード・外部への誘導も公開しません。"],
  ["体験は正直に、決めつけない", "後悔や不満も大切な情報です。ただし、ほかの人を傷つける書き方や、効果を言い切る書き方は避けてください。"],
  ["専門家の回答は一般的な情報です", "歯科衛生士・歯科医師の回答は一般的な情報で、診断ではありません。治療方針は通っている歯科医院で相談してください。痛みや腫れが強いときは、すぐに歯科医院へ連絡してください。"],
  ["確認してから公開することがあります", "投稿はAIと運営で確認し、ルールに合わないものは公開しないか、あとから非公開にすることがあります。"],
];

export default function RulesPage() {
  return (
    <main className="min-h-screen bg-[#FBF7F0] px-4 py-10 text-[#2B2118]">
      <div className="mx-auto max-w-xl">
        <h1 className="text-2xl font-bold">投稿ルール</h1>
        <p className="mt-2 text-sm text-[#6E5F4E]">みんなが安心して使える場所にするための約束です。</p>
        <ol className="mt-6 space-y-4">
          {RULES.map(([h, b], i) => (
            <li key={h} className="rounded-2xl border-2 border-[#EADFCF] bg-white p-4">
              <h2 className="font-bold">{i + 1}. {h}</h2>
              <p className="mt-1 text-sm leading-relaxed text-[#4A3B2C]">{b}</p>
            </li>
          ))}
        </ol>
        <p className="mt-6 text-sm"><Link href="/community" className="font-bold text-[#3F6E1E]">← みんなの記録へ</Link></p>
      </div>
    </main>
  );
}
