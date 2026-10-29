// トップ画面の線画アイコン（緑の線・丸い背景に置いて使う）
type P = { className?: string };
const base = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

export const ToothIcon = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden {...base}>
    <path d="M7.5 3.5c-2.4 0-4 1.9-4 4.6 0 2 .8 3.4 1.4 5 .6 1.7.8 3.6 1.3 5.3.3 1.1.8 2.1 1.6 2.1 1.2 0 1.3-1.9 1.6-3.4.3-1.4.8-2.6 2.6-2.6s2.3 1.2 2.6 2.6c.3 1.5.4 3.4 1.6 3.4.8 0 1.3-1 1.6-2.1.5-1.7.7-3.6 1.3-5.3.6-1.6 1.4-3 1.4-5 0-2.7-1.6-4.6-4-4.6-1.8 0-2.6 1-4.5 1s-2.7-1-4.5-1Z" />
    <path d="M15.5 7.2c.9.2 1.5.9 1.6 1.8" />
  </svg>
);

export const BracesIcon = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden {...base}>
    <rect x="2.5" y="7" width="19" height="10" rx="5" />
    <path d="M7 7v10M12 7v10M17 7v10" />
    <path d="M2.5 12h19" />
    <rect x="5.6" y="10.6" width="2.8" height="2.8" rx=".6" />
    <rect x="10.6" y="10.6" width="2.8" height="2.8" rx=".6" />
    <rect x="15.6" y="10.6" width="2.8" height="2.8" rx=".6" />
  </svg>
);

export const TrainIcon = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden {...base}>
    <rect x="5" y="3" width="14" height="14" rx="3" />
    <path d="M5 10h14M9 6.5h6" />
    <circle cx="8.5" cy="13.5" r=".8" fill="currentColor" />
    <circle cx="15.5" cy="13.5" r=".8" fill="currentColor" />
    <path d="m8 21 2-4M16 21l-2-4" />
  </svg>
);

export const ChatIcon = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden {...base}>
    <path d="M4 5.5h11a2 2 0 0 1 2 2V13a2 2 0 0 1-2 2H9l-3.5 3v-3H4a2 2 0 0 1-2-2V7.5a2 2 0 0 1 2-2Z" />
    <path d="M19 9h1a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-1v2.5L16 18h-3" />
    <path d="M6 10.2h7" />
  </svg>
);

export const AskIcon = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden {...base}>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5 1.5 0 2.8.4 3.9 1.1" />
    <circle cx="17.5" cy="15.5" r="4.5" />
    <path d="M16.2 14.3a1.4 1.4 0 1 1 1.9 1.3c-.4.2-.6.5-.6.9v.3" />
    <circle cx="17.5" cy="18.4" r=".5" fill="currentColor" />
  </svg>
);

export const Chevron = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden {...base} strokeWidth={2.2}>
    <path d="m9 5 7 7-7 7" />
  </svg>
);

export const ArrowRight = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden {...base} strokeWidth={2}>
    <path d="M4 12h15M13 6l6 6-6 6" />
  </svg>
);
