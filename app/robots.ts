import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/cron-auth";

// AI 検索のクローラーも明示的に許可する（GEO 対策）
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/api/"] },
      { userAgent: ["GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-SearchBot", "Claude-User", "PerplexityBot", "Google-Extended"], allow: "/" },
    ],
    sitemap: siteUrl("/sitemap.xml"),
  };
}
