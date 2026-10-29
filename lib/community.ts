// みんなの記録（体験記録）と質問ひろばのデータ・選択肢・投稿チェック
// 医院名は出さない・医院ページとはつなげない・医院の順位に使わない（医療広告とみなされないため）
import { createHash } from "node:crypto";
import { askJson } from "./claude";
import { checkCompliance } from "./compliance";
import { MIN_RECORDS_FOR_STATS, type Answer, type Experience, type Question } from "./community-options";
import { DEMO_MODE } from "./demo";
import { getSupabaseAdmin } from "./supabase";

export * from "./community-options";

/** DB が使えるか。テスト公開中で DB がなければ見本の投稿を出す */
export const communityDb = () => getSupabaseAdmin();
export const COMMUNITY_READY = () => communityDb() !== null;

const count = (rel: unknown) => (Array.isArray(rel) && rel[0] && typeof rel[0].count === "number" ? rel[0].count : 0);

export async function getExperiences(option?: string | null, limit = 50): Promise<Experience[]> {
  const db = communityDb();
  if (!db) return DEMO_MODE ? SAMPLE_EXPERIENCES.filter((e) => !option || e.option_code === option) : [];
  let q = db
    .from("community_experiences")
    .select("id, option_code, total_paid, months, pain, satisfaction, choose_again, age_band, good, regret, created_at, community_reactions(count)")
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (option) q = q.eq("option_code", option);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map(({ community_reactions, ...e }) => ({ ...e, helpful: count(community_reactions) }) as Experience);
}

/** 治療ごとの「みんなが払った総額」。記録が少ないうちは出さない */
export async function getPaidStats(): Promise<Map<string, { n: number; median: number; p25: number; p75: number }>> {
  const db = communityDb();
  let rows: { option_code: string; total_paid: number }[];
  if (!db) rows = DEMO_MODE ? SAMPLE_EXPERIENCES : [];
  else {
    const { data, error } = await db.from("community_experiences").select("option_code, total_paid").eq("status", "published").limit(5000);
    if (error) throw error;
    rows = data ?? [];
  }
  const by = new Map<string, number[]>();
  for (const r of rows) by.set(r.option_code, [...(by.get(r.option_code) ?? []), r.total_paid]);
  // 線形補間の分位数（1万円単位に丸める）
  const at = (xs: number[], p: number) => {
    const i = (xs.length - 1) * p, lo = Math.floor(i), hi = Math.ceil(i);
    return Math.round((xs[lo] + (xs[hi] - xs[lo]) * (i - lo)) / 1000) * 1000;
  };
  const out = new Map<string, { n: number; median: number; p25: number; p75: number }>();
  for (const [code, xs] of by) {
    if (xs.length < MIN_RECORDS_FOR_STATS) continue;
    xs.sort((a, b) => a - b);
    out.set(code, { n: xs.length, median: at(xs, 0.5), p25: at(xs, 0.25), p75: at(xs, 0.75) });
  }
  return out;
}

const QUESTION_FIELDS = "id, topic, option_code, title, body, created_at, community_reactions(count)";
const ANSWER_FIELDS = "id, question_id, is_expert, expert_role, author_label, body, created_at, community_reactions(count)";

function toAnswer({ community_reactions, ...a }: Record<string, unknown>): Answer {
  return { ...a, helpful: count(community_reactions) } as unknown as Answer;
}

export async function getQuestions(opts: { topic?: string | null; expertOnly?: boolean; limit?: number } = {}): Promise<Question[]> {
  const db = communityDb();
  if (!db) {
    if (!DEMO_MODE) return [];
    return SAMPLE_QUESTIONS.filter((q) => (!opts.topic || q.topic === opts.topic) && (!opts.expertOnly || q.answers.some((a) => a.is_expert)));
  }
  let q = db.from("community_questions").select(QUESTION_FIELDS).eq("status", "published").order("created_at", { ascending: false }).limit(opts.limit ?? 50);
  if (opts.topic) q = q.eq("topic", opts.topic);
  const { data, error } = await q;
  if (error) throw error;
  const ids = (data ?? []).map((x) => x.id);
  const { data: answers } = ids.length
    ? await db.from("community_answers").select(ANSWER_FIELDS).in("question_id", ids).eq("status", "published").order("is_expert", { ascending: false }).order("created_at")
    : { data: [] };
  const list = (data ?? []).map(({ community_reactions, ...x }) => ({
    ...x,
    same: count(community_reactions),
    answers: (answers ?? []).filter((a) => a.question_id === x.id).map(toAnswer),
  })) as Question[];
  return opts.expertOnly ? list.filter((x) => x.answers.some((a) => a.is_expert)) : list;
}

export async function getQuestion(id: string): Promise<Question | null> {
  const db = communityDb();
  if (!db) return DEMO_MODE ? (SAMPLE_QUESTIONS.find((q) => q.id === id) ?? null) : null;
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const { data } = await db.from("community_questions").select(QUESTION_FIELDS).eq("id", id).eq("status", "published").maybeSingle();
  if (!data) return null;
  const { data: answers } = await db.from("community_answers").select(ANSWER_FIELDS).eq("question_id", id).eq("status", "published")
    .order("is_expert", { ascending: false }).order("created_at");
  const { community_reactions, ...q } = data;
  return { ...q, same: count(community_reactions), answers: (answers ?? []).map(toAnswer) } as Question;
}

// ---- 投稿のチェック ----

export const hashIp = (req: Request) => {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
  return createHash("sha256").update(`${process.env.IP_HASH_SALT ?? "jihi-shika-navi"}:${ip}`).digest("hex").slice(0, 32);
};

// 医院名・個人を特定できる情報らしきもの。見つかったら公開せず人が確認する
const LOCAL_RULES: { pattern: RegExp; reason: string }[] = [
  { pattern: /(院長|先生|ドクター|Dr\.?)\s*[\p{Script=Han}\p{Script=Katakana}]{1,4}|[\p{Script=Han}]{1,4}(先生|院長|医師)/u, reason: "医師名らしき語" },
  { pattern: /https?:\/\/|www\.|\.(com|jp|net)\b/i, reason: "URL" },
  { pattern: /0\d{1,4}-?\d{1,4}-?\d{3,4}|[\w.+-]+@[\w-]+\.[\w.]+/, reason: "電話番号・メールアドレス" },
  { pattern: /(LINE|インスタ|Instagram|DM)(で|へ|に).*(連絡|紹介|相談)/i, reason: "外部への誘導" },
  { pattern: /紹介(コード|クーポン)|割引コード|キャンペーン/, reason: "宣伝・紹介コード" },
];

// 「矯正歯科」「歯科医院」など、医院名ではないふつうの言い方
const GENERIC = /^(矯正|審美|小児|一般|口腔外科|大学|大学病院|総合|近所|地元|別|他|前|今|新しい|歯科|医療|美容|専門|かかりつけ)$/;
const clinicNameLike = (text: string) =>
  [...text.matchAll(/([\p{Script=Han}\p{Script=Katakana}A-Za-z0-9ー・]{2,})(歯科|デンタル|クリニック|医院)/gu)].some((m) => !GENERIC.test(m[1].replace(/(矯正|歯科)+$/, "") || "歯科"));

/** 公開してよいかを機械でチェックする。引っかかった理由の一覧を返す（空なら公開候補） */
export async function moderate(text: string): Promise<string[]> {
  const flags = [...(clinicNameLike(text) ? ["医院名らしき語"] : []), ...LOCAL_RULES.filter((r) => r.pattern.test(text)).map((r) => r.reason), ...checkCompliance(text)];
  if (flags.length > 0 || !text.trim()) return flags;
  if (!process.env.ANTHROPIC_API_KEY) return ["AIチェック未設定（人が確認）"];
  try {
    const r = await askJson<{ ok: boolean; reasons: string[] }>({
      system:
        "あなたは歯科の体験談・質問サイトの投稿審査担当です。患者どうしが匿名で体験や悩みを共有する場所です。" +
        "次のどれかに当たる投稿は ok=false にし、理由を短い日本語で reasons に入れてください：" +
        "医院名・医師名・医院を特定できる地名や特徴、個人を特定できる情報、医院や業者による宣伝・自作自演と思われる内容、" +
        "誤った医療情報で健康を害するおそれのある助言（自己判断で治療をやめる等）、誹謗中傷、性的・暴力的な内容、歯科と無関係な内容。" +
        "率直な不満や後悔、費用への感想は問題ありません。",
      prompt: `投稿：\n${text}`,
      schema: {
        type: "object",
        properties: { ok: { type: "boolean" }, reasons: { type: "array", items: { type: "string" } } },
        required: ["ok", "reasons"],
        additionalProperties: false,
      },
      effort: "low",
    });
    return r.ok ? [] : r.reasons.length ? r.reasons : ["AIチェックで保留"];
  } catch (e) {
    return [`AIチェック失敗：${(e as Error).message.slice(0, 80)}`];
  }
}

/** チェックを通った投稿を自動で公開するか（false なら全件、管理画面で確認してから公開） */
export const AUTO_PUBLISH = process.env.COMMUNITY_AUTO_PUBLISH !== "false";
export const statusFor = (flags: string[]) => (AUTO_PUBLISH && flags.length === 0 ? "published" : "pending");

/** 同じ人が24時間に投稿できる数 */
export async function tooMany(table: string, ipHash: string, limit = 5) {
  const db = communityDb();
  if (!db) return false;
  const { count: n } = await db.from(table).select("id", { count: "exact", head: true })
    .eq("ip_hash", ipHash).gte("created_at", new Date(Date.now() - 86_400_000).toISOString());
  return (n ?? 0) >= limit;
}

// ---- テスト公開中（DB なし）に出す見本 ----
const d = (daysAgo: number) => new Date(Date.UTC(2026, 9, 28) - daysAgo * 86_400_000).toISOString();
const SAMPLE_EXPERIENCES: Experience[] = [
  { id: "s1", option_code: "ortho_aligner", total_paid: 880_000, months: 18, pain: 2, satisfaction: 4, choose_again: "yes", age_band: "20代後半", good: "仕事中も目立たず、食事のときに外せるのが楽。", regret: "1日22時間つけるのがきつい。最初に知りたかった。", created_at: d(3), helpful: 32 },
  { id: "s2", option_code: "ortho_wire", total_paid: 740_000, months: 24, pain: 3, satisfaction: 5, choose_again: "yes", age_band: "30代", good: "歯並びがしっかり整った。", regret: "装置のまわりの歯みがきが大変。タフトブラシは早めに買うべき。", created_at: d(7), helpful: 18 },
  { id: "s3", option_code: "ortho_aligner", total_paid: 950_000, months: 24, pain: 2, satisfaction: 3, choose_again: "maybe", age_band: "30代", good: "見た目はほとんど気づかれない。", regret: "保定装置と調整料が別で、最初の見積もりより高くなった。", created_at: d(10), helpful: 27 },
  { id: "s4", option_code: "ortho_aligner", total_paid: 780_000, months: 12, pain: 1, satisfaction: 5, choose_again: "yes", age_band: "20代前半", good: "思っていたより痛くなかった。", regret: null, created_at: d(14), helpful: 9 },
  { id: "s5", option_code: "whitening_office", total_paid: 33_000, months: 0, pain: 2, satisfaction: 4, choose_again: "yes", age_band: "20代後半", good: "1回でも明るくなったのがわかった。", regret: "当日は少ししみた。", created_at: d(5), helpful: 14 },
];
const SAMPLE_QUESTIONS: Question[] = [
  {
    id: "q1", topic: "care", option_code: "ortho_wire", title: "ワイヤーのまわりがすぐ黄ばむ気がします。どうみがけばいい？", body: "表側のワイヤー矯正をして8か月です。", created_at: d(2), same: 23,
    answers: [
      { id: "a1", is_expert: true, expert_role: "dental_hygienist", author_label: "ちえみ", body: "装置の上と下に分けて、歯ブラシを45度に当てて小刻みに動かすのがコツです。すき間はタフトブラシで1本ずつ。気になる着色は、次の調整日に先生に相談してみてください。", created_at: d(1), helpful: 56 },
      { id: "a2", is_expert: false, expert_role: null, author_label: "やった人・30代", body: "フロスはスレッダーを使うと通しやすかったです。夜だけでもやると違いました。", created_at: d(1), helpful: 12 },
    ],
  },
  {
    id: "q2", topic: "cost", option_code: "ortho_aligner", title: "「総額いくら」と聞いたのに、あとから保定装置代が出てきた人いますか？", body: "", created_at: d(4), same: 18,
    answers: [{ id: "a3", is_expert: false, expert_role: null, author_label: "やった人・30代", body: "ありました。最初に「保定装置・調整料・検査料は込みか」を紙でもらうと安心です。", created_at: d(3), helpful: 31 }],
  },
];
