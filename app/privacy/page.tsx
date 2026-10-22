// プライバシーポリシー（ひな形）。公開前に運営者名・連絡先を入れ、専門家の確認を受けてください
import type { Metadata } from "next";

export const metadata: Metadata = { title: "プライバシーポリシー" };

const SECTIONS: [string, string][] = [
  ["取得する情報", "医院さがしフォーム・オンライン相談で入力された内容（お名前、メールアドレス、年代、歯並びのお悩み、ご予算、ご相談内容）と、任意で添付された口元の写真。歯の状態に関する情報は、個人情報保護法の要配慮個人情報にあたるため、取得前に同意をいただきます。"],
  ["利用目的", "条件に合う医院の表示、オンライン相談の医院への取り次ぎと返信のお届け、メールマガジンの配信（登録された方のみ）、サービス改善のための統計。"],
  ["医院への提供", "オンライン相談では、ご本人が選んだ医院（最大3院）に限り、同意をいただいたうえで入力内容と写真を提供します。メールアドレスは医院に提供せず、医院からの返信は当サイトからお届けします。"],
  ["写真の保管", "写真は非公開の保存領域に置き、医院には期限つきのリンクで共有します。相談から1年を過ぎた写真は削除します。"],
  ["委託先", "サーバー・データベース（Vercel、Supabase）、メール配信（Resend）、決済（Stripe：医院向けの請求のみ）を利用しています。"],
  ["掲載している医院の情報", "医院の名称・所在地・自費診療の料金などは、各医院の公式サイトなどの公開情報から当サイトが独自にまとめています。Google マップの評価や口コミは保存・掲載していません。医院の方は「情報の修正・掲載停止のご依頼」ページからいつでも修正・掲載停止を依頼できます。"],
  ["開示・削除のご請求", "ご本人からの開示・訂正・利用停止・削除のご請求には、下記の窓口で対応します。"],
];

export default function PrivacyPage() {
  const contact = process.env.MAIL_SENDER_INFO ?? "運営者名・所在地・連絡先をここに記載";
  return (
    <main className="mx-auto max-w-2xl px-4 py-10 text-[#15202B]">
      <h1 className="text-2xl font-bold">プライバシーポリシー</h1>
      {SECTIONS.map(([h, body]) => (
        <section key={h} className="mt-6">
          <h2 className="font-bold">{h}</h2>
          <p className="mt-1 text-sm leading-relaxed text-gray-700">{body}</p>
        </section>
      ))}
      <p className="mt-8 text-sm text-gray-700">お問い合わせ窓口：{contact}</p>
    </main>
  );
}
