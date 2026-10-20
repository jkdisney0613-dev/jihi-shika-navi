// オンライン相談：来院前に担当医を選んで、概算費用を聞ける（無料）
import type { Metadata } from "next";
import ConsultForm from "@/components/ConsultForm";
import { getConsultClinics } from "@/lib/consult-data";
import { DEMO_MODE } from "@/lib/demo";

export const metadata: Metadata = {
  title: "矯正・ホワイトニングのオンライン相談（無料）｜行く前に先生を選べる",
  description: "歯並びのタイプを選ぶだけで総額の目安がわかり、相談したい先生を最大3院まで選んで概算を聞けます。写真は任意。",
};
export const revalidate = 3600;

export default async function ConsultPage({ searchParams }: { searchParams: Promise<{ clinic?: string }> }) {
  const { clinic } = await searchParams;
  const clinics = await getConsultClinics();
  return (
    <main className="min-h-screen bg-[#F6F7F9] px-4 py-8 text-[#15202B]">
      <div className="mx-auto max-w-lg">
        <h1 className="text-2xl font-black leading-snug">
          行く前に、
          <br />
          診てくれる先生を選ぼう。
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-gray-600">
          医院をはしごして時間とお金を使う前に、写真とお悩みだけで概算を聞けます。相談は無料で、返信はメールで届きます。
        </p>
        <div className="mt-6">
          <ConsultForm clinics={clinics} initialClinic={clinic ?? null} demo={DEMO_MODE} />
        </div>
      </div>
    </main>
  );
}
