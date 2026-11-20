import React from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  BookOpen, CalendarOff, ClipboardCheck, FolderKanban, Gauge, LayoutDashboard, LogOut, Moon, Radio, Sun, UserCog, Users,
} from 'lucide-react';
import { useApp } from '../lib/app';
import { useView } from '../lib/view';
import { ROLE_LABEL, type Role } from '../types';
import { Logo } from './Auth';

interface NavItem { to: string; label: string; icon: React.ReactNode }

export function navFor(role: Role): NavItem[] {
  const i = (c: React.ReactNode) => c;
  const dash = { to: '/', label: 'Übersicht', icon: i(<LayoutDashboard size={20} />) };
  const proj = { to: '/projekte', label: 'Projekte', icon: i(<FolderKanban size={20} />) };
  const wiki = { to: '/wiki', label: 'SOPs & Wiki', icon: i(<BookOpen size={20} />) };
  if (role === 'shk') return [dash, proj, { to: '/abwesenheiten', label: 'Abwesenheit', icon: <CalendarOff size={20} /> }, wiki, { to: '/profil', label: 'Profil', icon: <UserCog size={20} /> }];
  if (role === 'arzt') return [dash, proj, { to: '/kapazitaet', label: 'Kapazität', icon: <Gauge size={20} /> }, wiki];
  return [dash, { to: '/freigaben', label: 'Freigaben', icon: <ClipboardCheck size={20} /> }, proj, { to: '/kapazitaet', label: 'SHK-Team', icon: <Users size={20} /> }, wiki];
}

export function Layout() {
  const { me, signOut, mode, dark, toggleDark } = useApp();
  const { viewRole, actor, isAdmin, setViewRole, setActorId, candidates } = useView();
  const nav = navFor(viewRole);
  useLocation();

  return (
    <div className="flex h-full">
      <aside className="hidden w-64 shrink-0 flex-col bg-slate-900 p-4 md:flex dark:border-r dark:border-slate-800">
        <div className="px-2 py-3"><Logo dark /></div>
        <nav className="mt-6 flex flex-1 flex-col gap-1">
          {nav.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.to === '/'}
              className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${isActive ? 'bg-brand-600 text-white shadow-lg shadow-brand-900/40' : 'text-slate-300 hover:bg-white/10'}`}>
              {n.icon}{n.label}
            </NavLink>
          ))}
        </nav>
        <div className="rounded-xl bg-white/5 p-3 text-xs text-slate-400">
          <div className="flex items-center gap-1.5 font-semibold text-slate-200">
            <Radio size={12} className="text-emerald-400" /> {mode === 'supabase' ? 'Live (Supabase Realtime)' : 'Demo-Modus (lokal live)'}
          </div>
          <p className="mt-1">Angemeldet als <b className="text-slate-200">{me?.username}</b></p>
          <button onClick={signOut} className="mt-2 flex items-center gap-1.5 font-semibold text-slate-300 hover:text-white">
            <LogOut size={14} /> Abmelden
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white px-4 py-2.5 md:px-8 dark:border-slate-800 dark:bg-slate-900">
          <div className="md:hidden"><Logo /></div>
          <div className="hidden text-sm text-slate-500 md:block dark:text-slate-400">
            {ROLE_LABEL[viewRole]}-Ansicht · <b className="text-slate-800 dark:text-slate-100">{actor.full_name || actor.username}</b>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <>
                <label className="sr-only" htmlFor="view-switch">Ansicht wechseln</label>
                <div className="flex rounded-xl bg-slate-100 p-1 text-xs font-semibold dark:bg-slate-800" id="view-switch">
                  {(['admin', 'arzt', 'shk'] as Role[]).map((r) => (
                    <button key={r} onClick={() => setViewRole(r)}
                      className={`rounded-lg px-2.5 py-1.5 transition ${viewRole === r ? 'bg-white text-brand-700 shadow-sm dark:bg-slate-700 dark:text-brand-300' : 'text-slate-500 dark:text-slate-400'}`}>
                      {r === 'admin' ? 'Admin' : r === 'arzt' ? 'Arzt' : 'SHK'}
                    </button>
                  ))}
                </div>
                {viewRole !== 'admin' && (
                  <select className="input !w-auto !py-1.5 text-xs" value={actor.id} onChange={(e) => setActorId(e.target.value)} aria-label="Person wählen">
                    {candidates.map((c) => <option key={c.id} value={c.id}>{c.full_name || c.username}</option>)}
                  </select>
                )}
              </>
            )}
            <button
              onClick={toggleDark}
              className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              aria-label={dark ? 'Hellmodus aktivieren' : 'Dunkelmodus aktivieren'}
              title={dark ? 'Hellmodus' : 'Dunkelmodus'}
            >
              {dark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button onClick={signOut} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 md:hidden dark:text-slate-400 dark:hover:bg-slate-800" aria-label="Abmelden">
              <LogOut size={18} />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 pb-24 md:p-8 md:pb-8">
          <div className="mx-auto max-w-6xl"><Outlet /></div>
        </main>

        <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 flex border-t border-slate-200 bg-white/95 backdrop-blur md:hidden dark:border-slate-800 dark:bg-slate-900/95">
          {nav.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.to === '/'}
              className={({ isActive }) => `flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-semibold ${isActive ? 'text-brand-700 dark:text-brand-400' : 'text-slate-400 dark:text-slate-500'}`}>
              {n.icon}{n.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
