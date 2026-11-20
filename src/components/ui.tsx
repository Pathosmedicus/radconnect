import React, { useEffect, useState } from 'react';
import { AlertTriangle, Check, TriangleAlert, X } from 'lucide-react';
import { type Ampel, type Warning, milestoneInfo, scheduleLabel } from '../lib/logic';
import type { Project } from '../types';

export function Modal({
  title, onClose, children, wide,
}: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 backdrop-blur-sm sm:items-center sm:p-4 dark:bg-black/70" onMouseDown={onClose}>
      <div
        className={`animate-pop flex max-h-[92vh] w-full flex-col rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl dark:border dark:border-slate-800 dark:bg-slate-900 ${wide ? 'sm:max-w-3xl' : 'sm:max-w-lg'}`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Schließen">
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
      </div>
      <div className="flex flex-wrap gap-2">{actions}</div>
    </div>
  );
}

export function SkillTag({ children, active, onClick, onRemove }: {
  children: React.ReactNode; active?: boolean; onClick?: () => void; onRemove?: () => void;
}) {
  const cls = `badge ${
    active
      ? 'bg-brand-600 text-white'
      : 'bg-brand-50 text-brand-800 ring-1 ring-brand-200/60 dark:bg-brand-900/50 dark:text-brand-200 dark:ring-brand-700/50'
  } ${onClick ? 'cursor-pointer hover:opacity-80' : ''}`;
  return (
    <span className={cls} onClick={onClick}>
      {children}
      {onRemove && (
        <button onClick={(e) => { e.stopPropagation(); onRemove(); }} className="-mr-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10" aria-label="Entfernen">
          <X size={12} />
        </button>
      )}
    </span>
  );
}

export function TagInput({ value, onChange, suggestions, placeholder }: {
  value: string[]; onChange: (v: string[]) => void; suggestions: string[]; placeholder?: string;
}) {
  const [text, setText] = useState('');
  const add = (s: string) => {
    const v = s.trim();
    if (v && !value.includes(v)) onChange([...value, v]);
    setText('');
  };
  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-1.5">
        {value.map((s) => <SkillTag key={s} onRemove={() => onChange(value.filter((x) => x !== s))}>{s}</SkillTag>)}
        {value.length === 0 && <span className="text-xs text-slate-400">Noch keine Tags</span>}
      </div>
      <input
        className="input" value={text} placeholder={placeholder ?? 'Tag eingeben + Enter'}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(text); } }}
      />
      <div className="mt-2 flex flex-wrap gap-1.5">
        {suggestions.filter((s) => !value.includes(s)).map((s) => (
          <button type="button" key={s} onClick={() => add(s)} className="badge bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700">+ {s}</button>
        ))}
      </div>
    </div>
  );
}

export function ProgressBar({ ratio, expected, tone = 'brand' }: { ratio: number; expected?: number; tone?: 'brand' | 'amber' | 'red' | 'green' }) {
  const color = { brand: 'bg-brand-500', amber: 'bg-amber-500', red: 'bg-red-500', green: 'bg-emerald-500' }[tone];
  return (
    <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
      <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${Math.round(ratio * 100)}%` }} />
      {expected !== undefined && (
        <div className="absolute top-0 h-full w-0.5 bg-slate-700/60 dark:bg-slate-300/60" style={{ left: `${Math.round(expected * 100)}%` }} title="Soll-Fortschritt" />
      )}
    </div>
  );
}

export function MilestoneBar({ project, compact }: { project: Project; compact?: boolean }) {
  const m = milestoneInfo(project);
  const tone = m.state === 'done' ? 'green' : m.state === 'risk' ? 'red' : m.state === 'late' ? 'amber' : 'brand';
  const badge = {
    done: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 dark:ring-1 dark:ring-emerald-700/50',
    ok: 'bg-brand-100 text-brand-800 dark:bg-brand-900/50 dark:text-brand-200 dark:ring-1 dark:ring-brand-700/50',
    late: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 dark:ring-1 dark:ring-amber-700/50',
    risk: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300 dark:ring-1 dark:ring-red-700/50',
  }[m.state];
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2 text-xs">
        <span className="font-semibold text-slate-700 dark:text-slate-300">
          {project.milestone_current} / {project.milestone_target} {project.milestone_unit}
        </span>
        <span className={`badge ${badge}`}>{scheduleLabel[m.state]}</span>
      </div>
      <ProgressBar ratio={m.ratio} expected={compact ? undefined : m.expected} tone={tone} />
    </div>
  );
}

export function AmpelDot({ level, label, showLabel = true }: { level: Ampel; label: string; showLabel?: boolean }) {
  const c = { gruen: 'bg-emerald-500', gelb: 'bg-amber-400', rot: 'bg-red-500' }[level];
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300" title={label}>
      <span className={`h-2.5 w-2.5 rounded-full ${c} shadow-[0_0_0_3px] shadow-black/5 dark:shadow-white/10`} />
      {showLabel && label}
    </span>
  );
}

export function WarningBanner({ w }: { w: Warning }) {
  if (w.level === 'none') return null;
  const red = w.level === 'red';
  return (
    <div className={`flex gap-3 rounded-xl border p-3 text-sm ${red ? 'border-red-200 bg-red-50 text-red-800 dark:border-red-800/60 dark:bg-red-950/40 dark:text-red-200' : 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-200'}`} role="alert">
      {red ? <TriangleAlert className="mt-0.5 shrink-0" size={18} /> : <AlertTriangle className="mt-0.5 shrink-0" size={18} />}
      <div>
        <p className="font-semibold">{w.message}</p>
        {w.blocked.length > 1 && (
          <p className="mt-0.5 text-xs opacity-80">Betroffen: {w.blocked.map((b) => b.full_name || b.username).join(', ')}</p>
        )}
      </div>
    </div>
  );
}

export function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-400">
      {text}
    </div>
  );
}

export function Stat({ label, value, hint, icon }: { label: string; value: React.ReactNode; hint?: string; icon?: React.ReactNode }) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between text-slate-400">
        <span className="text-xs font-semibold uppercase tracking-wide">{label}</span>
        {icon}
      </div>
      <div className="mt-2 text-3xl font-extrabold text-slate-900 dark:text-slate-100">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{hint}</div>}
    </div>
  );
}

export const Ok = () => <Check size={14} />;
