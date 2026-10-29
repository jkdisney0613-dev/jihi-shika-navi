import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/cron-auth";
import { SITE_LAUNCHED } from "@/lib/demo";

// AI 検索のクローラーも明示的に許可する（GEO 対策）
export default function robots(): MetadataRoute.Robots {
  // 一般公開前はすべてのクローラーを止める（URL を知っている人だけが見られる状態）
  if (!SITE_LAUNCHED) return { rules: [{ userAgent: "*", disallow: "/" }] };
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/api/"] },
      { userAgent: ["GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-SearchBot", "Claude-User", "PerplexityBot", "Google-Extended"], allow: "/" },
    ],
    sitemap: siteUrl("/sitemap.xml"),
  };
}
