import React from 'react';
import { useApp } from '../lib/app';
import { useView } from '../lib/view';
import { ampel, blockedNow, daysBetween, fmtDate, nameOf, addDays, todayIso } from '../lib/logic';
import { ABSENCE_LABEL } from '../types';
import { AmpelDot, PageHeader, ProgressBar, SkillTag } from '../components/ui';

/** Arzt: neutrale Übersicht (keine Überwachung). Admin: zusätzlich Auslastung + 12-Wochen-Forecast. */
export default function Capacity() {
  const { db } = useApp();
  const { viewRole } = useView();
  const admin = viewRole === 'admin';
  const shks = db.profiles.filter((p) => p.role === 'shk').sort((a, b) => b.free_hours - a.free_hours);

  const weeks = Array.from({ length: 12 }, (_, i) => addDays(todayIso(), i * 7));
  const cellBlocked = (id: string, w: string) =>
    db.absences.some((a) => a.shk_id === id && a.available_pct < 50 && a.start_date <= addDays(w, 6) && a.end_date >= w);
  const cellPartial = (id: string, w: string) =>
    db.absences.some((a) => a.shk_id === id && a.available_pct >= 50 && a.available_pct < 100 && a.start_date <= addDays(w, 6) && a.end_date >= w);

  return (
    <>
      <PageHeader title={admin ? 'SHK-Team & Kapazitäts-Forecast' : 'Kapazitätsübersicht'}
        subtitle={admin ? 'Auslastung, Skills und Blocker der nächsten 12 Wochen' : 'Freie Kapazität und Skills des SHK-Teams'} />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {shks.map((s) => {
          const a = ampel(db, s);
          const used = s.contract_hours - s.free_hours;
          const now = blockedNow(db, s.id);
          return (
            <div key={s.id} className="card p-4">
              <div className="mb-2 flex items-start justify-between gap-2">
                <div>
                  <div className="font-bold text-slate-900 dark:text-slate-100">{nameOf(s)}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">@{s.username}</div>
                </div>
                <AmpelDot level={a.level} label={a.label} />
              </div>
              <div className="mb-3 text-sm font-semibold text-brand-700 dark:text-brand-400">Freie Kapazität: {s.free_hours} Std./Monat</div>
              {admin && (
                <div className="mb-3">
                  <div className="mb-1 text-xs text-slate-500 dark:text-slate-400">Auslastung {used}/{s.contract_hours} Std.</div>
                  <ProgressBar ratio={s.contract_hours ? Math.min(1, used / s.contract_hours) : 0} tone={used / Math.max(1, s.contract_hours) > 0.9 ? 'red' : 'brand'} />
                </div>
              )}
              <div className="flex flex-wrap gap-1.5">{s.skills.map((k) => <SkillTag key={k}>{k}</SkillTag>)}</div>
              {now && <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">Zurzeit nicht verfügbar bis {fmtDate(now.end_date)}</p>}
            </div>
          );
        })}
      </div>

      {admin && (
        <div className="card mt-6 overflow-x-auto p-4">
          <h2 className="mb-3 font-bold text-slate-900 dark:text-slate-100">Blocker-Forecast (Wochen)</h2>
          <table className="w-full min-w-[640px] text-xs">
            <thead>
              <tr className="text-left text-slate-400">
                <th className="py-1 pr-2">SHK</th>
                {weeks.map((w) => <th key={w} className="px-0.5 text-center font-medium">{fmtDate(w).slice(0, 5)}</th>)}
              </tr>
            </thead>
            <tbody>
              {shks.map((s) => (
                <tr key={s.id}>
                  <td className="whitespace-nowrap py-1 pr-2 font-semibold">{nameOf(s)}</td>
                  {weeks.map((w) => (
                    <td key={w} className="p-0.5">
                      <div className={`h-5 rounded ${cellBlocked(s.id, w) ? 'bg-red-400 dark:bg-red-600/80' : cellPartial(s.id, w) ? 'bg-amber-300 dark:bg-amber-500/80' : 'bg-emerald-100 dark:bg-emerald-950/50'}`} />
                    </td>
                  ))}
                </tr>
              ))}
              <tr>
                <td className="pt-2 pr-2 font-semibold text-slate-500 dark:text-slate-400">% blockiert</td>
                {weeks.map((w) => {
                  const p = Math.round((shks.filter((s) => cellBlocked(s.id, w)).length / Math.max(1, shks.length)) * 100);
                  return <td key={w} className={`pt-2 text-center font-bold ${p > 40 ? 'text-red-600 dark:text-red-400' : 'text-slate-400'}`}>{p}</td>;
                })}
              </tr>
            </tbody>
          </table>
          <p className="mt-3 text-xs text-slate-400">
            Rot = blockiert (&lt; 50 % verfügbar) · Gelb = reduziert · Typen: {Object.values(ABSENCE_LABEL).join(', ')}.
          </p>
        </div>
      )}
    </>
  );
}
