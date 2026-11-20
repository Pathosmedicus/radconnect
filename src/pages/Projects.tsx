import React, { useMemo, useState } from 'react';
import {
  BookOpen, Calendar, CheckCircle2, Clock, ExternalLink, Flag, HelpCircle, MessageSquare, Minus, Pencil, Phone, Plus, RotateCcw, Send, Sparkles, Trash2, UserCheck, UserPlus, XCircle,
} from 'lucide-react';
import { useApp } from '../lib/app';
import { useView } from '../lib/view';
import {
  deadlineWarning, fmtDate, matchSuggestions, nameOf, todayIso, uid,
} from '../lib/logic';
import {
  type Assignment, ENABLE_SOPS, type Project, type ProjectComment, type ProjectPriority, type ProjectStatus, ROLE_LABEL, SKILLS, STATUS_LABEL,
} from '../types';
import {
  Empty, MilestoneBar, Modal, PageHeader, ProgressBar, SkillTag, TagInput, WarningBanner,
} from '../components/ui';

const statusTone: Record<ProjectStatus, string> = {
  beantragt: 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 dark:ring-1 dark:ring-amber-700/50',
  offen: 'bg-sky-100 text-sky-800 dark:bg-sky-950/80 dark:text-sky-300 dark:ring-1 dark:ring-sky-700/50',
  aktiv: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 dark:ring-1 dark:ring-emerald-700/50',
  review: 'bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300 dark:ring-1 dark:ring-purple-700/50',
  abgeschlossen: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:ring-1 dark:ring-slate-700',
  abgelehnt: 'bg-red-100 text-red-700 dark:bg-red-950/80 dark:text-red-300 dark:ring-1 dark:ring-red-700/50',
};
export const StatusBadge = ({ s }: { s: ProjectStatus }) => (
  <span className={`badge ${statusTone[s]}`}>{STATUS_LABEL[s]}</span>
);

const priorityTone: Record<ProjectPriority, string> = {
  Hoch: 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 dark:ring-1 dark:ring-rose-700/50',
  Mittel: 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 dark:ring-1 dark:ring-amber-700/50',
  Niedrig: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:ring-1 dark:ring-slate-700',
};
export const PriorityBadge = ({ p = 'Mittel' }: { p?: ProjectPriority }) => (
  <span className={`badge ${priorityTone[p]}`}>
    <Flag size={10} /> {p}
  </span>
);

const fmtDateTime = (isoStr: string) => {
  try {
    return new Date(isoStr).toLocaleString('de-DE', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return isoStr;
  }
};

// ---------------------------------------------------------------------------
// Karte
// ---------------------------------------------------------------------------
export function ProjectCard({
  project, onOpen, onEdit, extra,
}: { project: Project; onOpen: () => void; onEdit?: () => void; extra?: React.ReactNode }) {
  const { db } = useApp();
  const { actor, viewRole } = useView();
  const owner = db.profiles.find((p) => p.id === project.owner_id);
  const canEdit = viewRole === 'admin' || (viewRole === 'arzt' && project.owner_id === actor.id);
  const commentCount = project.comments?.length ?? 0;

  return (
    <div
      className="card group flex h-full cursor-pointer flex-col justify-between p-5 transition hover:-translate-y-0.5 hover:border-brand-500/40 hover:shadow-lg dark:hover:border-brand-500/50"
      onClick={onOpen}
    >
      <div>
        <div className="mb-2.5 flex items-start justify-between gap-2">
          <h3 className="font-bold leading-snug text-slate-900 group-hover:text-brand-600 dark:text-slate-100 dark:group-hover:text-brand-300">
            {project.title}
          </h3>
          <div className="flex shrink-0 items-center gap-1.5">
            <PriorityBadge p={project.priority ?? 'Mittel'} />
            <StatusBadge s={project.status} />
          </div>
        </div>
        <p className="mb-3 line-clamp-2 min-h-[2.5rem] text-sm text-slate-500 dark:text-slate-400">
          {project.description || 'Keine Projektbeschreibung hinterlegt.'}
        </p>
        {(project.technicalContactName || project.technicalContactPhone) && (
          <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs text-slate-600 dark:bg-slate-800/50 dark:text-slate-300">
            {project.technicalContactName && (
              <span className="inline-flex items-center gap-1 font-medium">
                <UserCheck size={12} className="text-brand-600 dark:text-brand-400" /> {project.technicalContactName}
              </span>
            )}
            {project.technicalContactPhone && (
              <span className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-400">
                <Phone size={11} /> {project.technicalContactPhone}
              </span>
            )}
          </div>
        )}
        {project.skills.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-1.5">
            {project.skills.map((s) => <SkillTag key={s}>{s}</SkillTag>)}
          </div>
        )}
      </div>

      <div>
        {project.status !== 'beantragt' && project.status !== 'abgelehnt' && project.milestone_target > 0 ? (
          <div className="mb-3.5 rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800/60">
            <MilestoneBar project={project} compact />
          </div>
        ) : project.milestone_target > 0 ? (
          <div className="mb-3.5 flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
            <span>Ziel: {project.milestone_target} {project.milestone_unit}</span>
            <span>{project.status === 'beantragt' ? 'Wartet auf Freigabe' : 'Nicht aktiv'}</span>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
          <span className="font-medium text-slate-700 dark:text-slate-300">{nameOf(owner)}</span>
          <span className="flex items-center gap-2.5">
            {commentCount > 0 && (
              <span className="inline-flex items-center gap-1 font-semibold text-brand-700 dark:text-brand-300" title="Kommentare & Updates">
                <MessageSquare size={12} /> {commentCount}
              </span>
            )}
            <span>{project.estimated_hours} Std.</span>
            <span className="flex items-center gap-1"><Calendar size={12} /> {fmtDate(project.deadline)}</span>
            {canEdit && onEdit && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onEdit(); }}
                className="inline-flex items-center gap-1 rounded-lg bg-brand-50 px-2 py-1 font-semibold text-brand-700 transition hover:bg-brand-100 dark:bg-brand-900/50 dark:text-brand-200 dark:hover:bg-brand-800/70"
                title="Projekt direkt bearbeiten"
              >
                <Pencil size={11} /> Bearbeiten
              </button>
            )}
          </span>
        </div>
        {extra && <div className="mt-3" onClick={(e) => e.stopPropagation()}>{extra}</div>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Neues Projekt / Projekt bearbeiten
// ---------------------------------------------------------------------------
export function ProjectForm({ initial, onClose }: { initial?: Project; onClose: () => void }) {
  const { db, save, notify } = useApp();
  const { actor, viewRole } = useView();
  const arzte = db.profiles.filter((p) => p.role === 'arzt');
  const shks = db.profiles.filter((p) => p.role === 'shk');
  const [milestoneEnabled, setMilestoneEnabled] = useState<boolean>(
    initial ? initial.milestone_target > 0 : false,
  );
  const [showSops] = useState<boolean>(ENABLE_SOPS);
  const [f, setF] = useState({
    title: initial?.title ?? '',
    description: initial?.description ?? '',
    estimated_hours: initial?.estimated_hours ?? 40,
    deadline: initial?.deadline ?? '',
    priority: (initial?.priority ?? 'Mittel') as ProjectPriority,
    technicalContactName: initial?.technicalContactName ?? (viewRole === 'arzt' ? (actor.full_name || actor.username) : ''),
    technicalContactPhone: initial?.technicalContactPhone ?? '',
    skills: initial?.skills ?? ([] as string[]),
    milestone_target: initial && initial.milestone_target > 0 ? initial.milestone_target : 100,
    milestone_unit: initial?.milestone_unit ?? 'Datensätze',
    sop_ids: initial?.sop_ids ?? ([] as string[]),
    owner_id: initial?.owner_id ?? (viewRole === 'arzt' ? actor.id : arzte[0]?.id ?? actor.id),
    shk: '',
  });
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((s) => ({ ...s, [k]: v }));
  const warning = useMemo(() => deadlineWarning(db, f.deadline, f.shk || undefined), [db, f.deadline, f.shk]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetVal = milestoneEnabled ? Math.max(1, Number(f.milestone_target)) : 0;
    if (initial) {
      const updated: Project = {
        ...initial,
        title: f.title.trim(),
        description: f.description.trim(),
        estimated_hours: Number(f.estimated_hours),
        deadline: f.deadline,
        priority: f.priority,
        technicalContactName: f.technicalContactName.trim(),
        technicalContactPhone: f.technicalContactPhone.trim(),
        skills: f.skills,
        milestone_target: targetVal,
        milestone_unit: f.milestone_unit.trim() || 'Einheiten',
        sop_ids: f.sop_ids,
        owner_id: viewRole === 'admin' ? f.owner_id : initial.owner_id,
      };
      await save('projects', updated);
      notify('Projektänderungen gespeichert.');
      onClose();
      return;
    }
    const p: Project = {
      id: uid(), title: f.title.trim(), description: f.description.trim(),
      estimated_hours: Number(f.estimated_hours), deadline: f.deadline,
      priority: f.priority,
      technicalContactName: f.technicalContactName.trim(),
      technicalContactPhone: f.technicalContactPhone.trim(),
      skills: f.skills,
      milestone_target: targetVal, milestone_current: 0, milestone_unit: f.milestone_unit.trim() || 'Einheiten',
      sop_ids: f.sop_ids, owner_id: viewRole === 'admin' ? f.owner_id : actor.id,
      status: viewRole === 'admin' ? 'offen' : 'beantragt',
      comments: [],
      created_at: new Date().toISOString(),
    };
    await save('projects', p);
    notify(viewRole === 'admin' ? 'Projekt im Marktplatz veröffentlicht.' : 'Projekt zur Freigabe eingereicht.');
    onClose();
  };

  return (
    <Modal title={initial ? 'Projekt bearbeiten' : 'Neues Projekt'} onClose={onClose} wide>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <label className="label" htmlFor="pf-title">Titel</label>
            <input id="pf-title" className="input" required value={f.title} onChange={(e) => set('title', e.target.value)} />
          </div>
          <div>
            <span className="label">Priorität</span>
            <div className="grid grid-cols-3 gap-1.5">
              {(['Hoch', 'Mittel', 'Niedrig'] as ProjectPriority[]).map((prio) => (
                <button
                  type="button"
                  key={prio}
                  onClick={() => set('priority', prio)}
                  className={`rounded-xl border px-2 py-2 text-xs font-semibold transition ${
                    f.priority === prio
                      ? prio === 'Hoch'
                        ? 'border-rose-500 bg-rose-50 text-rose-800 dark:bg-rose-950/70 dark:text-rose-200'
                        : prio === 'Mittel'
                        ? 'border-amber-500 bg-amber-50 text-amber-800 dark:bg-amber-950/70 dark:text-amber-200'
                        : 'border-brand-500 bg-brand-50 text-brand-800 dark:bg-brand-950/70 dark:text-brand-200'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
                  }`}
                >
                  {prio}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div>
          <label className="label" htmlFor="pf-desc">Beschreibung & Kohorten-Parameter</label>
          <textarea id="pf-desc" className="input min-h-[80px]" value={f.description} onChange={(e) => set('description', e.target.value)} placeholder="z. B. Einschlusskriterien, Sequenzen, Zielgrößen…" />
          <p className="mt-1 text-xs text-slate-400">Bitte keine Patientendaten (Klarnamen/Geburtsdaten) eintragen.</p>
        </div>
        <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3 sm:grid-cols-2 dark:border-slate-800 dark:bg-slate-800/40">
          <div>
            <label className="label" htmlFor="pf-contact-name">Methodische / Fachliche Ansprechperson</label>
            <input
              id="pf-contact-name"
              className="input"
              placeholder="z. B. Dr. Anna Weber / OA CT"
              value={f.technicalContactName}
              onChange={(e) => set('technicalContactName', e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="pf-contact-phone">Telefonnummer / DECT / Funk</label>
            <input
              id="pf-contact-phone"
              className="input"
              placeholder="z. B. -4821 (DECT)"
              value={f.technicalContactPhone}
              onChange={(e) => set('technicalContactPhone', e.target.value)}
            />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="label" htmlFor="pf-h">Geschätzter Aufwand (Std.)</label>
            <input id="pf-h" type="number" min={1} className="input" value={f.estimated_hours} onChange={(e) => set('estimated_hours', Number(e.target.value))} />
          </div>
          <div>
            <label className="label" htmlFor="pf-dl">Deadline</label>
            <input id="pf-dl" type="date" required min={initial ? undefined : todayIso()} className="input" value={f.deadline} onChange={(e) => set('deadline', e.target.value)} />
          </div>
          {viewRole === 'admin' ? (
            <div>
              <label className="label" htmlFor="pf-owner">Projektleiter (Arzt)</label>
              <select id="pf-owner" className="input" value={f.owner_id} onChange={(e) => set('owner_id', e.target.value)}>
                {arzte.map((a) => <option key={a.id} value={a.id}>{nameOf(a)}</option>)}
              </select>
            </div>
          ) : !initial ? (
            <div>
              <label className="label" htmlFor="pf-shk">Angefragte SHK (optional)</label>
              <select id="pf-shk" className="input" value={f.shk} onChange={(e) => set('shk', e.target.value)}>
                <option value="">– keine Präferenz –</option>
                {shks.map((a) => <option key={a.id} value={a.id}>{nameOf(a)}</option>)}
              </select>
            </div>
          ) : null}
        </div>
        <WarningBanner w={warning} />
        <div>
          <span className="label">Benötigte Skills</span>
          <TagInput value={f.skills} onChange={(v) => set('skills', v)} suggestions={SKILLS} />
        </div>

        {/* Optionaler Quantitativer Meilenstein */}
        <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
          <label className="flex cursor-pointer items-center justify-between gap-2">
            <div>
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">Quantitativer Meilenstein aktiv</span>
              <p className="text-xs text-slate-500 dark:text-slate-400">Optional: Ziel-Anzahl für Datensätze, Patienten oder Sequenzen festlegen</p>
            </div>
            <input
              type="checkbox"
              className="h-4 w-4 accent-brand-600"
              checked={milestoneEnabled}
              onChange={(e) => setMilestoneEnabled(e.target.checked)}
            />
          </label>
          {milestoneEnabled && (
            <div className="mt-3 grid gap-3 border-t border-slate-100 pt-3 sm:grid-cols-2 dark:border-slate-800">
              <div>
                <label className="label" htmlFor="pf-mt">Meilenstein-Ziel (Anzahl)</label>
                <input id="pf-mt" type="number" min={1} className="input" value={f.milestone_target} onChange={(e) => set('milestone_target', Number(e.target.value))} />
              </div>
              <div>
                <label className="label" htmlFor="pf-mu">Einheit</label>
                <input id="pf-mu" list="units" className="input" value={f.milestone_unit} onChange={(e) => set('milestone_unit', e.target.value)} />
                <datalist id="units">
                  {['Patienten', 'Sequenzen', 'Prozent', 'CT-Datensätze', 'Datensätze', 'Fälle'].map((u) => <option key={u} value={u} />)}
                </datalist>
              </div>
            </div>
          )}
        </div>

        {/* SOPs verknüpfen: für Pilotphase über ENABLE_SOPS standardmäßig ausgeblendet (Code vollständig erhalten) */}
        {showSops && (
          <div>
            <span className="label">SOPs verknüpfen (optional)</span>
            <div className="max-h-40 space-y-1 overflow-y-auto rounded-xl border border-slate-200 p-2 dark:border-slate-700">
              {db.wiki.map((w) => (
                <label key={w.id} className="flex cursor-pointer items-start gap-2 rounded-lg p-1.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-800">
                  <input type="checkbox" className="mt-1" checked={f.sop_ids.includes(w.id)}
                    onChange={(e) => set('sop_ids', e.target.checked ? [...f.sop_ids, w.id] : f.sop_ids.filter((x) => x !== w.id))} />
                  <span><b>{w.title}</b> <span className="text-xs text-slate-400">· {w.category}</span></span>
                </label>
              ))}
              {db.wiki.length === 0 && <p className="p-2 text-xs text-slate-400">Noch keine SOPs vorhanden.</p>}
            </div>
          </div>
        )}
        <div className="flex justify-end gap-2">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Abbrechen</button>
          <button className="btn btn-primary">
            {initial ? 'Änderungen speichern' : viewRole === 'admin' ? 'Veröffentlichen' : 'Zur Freigabe einreichen'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Meilenstein-Steuerung (für SHK, Arzt-Owner & Admin)
// ---------------------------------------------------------------------------
function MilestoneQuickControls({ project }: { project: Project }) {
  const { save } = useApp();
  const [exact, setExact] = useState('');
  const bumpMs = (d: number) =>
    save('projects', { ...project, milestone_current: Math.max(0, project.milestone_current + d) });
  return (
    <div>
      <span className="label">Meilenstein-Quick-Update</span>
      <MilestoneBar project={project} />
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <button className="btn btn-ghost btn-sm" onClick={() => bumpMs(-1)}><Minus size={12} /> 1</button>
        {[1, 5, 10].map((n) => <button key={n} className="btn btn-primary btn-sm" onClick={() => bumpMs(n)}><Plus size={12} /> {n}</button>)}
        <input type="number" min={0} className="input !w-24 !py-1.5 text-xs" placeholder="Exakt" value={exact} onChange={(e) => setExact(e.target.value)} />
        <button className="btn btn-ghost btn-sm" disabled={exact === ''} onClick={() => { save('projects', { ...project, milestone_current: Math.max(0, Number(exact)) }); setExact(''); }}>Setzen</button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SHK: Eigene Stunden + Meilenstein aktualisieren
// ---------------------------------------------------------------------------
function AssignmentControls({ a, project }: { a: Assignment; project: Project }) {
  const { save, db } = useApp();
  const me = db.profiles.find((p) => p.id === a.shk_id)!;
  const bumpHours = (d: number) => save('assignments', { ...a, hours_total: Math.max(0, a.hours_total + d) });
  return (
    <div className="space-y-4 rounded-2xl border border-brand-200/80 bg-brand-50/60 p-4 dark:border-brand-800/60 dark:bg-brand-950/30">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <span className="label">Mein Kontingent (Std./Monat)</span>
          <input type="number" min={0} max={me.contract_hours} className="input" value={a.hours_month}
            onChange={(e) => save('assignments', { ...a, hours_month: Math.max(0, Number(e.target.value)) })} />
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Freie Restkapazität: {me.free_hours} Std.</p>
        </div>
        <div>
          <span className="label">Geleistet gesamt: {a.hours_total} Std. / {project.estimated_hours} Std.</span>
          <ProgressBar ratio={Math.min(1, a.hours_total / Math.max(1, project.estimated_hours))} />
          <div className="mt-2 flex gap-1.5">
            <button className="btn btn-ghost btn-sm" onClick={() => bumpHours(-1)}><Minus size={12} /> 1</button>
            {[1, 2, 4].map((n) => <button key={n} className="btn btn-primary btn-sm" onClick={() => bumpHours(n)}><Plus size={12} /> {n} Std.</button>)}
          </div>
        </div>
      </div>
      {project.milestone_target > 0 && <MilestoneQuickControls project={project} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Kommentar- & Aktivitäts-Feed im Projekt-Modal
// ---------------------------------------------------------------------------
function ProjectCommentsFeed({ project }: { project: Project }) {
  const { save, notify } = useApp();
  const { actor, viewRole } = useView();
  const [text, setText] = useState('');
  const [kind, setKind] = useState<NonNullable<ProjectComment['kind']>>('update');
  const comments = project.comments ?? [];

  const applyTemplate = (k: NonNullable<ProjectComment['kind']>, prefix: string) => {
    setKind(k);
    if (!text.trim()) {
      setText(prefix);
    } else if (!text.startsWith(prefix)) {
      setText(`${prefix}${text}`);
    }
  };

  const addComment = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    const entry: ProjectComment = {
      id: uid(),
      author_id: actor.id,
      author_name: nameOf(actor),
      author_role: viewRole,
      kind,
      text: trimmed,
      created_at: new Date().toISOString(),
    };
    await save('projects', { ...project, comments: [...comments, entry] });
    setText('');
    notify('Eintrag im Projekt-Feed gespeichert.');
  };

  const deleteComment = async (id: string) => {
    await save('projects', { ...project, comments: comments.filter((c) => c.id !== id) });
    notify('Kommentar entfernt.');
  };

  const kindBadge = (k?: ProjectComment['kind']) => {
    if (k === 'question') return <span className="badge bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300">❓ Frage an Betreuer</span>;
    if (k === 'done') return <span className="badge bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">✅ Erledigt</span>;
    return <span className="badge bg-brand-100 text-brand-800 dark:bg-brand-900/60 dark:text-brand-200">📌 Statusupdate</span>;
  };

  return (
    <div className="space-y-4">
      <form onSubmit={addComment} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/40">
        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
          <span className="label !mb-0">Schnell-Buttons für Dokumentation & Rückfragen</span>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => applyTemplate('update', 'Statusupdate (z.B. Pat. 0001–0450): ')}
              className={`badge cursor-pointer transition ${kind === 'update' ? 'bg-brand-600 text-white' : 'bg-white text-slate-700 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300'}`}
            >
              📌 Statusupdate...
            </button>
            <button
              type="button"
              onClick={() => applyTemplate('question', 'Frage an Betreuer: ')}
              className={`badge cursor-pointer transition ${kind === 'question' ? 'bg-amber-600 text-white' : 'bg-white text-slate-700 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300'}`}
            >
              <HelpCircle size={11} /> Frage an Betreuer...
            </button>
            <button
              type="button"
              onClick={() => applyTemplate('done', 'Erledigt: ')}
              className={`badge cursor-pointer transition ${kind === 'done' ? 'bg-emerald-600 text-white' : 'bg-white text-slate-700 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300'}`}
            >
              <CheckCircle2 size={11} /> Erledigt
            </button>
          </div>
        </div>
        <textarea
          className="input min-h-[76px]"
          placeholder="Parameter-Änderungen (z. B. Pat. 0001–0450), Zwischenstand oder technische Rückfrage an Betreuer dokumentieren…"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <div className="mt-2.5 flex items-center justify-between gap-2">
          <span className="text-xs text-slate-400">
            Wird mit Zeitstempel als <b>{nameOf(actor)}</b> ({ROLE_LABEL[viewRole]}) protokolliert.
          </span>
          <button type="submit" disabled={!text.trim()} className="btn btn-primary btn-sm">
            <Send size={13} /> Beitrag senden
          </button>
        </div>
      </form>

      <div className="space-y-2.5">
        {comments.length === 0 ? (
          <Empty text="Noch keine Kommentare oder Parameter-Updates in diesem Projekt." />
        ) : (
          comments
            .slice()
            .reverse()
            .map((c) => (
              <div key={c.id} className="rounded-xl border border-slate-200 bg-white p-3.5 text-sm shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {kindBadge(c.kind)}
                    <b className="text-slate-900 dark:text-slate-100">{c.author_name}</b>
                    <span className="badge bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                      {ROLE_LABEL[c.author_role]}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span>{fmtDateTime(c.created_at)}</span>
                    {(viewRole === 'admin' || c.author_id === actor.id) && (
                      <button
                        type="button"
                        onClick={() => deleteComment(c.id)}
                        className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/50"
                        title="Eintrag löschen"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                </div>
                <p className="whitespace-pre-line text-slate-700 dark:text-slate-300">{c.text}</p>
              </div>
            ))
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Koordinator: Matching & Zuweisung
// ---------------------------------------------------------------------------
function MatchPanel({ project }: { project: Project }) {
  const { db, save, notify } = useApp();
  const matches = useMemo(() => matchSuggestions(db, project).slice(0, 5), [db, project]);
  const [hours, setHours] = useState(Math.max(4, Math.ceil(project.estimated_hours / 4)));

  const assign = async (shkId: string) => {
    const existing = db.assignments.find((a) => a.project_id === project.id && a.shk_id === shkId);
    await save('assignments', {
      ...(existing ?? { id: uid(), project_id: project.id, shk_id: shkId, hours_total: 0, created_at: new Date().toISOString() }),
      status: 'aktiv', hours_month: hours,
    } as Assignment);
    if (project.status !== 'aktiv') await save('projects', { ...project, status: 'aktiv' });
    notify('SHK zugewiesen.');
  };

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="label !mb-0 flex items-center gap-1"><Sparkles size={12} /> Matching-Vorschläge</span>
        <label className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
          Kontingent
          <input type="number" min={1} className="input !w-16 !py-1 text-xs" value={hours} onChange={(e) => setHours(Number(e.target.value))} /> Std./Monat
        </label>
      </div>
      <div className="space-y-2">
        {matches.map((m) => (
          <div key={m.shk.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-sm font-semibold">
                {nameOf(m.shk)}
                <span className="badge bg-brand-100 text-brand-800 dark:bg-brand-950/60 dark:text-brand-300">{m.score} %</span>
                {m.blocked && <span className="badge bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300">Blocker im Zeitraum</span>}
              </div>
              <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                {m.free} Std. frei · Skills: {m.hits.length ? m.hits.join(', ') : 'keine Übereinstimmung'}
              </div>
            </div>
            <button className="btn btn-primary btn-sm shrink-0" onClick={() => assign(m.shk.id)}><UserPlus size={13} /> Zuweisen</button>
          </div>
        ))}
        {matches.length === 0 && <Empty text="Keine SHK mit freier Kapazität." />}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Detail
// ---------------------------------------------------------------------------
export function ProjectDetail({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const { db, save, remove, notify } = useApp();
  const { actor, viewRole } = useView();
  const [openSop, setOpenSop] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [detailTab, setDetailTab] = useState<'overview' | 'comments'>('overview');
  const project = db.projects.find((p) => p.id === projectId);
  if (!project) return null;

  const owner = db.profiles.find((p) => p.id === project.owner_id);
  const assigns = db.assignments.filter((a) => a.project_id === project.id);
  const activeAssigns = assigns.filter((a) => a.status === 'aktiv');
  const totalContingent = activeAssigns.reduce((s, a) => s + a.hours_month, 0);
  const totalLogged = activeAssigns.reduce((s, a) => s + a.hours_total, 0);
  const mine = assigns.find((a) => a.shk_id === actor.id);
  const isOwner = viewRole === 'arzt' && project.owner_id === actor.id;
  const canEdit = viewRole === 'admin' || isOwner;
  const sops = project.sop_ids.map((id) => db.wiki.find((w) => w.id === id)).filter(Boolean);
  const canSeeSop = ENABLE_SOPS && (viewRole === 'admin' || isOwner || mine?.status === 'aktiv' || (viewRole === 'shk' && project.status === 'offen'));
  const commentCount = project.comments?.length ?? 0;

  const setStatus = async (status: ProjectStatus) => { await save('projects', { ...project, status }); notify(`Status: ${STATUS_LABEL[status]}`); };
  const apply = async () => {
    await save('assignments', { id: uid(), project_id: project.id, shk_id: actor.id, status: 'beworben', hours_month: 0, hours_total: 0, created_at: new Date().toISOString() } as Assignment);
    notify('Bewerbung gesendet.');
  };
  const confirm = async (a: Assignment) => {
    const hm = Math.max(4, Math.ceil(project.estimated_hours / 4));
    await save('assignments', { ...a, status: 'aktiv', hours_month: hm });
    if (project.status !== 'aktiv' && project.status !== 'review') await save('projects', { ...project, status: 'aktiv' });
    notify('Bewerbung bestätigt.');
  };
  const del = async () => { await remove('projects', project.id); notify('Projekt gelöscht.'); onClose(); };

  if (editing) {
    return <ProjectForm initial={project} onClose={() => setEditing(false)} />;
  }

  return (
    <Modal title={project.title} onClose={onClose} wide>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <PriorityBadge p={project.priority ?? 'Mittel'} />
            <StatusBadge s={project.status} />
            <span>Leitung: <b className="text-slate-700 dark:text-slate-200">{nameOf(owner)}</b></span>
            <span>· Deadline {fmtDate(project.deadline)}</span>
          </div>
          {canEdit && (
            <button className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}>
              <Pencil size={13} /> Projekt bearbeiten
            </button>
          )}
        </div>

        {/* Interaktive Tabs im Projekt-Modal */}
        <div className="grid grid-cols-2 rounded-xl bg-slate-100 p-1 text-sm font-semibold dark:bg-slate-800">
          <button
            type="button"
            onClick={() => setDetailTab('overview')}
            className={`rounded-lg py-2 transition ${detailTab === 'overview' ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}
          >
            📋 Übersicht & Stunden
          </button>
          <button
            type="button"
            onClick={() => setDetailTab('comments')}
            className={`flex items-center justify-center gap-1.5 rounded-lg py-2 transition ${detailTab === 'comments' ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}
          >
            💬 Kommentare & Updates
            <span className="badge bg-brand-100 text-brand-800 dark:bg-brand-900/60 dark:text-brand-200">{commentCount}</span>
          </button>
        </div>

        {detailTab === 'comments' ? (
          <ProjectCommentsFeed project={project} />
        ) : (
          <>
            <p className="whitespace-pre-line text-sm text-slate-700 dark:text-slate-300">{project.description || 'Keine Beschreibung.'}</p>

            {/* Fachliche / Methodische Ansprechperson */}
            {(project.technicalContactName || project.technicalContactPhone) && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm dark:border-slate-800 dark:bg-slate-800/50">
                <div className="flex items-center gap-2">
                  <UserCheck size={16} className="text-brand-600 dark:text-brand-400" />
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Methodische / Fachliche Ansprechperson</div>
                    <div className="font-semibold text-slate-800 dark:text-slate-100">{project.technicalContactName || nameOf(owner)}</div>
                  </div>
                </div>
                {project.technicalContactPhone && (
                  <div className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-brand-700 shadow-sm dark:bg-slate-900 dark:text-brand-300">
                    <Phone size={13} /> {project.technicalContactPhone}
                  </div>
                )}
              </div>
            )}

            {/* Prominent hervorgehobenes Stunden-Tracking */}
            <div className="rounded-2xl border border-brand-200/80 bg-gradient-to-br from-brand-50/80 to-white p-4 shadow-sm dark:border-brand-800/50 dark:from-brand-950/40 dark:to-slate-900">
              <div className="mb-2 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-brand-700 dark:text-brand-300">
                  <Clock size={14} /> Stunden-Tracking (Projektgesamt)
                </span>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {activeAssigns.length} aktive SHK{activeAssigns.length === 1 ? '' : 's'}
                </span>
              </div>
              <div className="mb-3 grid grid-cols-3 gap-3 text-center">
                <div className="rounded-xl bg-white/90 p-2.5 shadow-sm dark:bg-slate-800/80">
                  <div className="text-[11px] font-semibold uppercase text-slate-400">Kontingent Std./Monat</div>
                  <div className="mt-0.5 text-lg font-extrabold text-brand-700 dark:text-brand-300">{totalContingent} Std.</div>
                </div>
                <div className="rounded-xl bg-white/90 p-2.5 shadow-sm dark:bg-slate-800/80">
                  <div className="text-[11px] font-semibold uppercase text-slate-400">Geleistet Gesamt</div>
                  <div className="mt-0.5 text-lg font-extrabold text-slate-900 dark:text-slate-100">{totalLogged} Std.</div>
                </div>
                <div className="rounded-xl bg-white/90 p-2.5 shadow-sm dark:bg-slate-800/80">
                  <div className="text-[11px] font-semibold uppercase text-slate-400">Budget / Geschätzt</div>
                  <div className="mt-0.5 text-lg font-extrabold text-slate-600 dark:text-slate-300">{project.estimated_hours} Std.</div>
                </div>
              </div>
              <ProgressBar ratio={Math.min(1, totalLogged / Math.max(1, project.estimated_hours))} />
            </div>

            <div className="flex flex-wrap gap-1.5">{project.skills.map((s) => <SkillTag key={s}>{s}</SkillTag>)}</div>

            {(viewRole === 'admin' || viewRole === 'arzt') && project.status === 'beantragt' && (
              <WarningBanner w={deadlineWarning(db, project.deadline)} />
            )}

            {project.status !== 'beantragt' && project.status !== 'abgelehnt' && project.milestone_target > 0 && (
              canEdit ? (
                <div className="rounded-2xl bg-brand-50/60 p-4 dark:bg-brand-950/30">
                  <MilestoneQuickControls project={project} />
                </div>
              ) : (
                <div><span className="label">Meilenstein</span><MilestoneBar project={project} /></div>
              )
            )}

            {viewRole === 'shk' && mine?.status === 'aktiv' && <AssignmentControls a={mine} project={project} />}

            {sops.length > 0 && canSeeSop && (
              <div>
                <span className="label flex items-center gap-1"><BookOpen size={12} /> Verknüpfte SOPs</span>
                <div className="space-y-2">
                  {sops.map((w) => w && (
                    <div key={w.id} className="rounded-xl border border-slate-200 dark:border-slate-700">
                      <button className="flex w-full items-center justify-between p-3 text-left text-sm font-semibold" onClick={() => setOpenSop(openSop === w.id ? null : w.id)}>
                        {w.title}<span className="text-xs font-normal text-slate-400">{w.category}</span>
                      </button>
                      {openSop === w.id && (
                        <div className="border-t border-slate-100 p-3 text-sm dark:border-slate-800">
                          <p className="mb-2 text-slate-500 dark:text-slate-400">{w.summary}</p>
                          <ol className="list-decimal space-y-1 pl-5">{w.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
                          {w.links.map((l) => (
                            <a key={l.url} href={l.url} target="_blank" rel="noreferrer" className="mt-2 flex items-center gap-1 text-xs font-semibold text-brand-700 hover:underline dark:text-brand-400">
                              <ExternalLink size={12} /> {l.label}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(viewRole === 'admin' || isOwner) && assigns.length > 0 && (
              <div>
                <span className="label">Team & Einzelstunden</span>
                <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-700">
                  {assigns.map((a) => {
                    const s = db.profiles.find((p) => p.id === a.shk_id);
                    return (
                      <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
                        <div>
                          <b>{nameOf(s)}</b>
                          <span className={`badge ml-2 ${a.status === 'aktiv' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' : a.status === 'beworben' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}>
                            {a.status === 'aktiv' ? 'Zugewiesen' : a.status === 'beworben' ? 'Bewerbung' : 'Abgelehnt'}
                          </span>
                          {a.status === 'aktiv' && (
                            <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">
                              Kontingent: <b>{a.hours_month} Std./Monat</b> · Geleistet: <b>{a.hours_total} Std.</b>
                            </span>
                          )}
                        </div>
                        {viewRole === 'admin' && a.status === 'beworben' && (
                          <div className="flex gap-1.5">
                            <button className="btn btn-primary btn-sm" onClick={() => confirm(a)}><CheckCircle2 size={13} /> Bestätigen</button>
                            <button className="btn btn-danger btn-sm" onClick={() => save('assignments', { ...a, status: 'abgelehnt' })}><XCircle size={13} /> Ablehnen</button>
                          </div>
                        )}
                        {viewRole === 'admin' && a.status === 'aktiv' && (
                          <button className="btn btn-danger btn-sm" onClick={() => remove('assignments', a.id)}>Entfernen</button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {viewRole === 'admin' && (project.status === 'offen' || project.status === 'aktiv' || project.status === 'review' || project.status === 'beantragt') && (
              <MatchPanel project={project} />
            )}
          </>
        )}

        <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
          {viewRole === 'shk' && project.status === 'offen' && !mine && <button className="btn btn-primary" onClick={apply}>Auf Projekt bewerben</button>}
          {viewRole === 'shk' && mine?.status === 'beworben' && (
            <button className="btn btn-ghost" onClick={() => { remove('assignments', mine.id); notify('Bewerbung zurückgezogen.'); }}>Bewerbung zurückziehen</button>
          )}
          {viewRole === 'shk' && mine?.status === 'aktiv' && project.status === 'aktiv' && (
            <button className="btn btn-ghost" onClick={() => setStatus('review')}>Zur Prüfung (Review) melden</button>
          )}
          {viewRole === 'admin' && project.status === 'beantragt' && (
            <>
              <button className="btn btn-danger" onClick={() => setStatus('abgelehnt')}>Ablehnen</button>
              <button className="btn btn-primary" onClick={() => setStatus('offen')}>Freigeben (Marktplatz)</button>
            </>
          )}
          {isOwner && project.status === 'abgelehnt' && (
            <button className="btn btn-primary" onClick={() => setStatus('beantragt')}><RotateCcw size={14} /> Erneut zur Freigabe einreichen</button>
          )}
          {(viewRole === 'admin' || isOwner) && project.status === 'aktiv' && (
            <>
              {viewRole === 'admin' && <button className="btn btn-ghost" onClick={() => setStatus('offen')}>Zurück in den Marktplatz</button>}
              <button className="btn btn-ghost" onClick={() => setStatus('review')}>Auf Review setzen</button>
              <button className="btn btn-primary" onClick={() => setStatus('abgeschlossen')}><CheckCircle2 size={14} /> Abschließen</button>
            </>
          )}
          {(viewRole === 'admin' || isOwner) && project.status === 'review' && (
            <>
              <button className="btn btn-ghost" onClick={() => setStatus('aktiv')}>Zurück in Arbeit</button>
              <button className="btn btn-primary" onClick={() => setStatus('abgeschlossen')}><CheckCircle2 size={14} /> Review bestätigen & Abschließen</button>
            </>
          )}
          {(viewRole === 'admin' || isOwner) && project.status === 'abgeschlossen' && (
            <button className="btn btn-ghost" onClick={() => setStatus('aktiv')}><RotateCcw size={14} /> Wieder öffnen (In Arbeit)</button>
          )}
          {(viewRole === 'admin' || (isOwner && (project.status === 'beantragt' || project.status === 'abgelehnt'))) && (
            <button className="btn btn-danger" onClick={del}><Trash2 size={14} /> Löschen</button>
          )}
        </div>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Seite
// ---------------------------------------------------------------------------
export default function ProjectsPage() {
  const { db } = useApp();
  const { actor, viewRole } = useView();
  const [open, setOpen] = useState<string | null>(null);
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [creating, setCreating] = useState(false);
  const [tab, setTab] = useState<'mine' | 'market'>('mine');
  const [filter, setFilter] = useState<ProjectStatus | 'alle'>('alle');
  const [q, setQ] = useState('');

  const match = (p: Project) => !q || (p.title + p.skills.join(' ')).toLowerCase().includes(q.toLowerCase());
  let list: Project[] = [];
  if (viewRole === 'shk') {
    const mineIds = db.assignments.filter((a) => a.shk_id === actor.id && a.status !== 'abgelehnt').map((a) => a.project_id);
    list = tab === 'mine'
      ? db.projects.filter((p) => mineIds.includes(p.id))
      : db.projects.filter((p) => p.status === 'offen' && !mineIds.includes(p.id));
  } else if (viewRole === 'arzt') list = db.projects.filter((p) => p.owner_id === actor.id);
  else list = db.projects;
  list = list.filter((p) => (filter === 'alle' || p.status === filter) && match(p))
    .sort((a, b) => a.deadline.localeCompare(b.deadline));

  const title = viewRole === 'shk' ? 'Projekte & Marktplatz' : viewRole === 'arzt' ? 'Meine Projekte' : 'Alle Projekte';

  return (
    <>
      <PageHeader title={title}
        subtitle={viewRole === 'shk' ? 'Melde dich im Collaboration Space auf offene Projekte.' : viewRole === 'arzt' ? 'Klicke auf ein Projekt, um Details, Meilensteine oder SOPs zu bearbeiten.' : undefined}
        actions={viewRole !== 'shk' && <button className="btn btn-primary" onClick={() => setCreating(true)}><Plus size={16} /> Neues Projekt</button>} />
      <div className="mb-5 flex flex-wrap items-center gap-2.5">
        {viewRole === 'shk' && (
          <div className="flex rounded-xl bg-white p-1 text-sm font-semibold shadow-sm dark:bg-slate-900">
            {([['mine', 'Meine Projekte'], ['market', 'Marktplatz']] as const).map(([k, l]) => (
              <button key={k} onClick={() => setTab(k)} className={`rounded-lg px-3 py-1.5 ${tab === k ? 'bg-brand-600 text-white' : 'text-slate-500 dark:text-slate-400'}`}>{l}</button>
            ))}
          </div>
        )}
        {viewRole !== 'shk' && (
          <select className="input !w-auto" value={filter} onChange={(e) => setFilter(e.target.value as ProjectStatus | 'alle')} aria-label="Statusfilter">
            <option value="alle">Alle Status</option>
            {(Object.keys(STATUS_LABEL) as ProjectStatus[]).map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
        )}
        <input className="input !w-full sm:!w-72" placeholder="Suchen (Titel, Skill)…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {list.length === 0 ? (
        <Empty text={viewRole === 'shk' && tab === 'market' ? 'Aktuell keine offenen Projekte.' : 'Keine Projekte gefunden.'} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {list.map((p) => (
            <ProjectCard
              key={p.id}
              project={p}
              onOpen={() => setOpen(p.id)}
              onEdit={() => setEditProject(p)}
              extra={viewRole === 'shk' && db.assignments.find((a) => a.project_id === p.id && a.shk_id === actor.id)?.status === 'beworben'
                ? <span className="badge bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">Bewerbung läuft</span> : undefined}
            />
          ))}
        </div>
      )}
      {open && <ProjectDetail projectId={open} onClose={() => setOpen(null)} />}
      {editProject && <ProjectForm initial={editProject} onClose={() => setEditProject(null)} />}
      {creating && <ProjectForm onClose={() => setCreating(false)} />}
    </>
  );
}
