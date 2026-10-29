// トップ：はじめての方に「できること3つ」を見せてから、探す画面（/start）へ進んでもらう
import Link from "next/link";
import { ArrowRight } from "@/components/LineIcons";
import { CATEGORIES } from "@/lib/options";

export const revalidate = 3600;

// はじめての方へ：このサイトでできること3つ
const MERITS = [
  { tag: "無料で比較", title: <>医院の料金を<br />一度に比べられる</>, text: "医院のホワイトニング・矯正の料金を、公式サイトで確認したうえで並べています。「検査料は別」などの注意書きと出典のリンクもあるので、1軒ずつサイトを回らなくて済みます。" },
  { tag: "リアルな支払いがわかる", title: <>「実際いくら払ったか」<br />がわかる</>, text: "公式サイトの価格と、やってみた人が払った総額（調整料や保定装置も含む）を並べて見られます。「思ったより高かった」を事前に防げます。" },
  { tag: "専門家に相談できる", title: <>歯科衛生士に<br />無料で質問できる</>, text: "お手入れや費用の不安を、医院名を出さずに匿名で聞けます。歯科衛生士（専門家）が答えます。" },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#F9F8F2] text-[#23301F]">
      <header className="border-b border-[#E4E8DC] bg-white px-4 py-3">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <div>
            <p className="text-lg font-bold text-[#2F6B3A]">自費歯科ナビ</p>
            <p className="text-xs text-[#7A8473]">{CATEGORIES.map((c) => c.label).join("・")}の費用を比べる</p>
          </div>
          <Link href="/start" className="rounded-full bg-[#2F6B3A] px-4 py-2 text-sm font-bold text-white hover:bg-[#275A31]">さっそく探す</Link>
        </div>
      </header>
      <section className="px-4 py-10">
      <div className="mx-auto max-w-3xl">
        <p className="text-center text-sm font-bold text-[#4E8B3A]">＼ こんなことで悩んでいませんか？ ／</p>
        <h1 className="mt-2 text-center text-xl font-bold leading-snug sm:text-2xl">歯科の自費治療は、<br className="sm:hidden" />もっとわかりやすくできるはずです。</h1>
        <p className="mt-3 text-center text-sm leading-relaxed text-[#5E6A58]">歯科医院の料金・実際の支払い額・歯科衛生士への相談を<br className="hidden sm:block" />まとめて確認できるサービスです。</p>
        <ol className="mt-8 space-y-10">
          {MERITS.map((m, i) => (
            <li key={m.tag} className="grid items-center gap-4 sm:grid-cols-[1fr_1.1fr] sm:gap-8">
              <div className="relative">
                <span className="absolute -top-2 left-0 z-10 text-5xl font-extrabold text-[#3F7F45]">{String(i + 1).padStart(2, "0")}</span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/lp/merit-${i + 1}.webp`} alt="" width={440} height={340} loading="lazy" className="mx-auto w-full max-w-[270px] sm:max-w-[340px]" />
              </div>
              <div>
                <span className="inline-block rounded-full bg-[#E3F0DA] px-3 py-1 text-xs font-bold text-[#2F6B3A]">{m.tag}</span>
                <h2 className="mt-2 text-2xl font-bold leading-snug text-[#1F3A26]">{m.title}</h2>
                <p className="mt-3 text-[15px] leading-relaxed text-[#4F5B4A]">{m.text}</p>
              </div>
            </li>
          ))}
        </ol>
        <Link href="/start" className="mt-10 flex items-center gap-4 rounded-3xl border sm:rounded-full border-[#DCE8D2] bg-[#EAF3E3] py-3 pl-4 pr-6 transition hover:bg-[#E0EED6]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/beaver/hi.png" alt="ビーバー" width={64} height={66} className="h-16 w-auto flex-none" />
          <span className="min-w-0 flex-1 border-l border-[#C9DDBC] pl-4">
            <span className="inline-block rounded-full bg-[#2F5B3A] px-3 py-0.5 text-xs font-bold text-white">ひとことで言うなら</span>
            <span className="mt-1 block text-xl font-bold text-[#2F6B3A]">無料・登録不要。</span>
            <span className="block text-sm text-[#3F4A3A]">自費の歯科治療を、払う前に比べて、聞ける場所です。</span>
          </span>
          <ArrowRight className="h-6 w-6 flex-none text-[#2F6B3A]" />
        </Link>
        <Link href="/start" className="mx-auto mt-6 flex w-full max-w-sm items-center justify-center gap-2 rounded-full bg-[#2F6B3A] py-4 text-lg font-bold text-white shadow-[0_4px_0_#1F4A27] transition hover:bg-[#275A31]">
          料金と医院をくらべてみる
          <ArrowRight className="h-5 w-5" />
        </Link>
        <p className="mt-2 text-center text-xs text-[#7A8473]">無料・登録不要。ホワイトニングか矯正を選ぶだけです。</p>
      </div>
      </section>
      <footer className="px-4 pb-10 text-center text-xs text-[#7A8473]">
        <Link href="/for-clinics" className="hover:underline">歯科医院の方へ：掲載情報の修正・掲載停止のご依頼</Link>
      </footer>
    </main>
  );
}

