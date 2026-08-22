import {
  BookOpen,
  Briefcase,
  FlaskConical,
  Gavel,
  GraduationCap,
  Palette,
  Rocket,
  SearchX,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react";

export type PersonaMeta = {
  label: string;
  fokus: string;
  icon: LucideIcon;
  // TTS tuning — lower pitch/slower rate = nada juri kritis & menekan.
  rate: number;
  pitch: number;
};

export const PERSONA_META: Record<string, PersonaMeta> = {
  teknis: {
    label: "Juri Teknis",
    fokus: "Kelayakan implementasi",
    icon: Gavel,
    rate: 1.04,
    pitch: 1.05,
  },
  dampak: {
    label: "Juri Dampak",
    fokus: "Manfaat & skalabilitas",
    icon: Rocket,
    rate: 1.05,
    pitch: 1.08,
  },
  skeptis: {
    label: "Juri Skeptis",
    fokus: "Mencari celah pada solusi",
    icon: SearchX,
    rate: 1.06,
    pitch: 1.1,
  },
  // UI/UX
  desain: {
    label: "Juri Desain",
    fokus: "Kualitas solusi desain",
    icon: Palette,
    rate: 1.02,
    pitch: 1.04,
  },
  riset: {
    label: "Juri Riset Pengguna",
    fokus: "Kebutuhan & usability pengguna",
    icon: Users,
    rate: 1.03,
    pitch: 1.05,
  },
  // Business
  bisnis: {
    label: "Juri Bisnis",
    fokus: "Kelayakan model bisnis",
    icon: Briefcase,
    rate: 1.05,
    pitch: 1.06,
  },
  pasar: {
    label: "Juri Pasar & Finansial",
    fokus: "Pasar & proyeksi finansial",
    icon: TrendingUp,
    rate: 1.04,
    pitch: 1.06,
  },
  // Academic
  metodologi: {
    label: "Dosen Metodologi",
    fokus: "Ketepatan metodologi",
    icon: FlaskConical,
    rate: 1.02,
    pitch: 1.04,
  },
  kajian: {
    label: "Dosen Kajian Pustaka",
    fokus: "Teori & kajian pustaka",
    icon: BookOpen,
    rate: 1.02,
    pitch: 1.05,
  },
  penguji: {
    label: "Dosen Penguji",
    fokus: "Penguasaan menyeluruh",
    icon: GraduationCap,
    rate: 1.04,
    pitch: 1.08,
  },
};

export function personaLabel(key: string): string {
  return PERSONA_META[key]?.label ?? key;
}
