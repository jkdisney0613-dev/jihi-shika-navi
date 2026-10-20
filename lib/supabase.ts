// サーバー専用の Supabase クライアント（API Route からだけ import する）
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

/** 環境変数が未設定なら null を返す（その場合はサンプルデータで動かす） */
export function getSupabaseAdmin(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  client ??= createClient(url, key, { auth: { persistSession: false } });
  return client;
}

/** 医院データを読むとき用。テスト公開中はサンプル医院だけを出すので null を返す */
export function getReadDb(): SupabaseClient | null {
  return process.env.NEXT_PUBLIC_DEMO_MODE === "true" ? null : getSupabaseAdmin();
}
