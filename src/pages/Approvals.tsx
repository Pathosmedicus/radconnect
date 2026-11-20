import React, { useState } from 'react';
import { Download } from 'lucide-react';
import { useApp } from '../lib/app';
import { exportHoursCsv, nameOf } from '../lib/logic';
import { Empty, PageHeader } from '../components/ui';
import { ProjectCard, ProjectDetail } from './Projects';

export default function Approvals() {
  const { db } = useApp();
  const [open, setOpen] = useState<string | null>(null);
  const pending = db.projects.filter((p) => p.status === 'beantragt');
  const appl = db.assignments.filter((a) => a.status === 'beworben');
  const projWithApps = Array.from(new Set(appl.map((a) => a.project_id)))
    .map((id) => db.projects.find((p) => p.id === id)).filter(Boolean);
  const unassigned = db.projects.filter((p) => p.status === 'offen' && !appl.some((a) => a.project_id === p.id));

  return (
    <>
      <PageHeader title="Freigaben & Matching" subtitle="Neue Projekte prüfen, Bewerbungen bestätigen oder SHKs direkt zuweisen"
        actions={<button className="btn btn-ghost" onClick={() => exportHoursCsv(db)}><Download size={16} /> CSV Export</button>} />
      <h2 className="mb-3 font-bold">Zur Freigabe ({pending.length})</h2>
      {pending.length === 0 ? <Empty text="Keine Projekte warten auf Freigabe." /> : (
        <div className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {pending.map((p) => <ProjectCard key={p.id} project={p} onOpen={() => setOpen(p.id)} />)}
        </div>
      )}
      <h2 className="mb-3 font-bold">Bewerbungen aus dem Marktplatz ({appl.length})</h2>
      {projWithApps.length === 0 ? <Empty text="Keine offenen Bewerbungen." /> : (
        <div className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {projWithApps.map((p) => p && (
            <ProjectCard key={p.id} project={p} onOpen={() => setOpen(p.id)}
              extra={<span className="text-xs text-slate-600 dark:text-slate-400">Bewerber: {appl.filter((a) => a.project_id === p.id).map((a) => nameOf(db.profiles.find((x) => x.id === a.shk_id))).join(', ')}</span>} />
          ))}
        </div>
      )}
      <h2 className="mb-3 font-bold">Offen ohne Bewerbung – direkt zuweisen ({unassigned.length})</h2>
      {unassigned.length === 0 ? <Empty text="Alles bearbeitet." /> : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {unassigned.map((p) => <ProjectCard key={p.id} project={p} onOpen={() => setOpen(p.id)} />)}
        </div>
      )}
      {open && <ProjectDetail projectId={open} onClose={() => setOpen(null)} />}
    </>
  );
}
