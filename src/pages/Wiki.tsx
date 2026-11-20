import React, { useState } from 'react';
import { ExternalLink, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useApp } from '../lib/app';
import { useView } from '../lib/view';
import { uid } from '../lib/logic';
import { WIKI_CATEGORIES, type WikiArticle } from '../types';
import { Empty, Modal, PageHeader } from '../components/ui';

function ArticleForm({ initial, onClose }: { initial?: WikiArticle; onClose: () => void }) {
  const { save, notify } = useApp();
  const { actor } = useView();
  const [f, setF] = useState({
    title: initial?.title ?? '', category: initial?.category ?? WIKI_CATEGORIES[0], summary: initial?.summary ?? '',
    steps: (initial?.steps ?? []).join('\n'),
    links: (initial?.links ?? []).map((l) => `${l.label} | ${l.url}`).join('\n'),
  });
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const a: WikiArticle = {
      id: initial?.id ?? uid(), title: f.title.trim(), category: f.category, summary: f.summary.trim(),
      steps: f.steps.split('\n').map((s) => s.trim()).filter(Boolean),
      links: f.links.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => {
        const [label, ...rest] = l.split('|');
        const url = (rest.join('|') || label).trim();
        return { label: rest.length ? label.trim() : url, url };
      }).filter((l) => /^https?:\/\//.test(l.url)),
      author_id: initial?.author_id ?? actor.id, created_at: initial?.created_at ?? new Date().toISOString(),
    };
    await save('wiki', a);
    notify('SOP gespeichert.');
    onClose();
  };
  return (
    <Modal title={initial ? 'SOP bearbeiten' : 'Neue SOP'} onClose={onClose} wide>
      <form onSubmit={submit} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label className="label" htmlFor="w-t">Titel</label><input id="w-t" className="input" required value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></div>
          <div><label className="label" htmlFor="w-c">Kategorie</label>
            <select id="w-c" className="input" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>{WIKI_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></div>
        </div>
        <div><label className="label" htmlFor="w-s">Kurzbeschreibung</label><input id="w-s" className="input" value={f.summary} onChange={(e) => setF({ ...f, summary: e.target.value })} /></div>
        <div><label className="label" htmlFor="w-st">Schritte (ein Schritt pro Zeile)</label><textarea id="w-st" className="input min-h-[120px]" value={f.steps} onChange={(e) => setF({ ...f, steps: e.target.value })} /></div>
        <div><label className="label" htmlFor="w-l">Links (Bezeichnung | https://…, eine pro Zeile)</label><textarea id="w-l" className="input min-h-[60px]" value={f.links} onChange={(e) => setF({ ...f, links: e.target.value })} /></div>
        <div className="flex justify-end gap-2"><button type="button" className="btn btn-ghost" onClick={onClose}>Abbrechen</button><button className="btn btn-primary">Speichern</button></div>
      </form>
    </Modal>
  );
}

export default function Wiki() {
  const { db, remove } = useApp();
  const { viewRole, actor } = useView();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('Alle');
  const [edit, setEdit] = useState<WikiArticle | 'new' | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const canWrite = viewRole !== 'shk';
  const cats = ['Alle', ...Array.from(new Set([...WIKI_CATEGORIES, ...db.wiki.map((w) => w.category)]))];
  const list = db.wiki.filter((w) => (cat === 'Alle' || w.category === cat) &&
    (!q || (w.title + w.summary + w.steps.join(' ')).toLowerCase().includes(q.toLowerCase())));

  return (
    <>
      <PageHeader title="SOPs & Wiki" subtitle="Onboarding und Schritt-für-Schritt-Anleitungen"
        actions={canWrite && <button className="btn btn-primary" onClick={() => setEdit('new')}><Plus size={16} /> Neue SOP</button>} />
      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative w-full sm:w-72">
          <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
          <input className="input !pl-9" placeholder="Wiki durchsuchen…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {cats.map((c) => (
            <button key={c} onClick={() => setCat(c)} className={`badge !px-3 !py-1.5 ${cat === c ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'}`}>{c}</button>
          ))}
        </div>
      </div>
      {list.length === 0 ? <Empty text="Keine Artikel gefunden." /> : (
        <div className="grid gap-4 md:grid-cols-2">
          {list.map((w) => (
            <article key={w.id} className="card p-5">
              <div className="mb-1 flex items-start justify-between gap-2">
                <div>
                  <span className="badge bg-brand-50 text-brand-800 dark:bg-brand-950/60 dark:text-brand-200">{w.category}</span>
                  <h3 className="mt-2 font-bold text-slate-900 dark:text-slate-100">{w.title}</h3>
                </div>
                {canWrite && (viewRole === 'admin' || w.author_id === actor.id) && (
                  <div className="flex gap-1">
                    <button className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => setEdit(w)} aria-label="Bearbeiten"><Pencil size={14} /></button>
                    <button className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/50 dark:hover:text-red-400" onClick={() => confirm('SOP löschen?') && remove('wiki', w.id)} aria-label="Löschen"><Trash2 size={14} /></button>
                  </div>
                )}
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">{w.summary}</p>
              <button className="mt-3 text-sm font-semibold text-brand-700 dark:text-brand-400" onClick={() => setOpen(open === w.id ? null : w.id)}>
                {open === w.id ? 'Einklappen' : `Anleitung öffnen (${w.steps.length} Schritte)`}
              </button>
              {open === w.id && (
                <div className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-800">
                  <ol className="list-decimal space-y-1.5 pl-5 text-sm">{w.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
                  {w.links.map((l) => (
                    <a key={l.url} href={l.url} target="_blank" rel="noreferrer" className="mt-3 flex items-center gap-1 text-xs font-semibold text-brand-700 hover:underline dark:text-brand-400"><ExternalLink size={12} /> {l.label}</a>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
      )}
      {edit && <ArticleForm initial={edit === 'new' ? undefined : edit} onClose={() => setEdit(null)} />}
    </>
  );
}
