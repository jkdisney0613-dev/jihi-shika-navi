// 記事本文（AI が外部の文章をもとに書く Markdown）を安全な HTML にする。
// marked は生の HTML をそのまま通すため、HTML は文字として表示し、リンク・画像は安全な URL だけ残す。
import { Marked } from "marked";

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

// http(s)・mailto・サイト内（/ や #）だけ許可。javascript: や data: は落とす
const isSafeUrl = (href: string) => /^(https?:|mailto:|\/(?!\/)|#)/i.test(href.trim());

const md = new Marked({
  renderer: {
    html({ text }) {
      return escapeHtml(text);
    },
    link({ href, title, tokens }) {
      const label = this.parser.parseInline(tokens);
      if (!isSafeUrl(href)) return label;
      const external = /^https?:/i.test(href);
      return `<a href="${escapeHtml(href)}"${title ? ` title="${escapeHtml(title)}"` : ""}${external ? ' rel="noopener noreferrer nofollow" target="_blank"' : ""}>${label}</a>`;
    },
    image({ href, title, text }) {
      if (!isSafeUrl(href)) return escapeHtml(text);
      return `<img src="${escapeHtml(href)}" alt="${escapeHtml(text)}"${title ? ` title="${escapeHtml(title)}"` : ""} loading="lazy">`;
    },
  },
});

export const markdownToSafeHtml = async (src: string) => md.parse(src);

// <script type="application/ld+json"> に埋める JSON。文字列中の </script> でタグを抜けられないよう < > & をエスケープする
export const jsonLdString = (data: unknown) =>
  JSON.stringify(data).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026");
