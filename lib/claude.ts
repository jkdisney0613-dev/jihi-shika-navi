// Claude API の呼び出しを1か所にまとめる（医院リサーチ・記事生成・メルマガ本文で共用）
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();
const MODEL = "claude-opus-5-5";

export class ClaudeRefusalError extends Error {}

/**
 * JSON スキーマどおりの出力を得る。web: true ならウェブ検索・取得ツールを使わせる。
 * 拒否された場合はサーバー側で自動的に別モデルに切り替える（fallbacks: "default"）。
 */
export async function askJson<T>(opts: {
  system: string;
  prompt: string;
  schema: Record<string, unknown>;
  web?: boolean;
  effort?: "low" | "medium" | "high";
}): Promise<T> {
  const messages: Anthropic.Beta.BetaMessageParam[] = [{ role: "user", content: opts.prompt }];
  const tools: Anthropic.Beta.BetaToolUnion[] = opts.web
    ? [
        { type: "web_search_20260209", name: "web_search", max_uses: 8, user_location: { type: "approximate", country: "JP" } },
        { type: "web_fetch_20260209", name: "web_fetch", max_uses: 8 },
      ]
    : [];

  // ウェブ検索の内部ループが上限に達すると pause_turn で返るので、そのまま続きを依頼する
  for (let i = 0; i < 5; i++) {
    const stream = client.beta.messages.stream({
      model: MODEL,
      max_tokens: 32000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: opts.system,
      messages,
      tools,
      output_config: {
        effort: opts.effort ?? "medium",
        format: { type: "json_schema", schema: opts.schema },
      },
    });
    const res = await stream.finalMessage();

    if (res.stop_reason === "pause_turn") {
      messages.push({ role: "assistant", content: res.content });
      continue;
    }
    if (res.stop_reason === "refusal") throw new ClaudeRefusalError(res.stop_details?.explanation ?? "refused");
    if (res.stop_reason === "max_tokens") throw new Error("Claude の出力が途中で切れました");

    const text = res.content
      .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");
    return JSON.parse(text) as T;
  }
  throw new Error("Claude の処理が規定回数内に終わりませんでした");
}
