export type Role = 'shk' | 'arzt' | 'admin';

export interface Profile {
  id: string;
  username: string;
  email: string | null;
  full_name: string | null;
  role: Role;
  contract_hours: number;
  free_hours: number;
  skills: string[];
  onboarded: boolean;
  created_at: string;
}

export type ProjectStatus = 'beantragt' | 'offen' | 'aktiv' | 'review' | 'abgeschlossen' | 'abgelehnt';

export type ProjectPriority = 'Hoch' | 'Mittel' | 'Niedrig';

export interface ProjectComment {
  id: string;
  author_id: string;
  author_name: string;
  author_role: Role;
  kind?: 'update' | 'question' | 'done' | 'comment';
  text: string;
  created_at: string;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  estimated_hours: number;
  deadline: string; // YYYY-MM-DD
  skills: string[];
  milestone_target: number;
  milestone_current: number;
  milestone_unit: string;
  sop_ids: string[];
  owner_id: string;
  status: ProjectStatus;
  priority?: ProjectPriority;
  technicalContactName?: string;
  technicalContactPhone?: string;
  comments?: ProjectComment[];
  created_at: string;
}

export type AssignmentStatus = 'beworben' | 'aktiv' | 'abgelehnt';

export interface Assignment {
  id: string;
  project_id: string;
  shk_id: string;
  status: AssignmentStatus;
  hours_month: number; // Kontingent pro Monat
  hours_total: number; // geleistet gesamt
  created_at: string;
}

export type AbsenceType = 'klausur' | 'famulatur' | 'urlaub';

export interface Absence {
  id: string;
  shk_id: string;
  type: AbsenceType;
  start_date: string;
  end_date: string;
  available_pct: number; // 0-100
  note: string;
  created_at: string;
}

export interface WikiLink {
  label: string;
  url: string;
}

export interface WikiArticle {
  id: string;
  title: string;
  category: string;
  summary: string;
  steps: string[];
  links: WikiLink[];
  author_id: string | null;
  created_at: string;
}

export interface DB {
  profiles: Profile[];
  projects: Project[];
  assignments: Assignment[];
  absences: Absence[];
  wiki: WikiArticle[];
}

export type Table = keyof DB;

export const SKILLS = [
  'SPSS', 'Python', 'R', 'DICOM-Export', 'Segmentierung', 'Literaturrecherche',
  '3D Slicer', 'Radiomics', 'Datenbereinigung', 'Excel',
];

export const WIKI_CATEGORIES = ['Allgemeines Onboarding', 'PACS / DICOM', 'Statistik & SPSS', 'Segmentierung'];

export const ROLE_LABEL: Record<Role, string> = { shk: 'SHK', arzt: 'Arzt', admin: 'Koordinator' };

export const ABSENCE_LABEL: Record<AbsenceType, string> = {
  klausur: 'Klausurenphase',
  famulatur: 'Famulatur',
  urlaub: 'Urlaub',
};

export const STATUS_LABEL: Record<ProjectStatus, string> = {
  beantragt: 'Zur Freigabe',
  offen: 'Offen (Marktplatz)',
  aktiv: 'In Arbeit',
  review: 'Ausstehend (Review)',
  abgeschlossen: 'Abgeschlossen',
  abgelehnt: 'Abgelehnt',
};

/** Pilotphasen-Schalter: SOP-Verknüpfung im Projektformular standardmäßig ausgeblendet (Code bleibt vollständig erhalten). */
export const ENABLE_SOPS = false;
