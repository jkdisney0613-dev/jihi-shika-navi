// オンライン相談を受け付けている医院と担当医の取得（Supabase 未設定時はサンプルで動く）
import type { Doctor } from "./consult";
import { getPublishedClinics } from "./data";
import { SAMPLE_CLINICS } from "./sample-clinics";
import { getReadDb } from "./supabase";
import type { Clinic } from "./types";

export interface ConsultClinic {
  clinic: Clinic;
  doctors: Doctor[];
  partnerId: string;
  leadPrice: number;
}

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

// すべて架空の担当医です
const SAMPLE_DOCTORS: Doctor[] = [
  { id: id(101), clinic_id: id(1), name: "青山 美咲", role: "矯正担当医", credentials: ["日本矯正歯科学会 認定医"], years: 14, specialties: ["ortho_aligner", "ortho_partial"], days: "火・木・土・日", photo_url: null, message: "マウスピースで治せるか、できないならなぜかを正直にお伝えします。" },
  { id: id(102), clinic_id: id(1), name: "長谷川 健", role: "院長", credentials: [], years: 20, specialties: ["whitening_office", "whitening_dual"], days: "月〜金", photo_url: null, message: null },
  { id: id(201), clinic_id: id(2), name: "新田 翔", role: "院長", credentials: [], years: 9, specialties: ["ortho_aligner", "ortho_partial", "ortho_wire"], days: "月〜土（夜20時まで）", photo_url: null, message: "総額と追加費用を最初の相談で全部お見せします。" },
  { id: id(301), clinic_id: id(3), name: "銀山 透", role: "院長", credentials: ["日本矯正歯科学会 臨床指導医"], years: 22, specialties: ["ortho_lingual", "ortho_wire", "ortho_aligner"], days: "水〜日", photo_url: null, message: null },
  { id: id(901), clinic_id: id(9), name: "恵 さくら", role: "ホワイトニング担当", credentials: [], years: 8, specialties: ["whitening_office", "whitening_dual"], days: "火〜土", photo_url: null, message: "しみやすい方にも合わせた方法をご提案します。" },
  { id: id(1001), clinic_id: id(10), name: "品田 大輔", role: "矯正担当医", credentials: [], years: 11, specialties: ["ortho_aligner", "ortho_partial"], days: "毎日（駅直結）", photo_url: null, message: null },
];

export async function getConsultClinics(): Promise<ConsultClinic[]> {
  const db = getReadDb();
  if (!db) {
    return SAMPLE_CLINICS.flatMap((clinic) => {
      const doctors = SAMPLE_DOCTORS.filter((d) => d.clinic_id === clinic.id);
      return doctors.length ? [{ clinic, doctors, partnerId: `sample-${clinic.id}`, leadPrice: 0 }] : [];
    });
  }

  const [{ data: partners, error: pe }, { data: doctors, error: de }, clinics] = await Promise.all([
    db.from("clinic_partners").select("id, clinic_id, lead_price").eq("status", "active").not("clinic_id", "is", null),
    db.from("doctors").select("id, clinic_id, name, role, credentials, years, specialties, days, photo_url, message").eq("is_published", true).eq("accepts_online", true),
    getPublishedClinics(),
  ]);
  if (pe || de) throw pe ?? de;

  return (partners ?? []).flatMap((p) => {
    const clinic = clinics.find((c) => c.id === p.clinic_id);
    const ds = (doctors ?? []).filter((d) => d.clinic_id === p.clinic_id) as Doctor[];
    return clinic && ds.length ? [{ clinic, doctors: ds, partnerId: p.id as string, leadPrice: p.lead_price as number }] : [];
  });
}
