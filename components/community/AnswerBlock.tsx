// 質問への回答1件。専門家の回答は緑、経験者の回答はクリーム色で分ける
import { EXPERT_ROLES, type Answer } from "@/lib/community-options";
import HelpfulButton from "./HelpfulButton";

export default function AnswerBlock({ a, helpful = true }: { a: Answer; helpful?: boolean }) {
  return (
    <div className={`mt-2 rounded-xl p-3 ${a.is_expert ? "bg-[#F1F7E6]" : "bg-[#FBF5EA]"}`}>
      <p className="flex items-center gap-2 text-[13px]">
        {a.is_expert && a.expert_role ? (
          <span className="rounded-md bg-[#3F6E1E] px-2 py-0.5 text-xs font-bold text-white">✓ {EXPERT_ROLES[a.expert_role]}</span>
        ) : (
          <span className="rounded-full bg-[#EEF4E2] px-2 py-0.5 text-xs font-bold text-[#3F6E1E]">みんな</span>
        )}
        <b>{a.author_label}</b>
      </p>
      <p className="mt-1 whitespace-pre-wrap text-[14.5px] leading-relaxed">{a.body}</p>
      {helpful && <div className="mt-2"><HelpfulButton target="answer" id={a.id} count={a.helpful} label="役に立った" emoji="👍" /></div>}
    </div>
  );
}
