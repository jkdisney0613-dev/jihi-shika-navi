// 医療広告ガイドライン・景品表示法で問題になりやすい表現の機械チェック
// 引っかかった記事は自動公開せず下書きに残す（最終判断は人が行う）

const RULES: { pattern: RegExp; reason: string }[] = [
  { pattern: /絶対|必ず(治|白く|成功)|100%|完全に治/, reason: "効果を保証する表現（虚偽・誇大広告）" },
  { pattern: /(日本|業界|地域)?(No\.?1|ナンバーワン|一番|最高|最良|最先端|最新式)/i, reason: "比較優良・最上級表現" },
  { pattern: /最安|格安|激安|今だけ|期間限定.*(割引|円)/, reason: "費用を強調して誘引する表現" },
  { pattern: /痛くない|痛みゼロ|副作用(は|が)?(ない|なし)/, reason: "リスクを否定する表現" },
  { pattern: /ビフォー.?アフター|症例写真/, reason: "治療前後の写真は詳細な説明の併記が必要" },
  { pattern: /芸能人|有名人|モデルも通う/, reason: "著名人との関連を強調する表現" },
];

export function checkCompliance(text: string): string[] {
  const issues: string[] = [];
  for (const { pattern, reason } of RULES) {
    const m = text.match(pattern);
    if (m) issues.push(`${reason}：「${m[0]}」`);
  }
  return issues;
}

/** 自費診療の費用を載せるときに必ず付ける注記 */
export const PRICE_DISCLAIMER =
  "※費用は自費診療（公的医療保険適用外）の目安です。治療内容・期間・リスクや副作用は医院により異なるため、必ずカウンセリングで説明を受けてください。";
