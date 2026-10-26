import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { DEMO_MODE, SITE_LAUNCHED } from "@/lib/demo";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: "自費歯科ナビ",
  description: "ホワイトニング・矯正・インプラントの費用の目安を比べて、条件に合う歯科医院を探す",
  // 一般公開（NEXT_PUBLIC_SITE_LAUNCHED=true）までは検索結果に出さない
  ...(SITE_LAUNCHED ? {} : { robots: { index: false, follow: false } }),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="bg-white text-gray-900 antialiased">
        {DEMO_MODE && (
          <p className="bg-amber-50 px-4 py-2 text-center text-xs text-amber-900">
            テスト公開中です。掲載している医院・先生はサンプル（架空）です。
          </p>
        )}
        {children}
        <Analytics />
      </body>
    </html>
  );
}
