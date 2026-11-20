import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle, ArrowLeft, ArrowRight, Calendar, Clock, Download, FolderCheck, Hourglass, Inbox, Kanban, MessageSquare, Pencil, Phone, Plus, Target, Timer, UserCheck, Users,
} from 'lucide-react';
import { useApp } from '../lib/app';
import { useView } from '../lib/view';
import { ampel, daysBetween, exportHoursCsv, fmtDate, milestoneInfo, nameOf, todayIso } from '../lib/logic';
import { ABSENCE_LABEL, type Project, type ProjectStatus } from '../types';
import { AmpelDot, Empty, MilestoneBar, PageHeader, ProgressBar, SkillTag, Stat } from '../components/ui';
import { PriorityBadge, ProjectCard, ProjectDetail, ProjectForm, StatusBadge } from './Projects';

function ShkDashboard() {
  const { db } = useApp();
  const { actor } = useView();
  const [open, setOpen] = useState<string | null>(null);
  const active = db.assignments.filter((a) => a.shk_id === actor.id && a.status === 'aktiv');
  const booked = active.reduce((s, a) => s + a.hours_month, 0);
  const ratio = actor.contract_hours ? Math.min(1, booked / actor.contract_hours) : 0;
  const absences = db.absences.filter((a) => a.shk_id === actor.id && a.end_date >= todayIso()).sort((a, b) => a.start_date.localeCompare(b.start_date));
  const openMarket = db.projects.filter((p) => p.status === 'offen').length;

  return (
    <>
      <PageHeader title={`Hallo ${actor.full_name?.split(' ')[0] ?? actor.username} 👋`} subtitle="Deine Kapazität und aktiven Projekte" />
      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <Stat label="Vertragsstunden" value={`${actor.contract_hours} Std.`} hint="pro Monat" icon={<Clock size={16} />} />
        <Stat label="Gebucht" value={`${booked} Std.`} hint={`in ${active.length} aktiven Projekten`} icon={<Hourglass size={16} />} />
        <Stat label="Freie Restkapazität" value={<span className="text-brand-600 dark:text-brand-400">{actor.free_hours} Std.</span>} hint="pro Monat" icon={<Timer size={16} />} />
      </div>
      <div className="card mb-5 p-4">
        <div className="mb-2 flex justify-between text-sm font-semibold"><span>Auslastung</span><span>{Math.round(ratio * 100)} %</span></div>
        <ProgressBar ratio={ratio} tone={ratio > 0.9 ? 'red' : ratio > 0.7 ? 'amber' : 'brand'} />
        <div className="mt-3 flex flex-wrap gap-1.5">
          {actor.skills.length ? actor.skills.map((s) => <SkillTag key={s}>{s}</SkillTag>) : <Link to="/profil" className="text-sm font-semibold text-brand-700 dark:text-brand-400">Skills im Profil ergänzen →</Link>}
        </div>
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h2 className="mb-3 font-bold text-slate-900 dark:text-slate-100">Meine aktiven Projekte</h2>
          {active.length === 0 ? <Empty text={`Noch keine Projekte. ${openMarket} offene Projekte im Marktplatz.`} /> : (
            <div className="grid gap-4 md:grid-cols-2">
              {active.map((a) => { const p = db.projects.find((x) => x.id === a.project_id); return p ? <ProjectCard key={a.id} project={p} onOpen={() => setOpen(p.id)} /> : null; })}
            </div>
          )}
        </div>
        <div>
          <h2 className="mb-3 font-bold text-slate-900 dark:text-slate-100">Kommende Abwesenheiten</h2>
          <div className="space-y-2">
            {absences.slice(0, 4).map((a) => (
              <div key={a.id} className="card p-3 text-sm">
                <b>{ABSENCE_LABEL[a.type]}</b> · {a.available_pct}% verfügbar
                <div className="text-xs text-slate-500 dark:text-slate-400">{fmtDate(a.start_date)} – {fmtDate(a.end_date)}</div>
              </div>
            ))}
            {absences.length === 0 && <Empty text="Keine Einträge." />}
          </div>
        </div>
      </div>
      {open && <ProjectDetail projectId={open} onClose={() => setOpen(null)} />}
    </>
  );
}

function ArztDashboard() {
  const { db } = useApp();
  const { actor } = useView();
  const [open, setOpen] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const mine = db.projects.filter((p) => p.owner_id === actor.id);
  const running = mine.filter((p) => p.status === 'aktiv' || p.status === 'review');
  const shks = db.profiles.filter((p) => p.role === 'shk').sort((a, b) => b.free_hours - a.free_hours);
  const totalFree = shks.reduce((s, p) => s + p.free_hours, 0);

  return (
    <>
      <PageHeader
        title={`Willkommen, ${actor.full_name ?? actor.username}`}
        subtitle="Fortschritt deiner Projekte in Echtzeit · Klicke auf ein Projekt zum Öffnen & Bearbeiten"
        actions={<button className="btn btn-primary" onClick={() => setCreating(true)}><Plus size={16} /> Neues Projekt</button>}
      />
      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <Stat label="Laufende Projekte" value={running.length} icon={<FolderCheck size={16} />} />
        <Stat label="Zur Freigabe / offen" value={mine.filter((p) => p.status === 'beantragt' || p.status === 'offen').length} icon={<Inbox size={16} />} />
        <Stat label="Freie SHK-Kapazität" value={`${totalFree} Std.`} hint="im Team pro Monat" icon={<Users size={16} />} />
      </div>
      <h2 className="mb-3 font-bold text-slate-900 dark:text-slate-100">Meine Projekte & Fortschritt</h2>
      {mine.length === 0 ? <Empty text="Du hast noch keine Projekte angelegt." /> : (
        <div className="mb-6 grid gap-3">
          {mine.map((p) => (
            <div key={p.id} className="card cursor-pointer p-4 transition hover:shadow-md" onClick={() => setOpen(p.id)}>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <b className="text-slate-900 dark:text-slate-100">{p.title}</b>
                  <PriorityBadge p={p.priority ?? 'Mittel'} />
                  <StatusBadge s={p.status} />
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                  {(p.comments?.length ?? 0) > 0 && (
                    <span className="inline-flex items-center gap-1 font-semibold text-brand-700 dark:text-brand-300">
                      <MessageSquare size={12} /> {p.comments?.length}
                    </span>
                  )}
                  <span>Deadline {fmtDate(p.deadline)}</span>
                  <span className="inline-flex items-center gap-1 font-semibold text-brand-700 dark:text-brand-400">
                    <Pencil size={12} /> Bearbeiten
                  </span>
                </div>
              </div>
              {(p.status === 'aktiv' || p.status === 'review' || p.status === 'abgeschlossen') && p.milestone_target > 0
                ? <MilestoneBar project={p} />
                : <span className="text-sm text-slate-500 dark:text-slate-400">Status: {p.status === 'beantragt' ? 'wartet auf Freigabe' : p.status}</span>}
            </div>
          ))}
        </div>
      )}
      <h2 className="mb-3 font-bold text-slate-900 dark:text-slate-100">Verfügbarkeit SHK-Team</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {shks.slice(0, 6).map((s) => { const a = ampel(db, s); return (
          <div key={s.id} className="card flex items-center justify-between p-3 text-sm">
            <div><b>{nameOf(s)}</b><div className="text-xs text-slate-500 dark:text-slate-400">Freie Kapazität: {s.free_hours} Std./Monat</div></div>
            <AmpelDot level={a.level} label={a.label} showLabel={false} />
          </div>); })}
      </div>
      {open && <ProjectDetail projectId={open} onClose={() => setOpen(null)} />}
      {creating && <ProjectForm onClose={() => setCreating(false)} />}
    </>
  );
}

const KANBAN_COLS: {
  key: 'backlog' | 'aktiv' | 'review' | 'fertig';
  label: string;
  targetStatus: ProjectStatus;
  match: (s: ProjectStatus) => boolean;
  tone: string;
}[] = [
  {
    key: 'backlog',
    label: 'BACKLOG',
    targetStatus: 'offen',
    match: (s) => s === 'beantragt' || s === 'offen',
    tone: 'border-t-sky-500',
  },
  {
    key: 'aktiv',
    label: 'IN ARBEIT',
    targetStatus: 'aktiv',
    match: (s) => s === 'aktiv',
    tone: 'border-t-emerald-500',
  },
  {
    key: 'review',
    label: 'AUSSTEHEND (Review)',
    targetStatus: 'review',
    match: (s) => s === 'review',
    tone: 'border-t-purple-500',
  },
  {
    key: 'fertig',
    label: 'FERTIG',
    targetStatus: 'abgeschlossen',
    match: (s) => s === 'abgeschlossen',
    tone: 'border-t-slate-400',
  },
];

function AdminDashboard() {
  const { db, save, notify } = useApp();
  const { actor } = useView();
  const [open, setOpen] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [pilotMode, setPilotMode] = useState<boolean>(false);
  const [personFilter, setPersonFilter] = useState<string>('all'); // 'all' | 'mine' | shkId

  const pending = db.projects.filter((p) => p.status === 'beantragt');
  const applications = db.assignments.filter((a) => a.status === 'beworben');
  const active = db.projects.filter((p) => p.status === 'aktiv' || p.status === 'review');
  const shks = db.profiles.filter((p) => p.role === 'shk');
  const contract = shks.reduce((s, p) => s + p.contract_hours, 0);
  const free = shks.reduce((s, p) => s + p.free_hours, 0);
  const util = contract ? Math.round(((contract - free) / contract) * 100) : 0;
  const bottlenecks = db.projects.filter((p) => {
    if (p.status !== 'aktiv' && p.status !== 'offen') return false;
    const m = milestoneInfo(p);
    const soon = daysBetween(todayIso(), p.deadline) <= 21;
    return m.state === 'risk' || m.state === 'late' || (p.status === 'offen' && soon);
  });

  const filteredProjects = db.projects.filter((p) => {
    if (p.status === 'abgelehnt') return false;
    if (personFilter === 'all') return true;
    if (personFilter === 'mine') {
      const myAssigned = db.assignments.some((a) => a.project_id === p.id && a.shk_id === actor.id && a.status !== 'abgelehnt');
      return p.owner_id === actor.id || myAssigned;
    }
    return (
      p.owner_id === personFilter ||
      db.assignments.some((a) => a.project_id === p.id && a.shk_id === personFilter && a.status === 'aktiv')
    );
  });

  const moveKanban = async (project: Project, targetStatus: ProjectStatus) => {
    await save('projects', { ...project, status: targetStatus });
    notify(`Projekt verschoben nach: ${KANBAN_COLS.find((c) => c.targetStatus === targetStatus)?.label ?? targetStatus}`);
  };

  return (
    <>
      <PageHeader
        title="Master-Dashboard"
        subtitle={
          pilotMode
            ? 'Fokussierte Projekt- & Kanban-Übersicht (Pilot-Modus aktiv)'
            : 'Gesamtübersicht über Projekte, Kanban-Board, Engpässe und Auslastung'
        }
        actions={
          <>
            <button
              type="button"
              onClick={() => setPilotMode((v) => !v)}
              className={`btn ${
                pilotMode
                  ? 'bg-brand-600 text-white shadow-sm hover:bg-brand-700'
                  : 'btn-ghost'
              }`}
              title="Blende nicht-projektbezogene Kacheln (SHK-Auslastung, CSV-Export) für eine cleane Präsentation ein/aus"
            >
              <Target size={16} /> 🎯 Reduzierte Pilot-Ansicht {pilotMode ? '(Aktiv)' : ''}
            </button>
            {!pilotMode && (
              <button className="btn btn-ghost" onClick={() => exportHoursCsv(db)}>
                <Download size={16} /> CSV Stundenabrechnung
              </button>
            )}
            <button className="btn btn-primary" onClick={() => setCreating(true)}>
              <Plus size={16} /> Neues Projekt
            </button>
          </>
        }
      />

      <div className={`mb-5 grid grid-cols-2 gap-4 ${pilotMode ? 'lg:grid-cols-3' : 'lg:grid-cols-4'}`}>
        <Stat label="Aktive Projekte" value={active.length} icon={<FolderCheck size={16} />} />
        <Stat label="Zur Freigabe" value={<Link to="/freigaben" className={pending.length ? 'text-amber-600 dark:text-amber-400' : ''}>{pending.length}</Link>} icon={<Inbox size={16} />} />
        <Stat label="Bewerbungen" value={applications.length} icon={<Users size={16} />} />
        {!pilotMode && (
          <Stat label="Ø Auslastung" value={`${util} %`} hint={`${free} Std. frei`} icon={<Timer size={16} />} />
        )}
      </div>

      {/* Kanban-Board mit 4 Spalten & Personen-Filter */}
      <div className="mb-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 font-bold text-slate-900 dark:text-slate-100">
            <Kanban size={18} className="text-brand-600 dark:text-brand-400" /> Projekt-Kanban-Board
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-xl bg-white p-1 text-xs font-semibold shadow-sm dark:bg-slate-900">
              <button
                type="button"
                onClick={() => setPersonFilter('all')}
                className={`rounded-lg px-3 py-1.5 transition ${personFilter === 'all' ? 'bg-brand-600 text-white' : 'text-slate-500 dark:text-slate-400'}`}
              >
                Alle SHKs ({db.projects.filter((p) => p.status !== 'abgelehnt').length})
              </button>
              <button
                type="button"
                onClick={() => setPersonFilter('mine')}
                className={`rounded-lg px-3 py-1.5 transition ${personFilter === 'mine' ? 'bg-brand-600 text-white' : 'text-slate-500 dark:text-slate-400'}`}
              >
                Meine Projekte
              </button>
            </div>
            <select
              className="input !w-auto !py-1.5 text-xs"
              value={personFilter === 'all' || personFilter === 'mine' ? '' : personFilter}
              onChange={(e) => setPersonFilter(e.target.value || 'all')}
              aria-label="Nach Person filtern"
            >
              <option value="">Nach SHK / Arzt filtern…</option>
              <optgroup label="SHK-Team">
                {shks.map((s) => (
                  <option key={s.id} value={s.id}>{nameOf(s)}</option>
                ))}
              </optgroup>
              <optgroup label="Projektleiter (Ärzte)">
                {db.profiles.filter((p) => p.role === 'arzt').map((a) => (
                  <option key={a.id} value={a.id}>{nameOf(a)}</option>
                ))}
              </optgroup>
            </select>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {KANBAN_COLS.map((col, colIdx) => {
            const colProjects = filteredProjects.filter((p) => col.match(p.status));
            return (
              <div
                key={col.key}
                className={`flex flex-col rounded-2xl border border-slate-200/80 border-t-4 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-900/50 ${col.tone}`}
              >
                <div className="mb-3 flex items-center justify-between px-1">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                    {col.label}
                  </span>
                  <span className="badge bg-white text-slate-700 shadow-sm dark:bg-slate-800 dark:text-slate-200">
                    {colProjects.length}
                  </span>
                </div>
                <div className="flex flex-1 flex-col gap-2.5">
                  {colProjects.length === 0 ? (
                    <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-400 dark:border-slate-800">
                      Keine Projekte
                    </div>
                  ) : (
                    colProjects.map((p) => {
                      const owner = db.profiles.find((u) => u.id === p.owner_id);
                      const projAssigns = db.assignments.filter((a) => a.project_id === p.id && a.status === 'aktiv');
                      const loggedHours = projAssigns.reduce((s, a) => s + a.hours_total, 0);
                      const monthlyHours = projAssigns.reduce((s, a) => s + a.hours_month, 0);
                      const commentCount = p.comments?.length ?? 0;

                      return (
                        <div
                          key={p.id}
                          onClick={() => setOpen(p.id)}
                          className="card cursor-pointer p-3.5 transition hover:-translate-y-0.5 hover:border-brand-500/40 hover:shadow-md"
                        >
                          <div className="mb-1.5 flex items-start justify-between gap-1.5">
                            <span className="text-sm font-bold leading-snug text-slate-900 dark:text-slate-100">
                              {p.title}
                            </span>
                            <PriorityBadge p={p.priority ?? 'Mittel'} />
                          </div>
                          <div className="mb-2 text-xs text-slate-500 dark:text-slate-400">
                            {nameOf(owner)}
                            {p.technicalContactPhone && (
                              <span className="ml-1.5 inline-flex items-center gap-0.5 text-slate-400">
                                · <Phone size={10} /> {p.technicalContactPhone}
                              </span>
                            )}
                          </div>

                          {/* Stunden-Tracking kompakt auf der Karte */}
                          <div className="mb-2 rounded-lg bg-slate-50 px-2.5 py-1.5 text-[11px] dark:bg-slate-800/70">
                            <div className="flex justify-between font-semibold text-slate-700 dark:text-slate-300">
                              <span>Geleistet: {loggedHours} / {p.estimated_hours} Std.</span>
                              <span className="text-brand-700 dark:text-brand-300">{monthlyHours} Std./Mon.</span>
                            </div>
                          </div>

                          {p.milestone_target > 0 && p.status !== 'beantragt' && (
                            <div className="mb-2">
                              <MilestoneBar project={p} compact />
                            </div>
                          )}

                          <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2 text-[11px] text-slate-400 dark:border-slate-800">
                            <span className="flex items-center gap-2">
                              <span className="flex items-center gap-1"><Calendar size={11} /> {fmtDate(p.deadline)}</span>
                              {commentCount > 0 && (
                                <span className="flex items-center gap-0.5 font-semibold text-brand-600 dark:text-brand-400">
                                  <MessageSquare size={11} /> {commentCount}
                                </span>
                              )}
                            </span>
                            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                              {colIdx > 0 && (
                                <button
                                  type="button"
                                  onClick={() => moveKanban(p, KANBAN_COLS[colIdx - 1].targetStatus)}
                                  className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                                  title={`Verschieben nach ${KANBAN_COLS[colIdx - 1].label}`}
                                >
                                  <ArrowLeft size={12} />
                                </button>
                              )}
                              {colIdx < KANBAN_COLS.length - 1 && (
                                <button
                                  type="button"
                                  onClick={() => moveKanban(p, KANBAN_COLS[colIdx + 1].targetStatus)}
                                  className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                                  title={`Verschieben nach ${KANBAN_COLS[colIdx + 1].label}`}
                                >
                                  <ArrowRight size={12} />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Nicht-projektbezogene Kacheln: im Pilot-Modus ausgeblendet, jederzeit per Klick einblendbar */}
      {!pilotMode && (
        <div className="grid gap-5 lg:grid-cols-2">
          <div>
            <h2 className="mb-3 flex items-center gap-2 font-bold text-slate-900 dark:text-slate-100"><AlertTriangle size={16} className="text-amber-500" /> Engpässe</h2>
            {bottlenecks.length === 0 ? <Empty text="Keine Engpässe erkannt." /> : (
              <div className="space-y-3">
                {bottlenecks.map((p) => (
                  <div key={p.id} className="card cursor-pointer p-4 hover:shadow-md" onClick={() => setOpen(p.id)}>
                    <div className="mb-2 flex justify-between gap-2"><b>{p.title}</b><span className="text-xs text-slate-500 dark:text-slate-400">{fmtDate(p.deadline)}</span></div>
                    {p.status === 'aktiv' ? <MilestoneBar project={p} /> : <span className="badge bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300">Noch keine Zuweisung – Deadline in {daysBetween(todayIso(), p.deadline)} Tagen</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <h2 className="mb-3 font-bold text-slate-900 dark:text-slate-100">SHK-Auslastung</h2>
            <div className="card divide-y divide-slate-100 dark:divide-slate-800">
              {shks.map((s) => {
                const used = s.contract_hours - s.free_hours;
                const r = s.contract_hours ? used / s.contract_hours : 0;
                return (
                  <div key={s.id} className="p-3">
                    <div className="mb-1.5 flex justify-between text-sm"><b>{nameOf(s)}</b><span className="text-slate-500 dark:text-slate-400">{used}/{s.contract_hours} Std.</span></div>
                    <ProgressBar ratio={Math.min(1, r)} tone={r > 0.9 ? 'red' : r > 0.7 ? 'amber' : 'brand'} />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
      {open && <ProjectDetail projectId={open} onClose={() => setOpen(null)} />}
      {creating && <ProjectForm onClose={() => setCreating(false)} />}
    </>
  );
}

export default function Dashboard() {
  const { viewRole } = useView();
  if (viewRole === 'shk') return <ShkDashboard />;
  if (viewRole === 'arzt') return <ArztDashboard />;
  return <AdminDashboard />;
}
