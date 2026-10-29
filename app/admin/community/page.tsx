// 管理画面：確認待ちの投稿を公開・非公開にし、質問に専門家として回答する
import type { Metadata } from "next";
import { isAdmin } from "@/lib/admin-auth";
import { EXPERT_ROLES, TOPICS, communityDb, durationLabel, shortLabel, type Topic } from "@/lib/community";
import { formatPrice } from "@/lib/options";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "投稿の管理", robots: { index: false, follow: false } };

const btn = "rounded-lg px-3 py-1.5 text-sm font-bold";

function Review({ table, id }: { table: string; id: string }) {
  return (
    <form method="post" action="/api/admin/community" className="mt-2 flex gap-2">
      <input type="hidden" name="table" value={table} />
      <input type="hidden" name="id" value={id} />
      <button name="action" value="publish" className={`${btn} bg-[#3F6E1E] text-white`}>公開する</button>
      <button name="action" value="reject" className={`${btn} border border-gray-300 bg-white text-gray-700`}>公開しない</button>
    </form>
  );
}

const Flags = ({ flags }: { flags: string[] }) =>
  flags.length ? <p className="mt-1 text-xs text-[#B4471C]">保留の理由：{flags.join("、")}</p> : null;

export default async function AdminCommunityPage() {
  if (!(await isAdmin())) {
    return (
      <main className="mx-auto max-w-sm px-4 py-16">
        <h1 className="text-xl font-bold">管理画面</h1>
        {!process.env.ADMIN_KEY && <p className="mt-2 text-sm text-gray-600">Vercel の環境変数に ADMIN_KEY（12文字以上）を設定してください。</p>}
        <form method="post" action="/api/admin/login" className="mt-4 flex gap-2">
          <input name="key" type="password" required placeholder="管理用の鍵" className="flex-1 rounded-lg border px-3 py-2" />
          <button className={`${btn} bg-[#3F6E1E] text-white`}>入る</button>
        </form>
      </main>
    );
  }
  const db = communityDb();
  if (!db) return <main className="p-8">Supabase が未設定です。</main>;

  const [{ data: exps }, { data: qs }, { data: ans }, { data: open }] = await Promise.all([
    db.from("community_experiences").select("*").eq("status", "pending").order("created_at").limit(50),
    db.from("community_questions").select("*").eq("status", "pending").order("created_at").limit(50),
    db.from("community_answers").select("*, question:community_questions(title)").eq("status", "pending").order("created_at").limit(50),
    db.from("community_questions").select("id, topic, title, body, status, created_at, answers:community_answers(is_expert, status)")
      .in("status", ["published", "pending"]).order("created_at", { ascending: false }).limit(30),
  ]);
  const unanswered = (open ?? []).filter((q) => !q.answers.some((a: { is_expert: boolean; status: string }) => a.is_expert && a.status === "published"));
  const expertName = process.env.EXPERT_NAME ?? "";

  return (
    <main className="mx-auto max-w-2xl space-y-10 px-4 py-8 text-[#2B2118]">
      <h1 className="text-2xl font-bold">投稿の管理</h1>

      <section>
        <h2 className="text-lg font-bold">専門家の回答を待っている質問（{unanswered.length}件）</h2>
        <p className="text-xs text-gray-500">回答は一般的な情報にとどめ、診断や治療方針の判断は通院先の歯科医院へ案内してください。</p>
        {unanswered.map((q) => (
          <div key={q.id} className="mt-3 rounded-xl border bg-white p-3">
            <p className="text-xs text-gray-500">{TOPICS[q.topic as Topic]}{q.status === "pending" && "・確認待ち（回答すると公開されます）"}</p>
            <p className="font-bold">{q.title}</p>
            {q.body && <p className="whitespace-pre-wrap text-sm text-gray-700">{q.body}</p>}
            <form method="post" action="/api/admin/community" className="mt-2 space-y-2">
              <input type="hidden" name="action" value="answer" />
              <input type="hidden" name="question_id" value={q.id} />
              <textarea name="body" required minLength={5} maxLength={800} rows={4} className="w-full rounded-lg border p-2 text-sm" placeholder="回答（800文字まで）" />
              <div className="flex gap-2">
                <select name="role" className="rounded-lg border px-2 text-sm">
                  {Object.entries(EXPERT_ROLES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
                <input name="name" defaultValue={expertName} placeholder="表示名" className="w-28 rounded-lg border px-2 text-sm" />
                <button className={`${btn} ml-auto bg-[#3F6E1E] text-white`}>専門家として回答</button>
              </div>
            </form>
          </div>
        ))}
      </section>

      <section>
        <h2 className="text-lg font-bold">確認待ちの記録（{exps?.length ?? 0}件）</h2>
        {(exps ?? []).map((e) => (
          <div key={e.id} className="mt-3 rounded-xl border bg-white p-3 text-sm">
            <p className="font-bold">{shortLabel(e.option_code)}・{formatPrice(e.total_paid)}・{durationLabel(e.months)}・{e.age_band ?? "年代なし"}</p>
            {e.good && <p>よかった：{e.good}</p>}
            {e.regret && <p>後悔：{e.regret}</p>}
            <Flags flags={e.flags} />
            <Review table="community_experiences" id={e.id} />
          </div>
        ))}
      </section>

      <section>
        <h2 className="text-lg font-bold">確認待ちの質問（{qs?.length ?? 0}件）</h2>
        {(qs ?? []).map((q) => (
          <div key={q.id} className="mt-3 rounded-xl border bg-white p-3 text-sm">
            <p className="font-bold">{q.title}</p>
            {q.body && <p className="whitespace-pre-wrap">{q.body}</p>}
            <Flags flags={q.flags} />
            <Review table="community_questions" id={q.id} />
          </div>
        ))}
      </section>

      <section>
        <h2 className="text-lg font-bold">確認待ちの回答（{ans?.length ?? 0}件）</h2>
        {(ans ?? []).map((a) => (
          <div key={a.id} className="mt-3 rounded-xl border bg-white p-3 text-sm">
            <p className="text-xs text-gray-500">質問：{a.question?.title}</p>
            <p className="font-bold">{a.author_label}</p>
            <p className="whitespace-pre-wrap">{a.body}</p>
            <Flags flags={a.flags} />
            <Review table="community_answers" id={a.id} />
          </div>
        ))}
      </section>
    </main>
  );
}
