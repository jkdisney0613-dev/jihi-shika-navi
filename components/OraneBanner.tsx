// 口臭セルフチェック「Orane（オライン）」への誘導バナー（キャラクター：ぷーくん）
// placement はどこに置いたバナーから来たかを Orane 側の流入経路で見分けるための値（utm_content）
import { ArrowRight } from "@/components/LineIcons";

const ORANE_URL = "https://oralcare-platform.pages.dev/";

export default function OraneBanner({ placement }: { placement: string }) {
  const href = `${ORANE_URL}?utm_source=jihi-shika-navi&utm_medium=banner&utm_content=${encodeURIComponent(placement)}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener"
      className="group flex items-center gap-4 rounded-3xl border border-[#F1DCC4] bg-gradient-to-r from-[#FFF4E6] to-[#FDF9F1] py-3 pl-3 pr-5 no-underline transition hover:from-[#FFEBD6] hover:to-[#FBF3E6]"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/puukun/happy.webp" alt="ぷーくん" width={143} height={192} loading="lazy" className="h-20 w-auto flex-none" />
      <span className="min-w-0 flex-1">
        <span className="inline-block rounded-full bg-[#B9542A] px-3 py-0.5 text-xs font-bold text-white">口臭セルフチェック</span>
        <span className="mt-1 block text-lg font-bold leading-snug text-[#7A3F16]">息のにおい、<br className="sm:hidden" />気になっていませんか？</span>
        <span className="block text-sm leading-relaxed text-[#5A4A3C]">
          舌の写真から口臭リスクを約30秒でチェックできる「Orane（オライン）」へ
        </span>
      </span>
      <ArrowRight className="h-6 w-6 flex-none text-[#B9542A] transition group-hover:translate-x-0.5" />
    </a>
  );
}
