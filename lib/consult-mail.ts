// オンライン相談のメール（医院への通知・患者さんへの受付と返信の連絡）
import { createHash, randomBytes } from "node:crypto";
import { CONCERNS, type Concern } from "./consult";
import { OPTIONS, formatPrice } from "./options";
import type { TreatmentOption } from "./types";

export const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export function newReplyToken() {
  const token = randomBytes(24).toString("base64url");
  return { token, hash: hashToken(token) };
}
export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

/** 返信リンクの有効期間 */
export const REPLY_TTL_DAYS = 30;

export const concernLabel = (c: string) => CONCERNS.find((x) => x.value === c)?.label ?? c;
export const optionLabel = (o: string) =>
  Object.values(OPTIONS).flat().find((x) => x.value === (o as TreatmentOption))?.label ?? o;

export const range = (min: number | null, max: number | null) =>
  min != null && max != null ? `${formatPrice(min)}〜${formatPrice(max)}` : "—";

export function clinicNoticeHtml(p: {
  clinicName: string;
  doctorName: string | null;
  patientName: string;
  ageRange: string | null;
  concern: Concern;
  option: string;
  budgetMax: number | null;
  wishes: string[];
  note: string | null;
  photoUrls: string[];
  replyUrl: string;
}) {
  const rows: [string, string][] = [
    ["ご指名の担当医", p.doctorName ?? "指定なし"],
    ["お名前", p.patientName],
    ["年代", p.ageRange ?? "未回答"],
    ["歯並び・お悩み", concernLabel(p.concern)],
    ["希望の治療", optionLabel(p.option)],
    ["ご予算", p.budgetMax ? `${formatPrice(p.budgetMax)}まで` : "未定"],
    ["重視すること", p.wishes.join("、") || "—"],
    ["ご相談内容", p.note ?? "—"],
  ];
  const photos = p.photoUrls.length
    ? p.photoUrls.map((u, i) => `<a href="${u}">写真${i + 1}</a>`).join("　") + "<br/><small>写真のリンクは7日間有効です。</small>"
    : "なし";
  return `<p>${esc(p.clinicName)} ご担当者様</p>
<p>自費歯科ナビ経由で、オンライン相談が届きました。下のボタンから<strong>概算費用と担当医からのひとこと</strong>をご返信ください。患者さまのメールアドレスは、ご返信後に患者さまがご予約される際に共有されます。</p>
<table style="border-collapse:collapse;font-size:14px">${rows
    .map(([k, v]) => `<tr><th style="text-align:left;padding:4px 12px 4px 0;color:#4b5563;vertical-align:top">${k}</th><td style="padding:4px 0">${esc(v)}</td></tr>`)
    .join("")}<tr><th style="text-align:left;padding:4px 12px 4px 0;color:#4b5563">写真</th><td>${photos}</td></tr></table>
<p style="margin:24px 0"><a href="${p.replyUrl}" style="background:#0B6E63;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:bold">概算を返信する</a></p>
<p style="font-size:12px;color:#6b7280">レントゲン・口腔内を拝見していない段階のため、ご返信は「目安」としてお伝えください（確定的な診断や治療効果の保証は避けてください）。返信リンクは${REPLY_TTL_DAYS}日間有効です。</p>`;
}

export function patientReceiptHtml(p: { name: string; clinics: { name: string; doctor: string | null }[]; estimate: string }) {
  return `<p>${esc(p.name)} 様</p>
<p>オンライン相談を受け付けました。下の医院から、概算費用と担当医のひとことがこのメールアドレスに届きます。</p>
<ul>${p.clinics.map((c) => `<li>${esc(c.name)}${c.doctor ? `（${esc(c.doctor)} 先生）` : ""}</li>`).join("")}</ul>
<p>当サイトで出した費用の目安：${esc(p.estimate)}</p>
<p style="font-size:12px;color:#6b7280">自費診療のため保険は使えません。ここでの金額は目安で、正式な治療方針と費用は来院時の検査で決まります。</p>`;
}

export function patientReplyHtml(p: {
  name: string;
  clinicName: string;
  doctorName: string | null;
  min: number;
  max: number;
  plan: string | null;
  message: string | null;
  bookingUrl: string;
}) {
  return `<p>${esc(p.name)} 様</p>
<p><strong>${esc(p.clinicName)}</strong>${p.doctorName ? `の${esc(p.doctorName)} 先生` : ""}から、オンライン相談への返信が届きました。</p>
<table style="border-collapse:collapse;font-size:14px">
<tr><th style="text-align:left;padding:4px 12px 4px 0;color:#4b5563">概算（総額の目安）</th><td style="font-weight:bold;color:#B54708">${esc(range(p.min, p.max))}</td></tr>
${p.plan ? `<tr><th style="text-align:left;padding:4px 12px 4px 0;color:#4b5563">考えられる治療</th><td>${esc(p.plan)}</td></tr>` : ""}
</table>
${p.message ? `<p style="white-space:pre-wrap;background:#f6f7f9;padding:12px;border-radius:10px">${esc(p.message)}</p>` : ""}
<p style="margin:24px 0"><a href="${p.bookingUrl}" style="background:#0B6E63;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:bold">この先生のカウンセリングを予約する</a></p>
<p style="font-size:12px;color:#6b7280">レントゲンや口腔内を見ていない段階の目安です。正式な費用は来院時の検査で決まります。</p>`;
}
