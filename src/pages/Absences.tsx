import React, { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useApp } from '../lib/app';
import { useView } from '../lib/view';
import { fmtDate, todayIso, uid, addDays } from '../lib/logic';
import { ABSENCE_LABEL, type Absence, type AbsenceType, SKILLS } from '../types';
import { Empty, PageHeader, TagInput } from '../components/ui';

export function Absences() {
  const { db, save, remove, notify } = useApp();
  const { actor } = useView();
  const [f, setF] = useState({ type: 'klausur' as AbsenceType, start: todayIso(), end: addDays(todayIso(), 14), mode: 'zero' as 'zero' | 'reduced', hours: 5 });
  const list = db.absences.filter((a) => a.shk_id === actor.id).sort((a, b) => a.start_date.localeCompare(b.start_date));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (f.end < f.start) return notify('Das Enddatum liegt vor dem Startdatum.', 'err');
    const weekly = Math.max(1, actor.contract_hours / 4.3);
    const pct = f.mode === 'zero' ? 0 : Math.min(100, Math.round((f.hours / weekly) * 100));
    const a: Absence = {
      id: uid(), shk_id: actor.id, type: f.type, start_date: f.start, end_date: f.end, available_pct: pct,
      note: f.mode === 'reduced' ? `${f.hours} Std./Woche` : '', created_at: new Date().toISOString(),
    };
    await save('absences', a);
    notify('Eintrag gespeichert.');
  };

  return (
    <>
      <PageHeader title="Klausuren & Urlaub" subtitle="Trage Zeiträume ein, in denen du nicht oder nur eingeschränkt verfügbar bist." />
      <div className="grid gap-5 lg:grid-cols-5">
        <form onSubmit={submit} className="card space-y-3 p-5 lg:col-span-2">
          <div>
            <label className="label" htmlFor="ab-type">Art</label>
            <select id="ab-type" className="input" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value as AbsenceType })}>
              {(Object.keys(ABSENCE_LABEL) as AbsenceType[]).map((t) => <option key={t} value={t}>{ABSENCE_LABEL[t]}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label" htmlFor="ab-s">Von</label><input id="ab-s" type="date" className="input" value={f.start} onChange={(e) => setF({ ...f, start: e.target.value })} required /></div>
            <div><label className="label" htmlFor="ab-e">Bis</label><input id="ab-e" type="date" className="input" value={f.end} onChange={(e) => setF({ ...f, end: e.target.value })} required /></div>
          </div>
          <div>
            <span className="label">Verfügbarkeit</span>
            <div className="grid grid-cols-2 gap-2">
              {([['zero', '0 % verfügbar'], ['reduced', 'Reduzierte Std./Woche']] as const).map(([k, l]) => (
                <button type="button" key={k} onClick={() => setF({ ...f, mode: k })}
                  className={`rounded-xl border px-2 py-2 text-xs font-semibold ${f.mode === k ? 'border-brand-500 bg-brand-50 text-brand-800 dark:bg-brand-950/60 dark:text-brand-200' : 'border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300'}`}>{l}</button>
              ))}
            </div>
            {f.mode === 'reduced' && (
              <input type="number" min={1} max={40} className="input mt-2" value={f.hours} onChange={(e) => setF({ ...f, hours: Number(e.target.value) })} aria-label="Stunden pro Woche" />
            )}
          </div>
          <button className="btn btn-primary w-full">Eintragen</button>
        </form>
        <div className="space-y-2 lg:col-span-3">
          {list.length === 0 && <Empty text="Keine Einträge." />}
          {list.map((a) => (
            <div key={a.id} className="card flex items-center justify-between gap-3 p-4">
              <div>
                <div className="font-semibold">{ABSENCE_LABEL[a.type]} <span className={`badge ml-1 ${a.available_pct < 50 ? 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'}`}>{a.available_pct} % verfügbar</span></div>
                <div className="text-xs text-slate-500 dark:text-slate-400">{fmtDate(a.start_date)} – {fmtDate(a.end_date)} {a.note && `· ${a.note}`}</div>
              </div>
              <button className="btn btn-danger btn-sm" onClick={() => remove('absences', a.id)} aria-label="Löschen"><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

export function Profile() {
  const { save, notify } = useApp();
  const { actor } = useView();
  const [name, setName] = useState(actor.full_name ?? '');
  const [hours, setHours] = useState(actor.contract_hours);
  return (
    <>
      <PageHeader title="Mein Profil" subtitle={`@${actor.username}`} />
      <div className="card max-w-xl space-y-4 p-5">
        <div><label className="label" htmlFor="pr-n">Anzeigename</label><input id="pr-n" className="input" value={name} onChange={(e) => setName(e.target.value)} /></div>
        {actor.role === 'shk' && (
          <>
            <div><label className="label" htmlFor="pr-h">Vertragsstunden / Monat</label><input id="pr-h" type="number" min={0} max={80} className="input" value={hours} onChange={(e) => setHours(Number(e.target.value))} /></div>
            <div>
              <span className="label">Meine Skills</span>
              <TagInput value={actor.skills} suggestions={SKILLS} onChange={(skills) => save('profiles', { ...actor, skills })} />
            </div>
          </>
        )}
        <button className="btn btn-primary" onClick={async () => { await save('profiles', { ...actor, full_name: name, contract_hours: hours }); notify('Profil gespeichert.'); }}>Speichern</button>
      </div>
    </>
  );
}
