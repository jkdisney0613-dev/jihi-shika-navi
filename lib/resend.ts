// Resend によるメール送信（メルマガ・確認メール・掲載通知で共用）
import { Resend } from "resend";

let resend: Resend | null = null;
export function getResend(): Resend {
  resend ??= new Resend(process.env.RESEND_API_KEY);
  return resend;
}

export const FROM = process.env.MAIL_FROM ?? "自費歯科ナビ <news@example.com>";

/** 特定電子メール法で必要な送信者情報と配信停止リンクをフッターに付ける */
export function mailFooter(unsubscribeUrl: string): string {
  const sender = process.env.MAIL_SENDER_INFO ?? "運営：自費歯科ナビ（所在地・連絡先をここに記載）";
  return `<hr style="margin:32px 0;border:none;border-top:1px solid #e5e7eb"/>
<p style="font-size:12px;color:#6b7280;line-height:1.6">${sender}<br/>
配信停止は<a href="${unsubscribeUrl}">こちら</a>からワンクリックで行えます。</p>`;
}
