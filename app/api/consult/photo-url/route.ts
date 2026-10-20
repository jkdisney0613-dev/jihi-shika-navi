// POST /api/consult/photo-url：相談に添える写真のアップロード先（期限つき）を発行する
// バケットは非公開。サイズと形式はバケット側の制限（5MB・画像のみ）でも弾く
import { NextResponse } from "next/server";
import { MAX_PHOTOS } from "@/lib/consult";
import { getSupabaseAdmin } from "@/lib/supabase";

const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/heic": "heic" };

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const types: unknown = body?.types;
  if (!Array.isArray(types) || types.length === 0 || types.length > MAX_PHOTOS || !types.every((t) => typeof t === "string" && t in EXT)) {
    return NextResponse.json({ error: `写真は${MAX_PHOTOS}枚まで、JPEG・PNG・WebP・HEICで送れます` }, { status: 400 });
  }
  const db = getSupabaseAdmin();
  if (!db) return NextResponse.json({ error: "いまは写真を受け付けていません" }, { status: 503 });

  const uploads = [];
  for (const type of types as string[]) {
    const path = `pending/${crypto.randomUUID()}.${EXT[type]}`;
    const { data, error } = await db.storage.from("consult-photos").createSignedUploadUrl(path);
    if (error) return NextResponse.json({ error: "アップロード先を用意できませんでした" }, { status: 500 });
    uploads.push({ path, url: data.signedUrl });
  }
  return NextResponse.json({ uploads });
}
