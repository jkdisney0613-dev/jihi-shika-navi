// みんなの記録・質問ひろば共通の上部（サイト名・タブ・ビーバーのひとこと）
import Link from "next/link";

const TABS = [
  { href: "/community", label: "みんなの記録", key: "records" },
  { href: "/community/questions", label: "質問ひろば", key: "questions" },
] as const;

export default function CommunityHeader({ active, beaver, say }: { active: "records" | "questions"; beaver: string; say: React.ReactNode }) {
  return (
    <>
      <header className="border-b border-[#EADFCF] bg-white px-4 py-3">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Link href="/" className="text-lg font-bold text-[#3F6E1E]">自費歯科ナビ</Link>
          <Link href="/diagnosis" className="text-xs font-bold text-[#6E5F4E] underline-offset-2 hover:underline">医院をさがす</Link>
        </div>
      </header>
      <div className="mx-auto max-w-3xl px-4">
        <nav className="mt-3 flex gap-2" aria-label="コミュニティ">
          {TABS.map((t) => (
            <Link
              key={t.key}
              href={t.href}
              aria-current={active === t.key ? "page" : undefined}
              className={`rounded-full border-2 px-4 py-1.5 text-sm font-bold ${
                active === t.key ? "border-[#3F6E1E] bg-[#3F6E1E] text-white" : "border-[#E2D6C2] bg-white text-[#6E5F4E] hover:border-[#7AB648]"
              }`}
            >
              {t.label}
            </Link>
          ))}
        </nav>
        <div className="mt-4 flex items-end gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/beaver/${beaver}.png`} alt="" width={84} height={84} className="h-20 w-auto flex-none" />
          <p className="rounded-2xl border-2 border-[#2B2118] bg-white px-3 py-2 text-sm font-bold leading-relaxed">{say}</p>
        </div>
      </div>
    </>
  );
}
