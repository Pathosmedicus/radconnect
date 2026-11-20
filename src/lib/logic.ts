import type { Absence, Assignment, DB, Profile, Project } from '../types';

export const uid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36);

export const iso = (d: Date) => {
  const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return z.toISOString().slice(0, 10);
};
export const todayIso = () => iso(new Date());
export const addDays = (dateIso: string, n: number) => {
  const d = new Date(dateIso + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return iso(d);
};
export const daysBetween = (a: string, b: string) =>
  Math.round((new Date(b + 'T12:00:00').getTime() - new Date(a + 'T12:00:00').getTime()) / 86400000);
export const fmtDate = (s: string) =>
  new Date(s + 'T12:00:00').toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });

export const nameOf = (p?: Profile | null) => (p ? p.full_name || p.username : 'Unbekannt');

// ---- Kapazität ----------------------------------------------------------------

/** Spiegelt den DB-Trigger: freie Stunden = Vertrag − Σ Kontingent aktiver Zuweisungen. */
export function recalcFree(profiles: Profile[], assignments: Assignment[]): Profile[] {
  return profiles.map((p) => {
    if (p.role !== 'shk') return p;
    const used = assignments
      .filter((a) => a.shk_id === p.id && a.status === 'aktiv')
      .reduce((s, a) => s + a.hours_month, 0);
    return { ...p, free_hours: Math.max(0, p.contract_hours - used) };
  });
}

const BLOCK_THRESHOLD = 50; // < 50 % verfügbar gilt als "blockiert"

export const isBlocking = (a: Absence) => a.available_pct < BLOCK_THRESHOLD;
const overlaps = (a: Absence, from: string, to: string) => a.start_date <= to && a.end_date >= from;

export function blockedIn(db: DB, shkId: string, from: string, to: string): Absence[] {
  return db.absences.filter((a) => a.shk_id === shkId && isBlocking(a) && overlaps(a, from, to));
}

export function blockedNow(db: DB, shkId: string): Absence | undefined {
  const t = todayIso();
  return blockedIn(db, shkId, t, t)[0];
}

export type Ampel = 'gruen' | 'gelb' | 'rot';

export function ampel(db: DB, p: Profile): { level: Ampel; label: string } {
  if (blockedNow(db, p.id)) return { level: 'rot', label: 'Aktuell nicht verfügbar' };
  if (p.free_hours >= 10) return { level: 'gruen', label: 'Gut verfügbar' };
  if (p.free_hours >= 4) return { level: 'gelb', label: 'Begrenzt verfügbar' };
  return { level: 'rot', label: 'Ausgelastet' };
}

export interface Warning {
  level: 'none' | 'yellow' | 'red';
  message: string;
  share: number;
  blocked: Profile[];
}

/** Konflikt-Warnung für eine Deadline (Fenster: 21 Tage vor Deadline bis Deadline). */
export function deadlineWarning(db: DB, deadline: string, shkId?: string): Warning {
  const none: Warning = { level: 'none', message: '', share: 0, blocked: [] };
  if (!deadline) return none;
  const t = todayIso();
  if (deadline < t) return none;
  const from = addDays(deadline, -21) < t ? t : addDays(deadline, -21);
  const shks = db.profiles.filter((p) => p.role === 'shk');
  if (shks.length === 0) return none;

  if (shkId) {
    const p = shks.find((s) => s.id === shkId);
    if (p && blockedIn(db, p.id, from, deadline).length > 0)
      return {
        level: 'red',
        share: 1,
        blocked: [p],
        message: `Achtung: ${nameOf(p)} ist im Zielzeitraum blockiert (Klausuren/Urlaub) – Kapazität eingeschränkt!`,
      };
    return none;
  }
  const blocked = shks.filter((s) => blockedIn(db, s.id, from, deadline).length > 0);
  const share = blocked.length / shks.length;
  const pct = Math.round(share * 100);
  if (share > 0.4)
    return {
      level: 'red', share, blocked,
      message: `Achtung: Hohe Klausurendichte im Zielzeitraum – Kapazität eingeschränkt! ${pct} % der SHKs (${blocked.length} von ${shks.length}) sind blockiert.`,
    };
  if (share >= 0.25)
    return {
      level: 'yellow', share, blocked,
      message: `Hinweis: Im Zielzeitraum sind ${pct} % der SHKs teilweise blockiert (Klausuren/Urlaub).`,
    };
  return none;
}

// ---- Matching -----------------------------------------------------------------

export interface Match {
  shk: Profile;
  score: number;
  hits: string[];
  blocked: boolean;
  free: number;
}

export function matchSuggestions(db: DB, project: Project): Match[] {
  const from = todayIso();
  return db.profiles
    .filter((p) => p.role === 'shk')
    .map((shk) => {
      const hits = project.skills.filter((s) => shk.skills.includes(s));
      const skillScore = project.skills.length ? hits.length / project.skills.length : 0.5;
      const capScore = Math.min(1, shk.free_hours / 12);
      const blocked = blockedIn(db, shk.id, from, project.deadline).length > 0;
      const score = Math.round((skillScore * 60 + capScore * 40) * (blocked ? 0.5 : 1));
      return { shk, score, hits, blocked, free: shk.free_hours };
    })
    .filter((m) => m.free > 0)
    .sort((a, b) => b.score - a.score);
}

// ---- Meilenstein / Zeitplan -------------------------------------------------------

export function milestoneInfo(p: Project) {
  const ratio = p.milestone_target > 0 ? Math.min(1, p.milestone_current / p.milestone_target) : 0;
  const total = Math.max(1, daysBetween(p.created_at.slice(0, 10), p.deadline));
  const elapsed = Math.min(total, Math.max(0, daysBetween(p.created_at.slice(0, 10), todayIso())));
  const expected = elapsed / total;
  let state: 'done' | 'ok' | 'late' | 'risk' = 'ok';
  if (ratio >= 1) state = 'done';
  else if (ratio < expected - 0.25) state = 'risk';
  else if (ratio < expected - 0.1) state = 'late';
  return { ratio, expected, state };
}

export const scheduleLabel = {
  done: 'Ziel erreicht',
  ok: 'Im Zeitplan',
  late: 'Leichter Verzug',
  risk: 'Gefährdet',
} as const;

// ---- CSV ---------------------------------------------------------------------------

export function exportHoursCsv(db: DB) {
  const rows: string[][] = [
    ['SHK', 'Benutzername', 'Projekt', 'Arzt', 'Kontingent Std./Monat', 'Geleistet gesamt (Std.)', 'Vertragsstunden/Monat'],
  ];
  db.assignments
    .filter((a) => a.status === 'aktiv')
    .forEach((a) => {
      const shk = db.profiles.find((p) => p.id === a.shk_id);
      const pr = db.projects.find((p) => p.id === a.project_id);
      const arzt = db.profiles.find((p) => p.id === pr?.owner_id);
      rows.push([
        nameOf(shk), shk?.username ?? '', pr?.title ?? '', nameOf(arzt),
        String(a.hours_month), String(a.hours_total).replace('.', ','), String(shk?.contract_hours ?? 0),
      ]);
    });
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const csv = '\uFEFF' + rows.map((r) => r.map(esc).join(';')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `radconnect_stunden_${todayIso().slice(0, 7)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
