import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { DB, Profile, Role, Table } from '../types';
import { recalcFree, uid } from './logic';
import { seedDb } from './seed';

// ---------------------------------------------------------------------------
// Backend-Erkennung: Supabase (wenn .env gesetzt) sonst Demo-Modus
// ---------------------------------------------------------------------------
const SUPA_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPA_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const isConfigured = (v?: string) => !!v && !v.includes('DEIN-');
export const MODE: 'supabase' | 'demo' = isConfigured(SUPA_URL) && isConfigured(SUPA_KEY) ? 'supabase' : 'demo';
const supabase: SupabaseClient | null =
  MODE === 'supabase' ? createClient(SUPA_URL!, SUPA_KEY!, { auth: { persistSession: true, autoRefreshToken: true } }) : null;

const TABLE_NAME: Record<Table, string> = {
  profiles: 'profiles',
  projects: 'projects',
  assignments: 'project_assignments',
  absences: 'absences',
  wiki: 'wiki_articles',
};
const TABLES = Object.keys(TABLE_NAME) as Table[];
const emptyDb = (): DB => ({ profiles: [], projects: [], assignments: [], absences: [], wiki: [] });

// ---------------------------------------------------------------------------
// Demo-Speicher (localStorage + BroadcastChannel)
// ---------------------------------------------------------------------------
const DB_KEY = 'radconnect_demo_db_v1';
const PW_KEY = 'radconnect_demo_pw_v1';
const SESSION_KEY = 'radconnect_demo_session_v1';
const THEME_KEY = 'radconnect_theme';
const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('radconnect-sync') : null;

function demoLoad(): DB {
  const raw = localStorage.getItem(DB_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as DB;
      const seed = seedDb();
      // Non-destructive Backfill neuer Felder (Priorität, Fachkontakt, Kommentare) für bestehende Demo-Projekte
      parsed.projects = parsed.projects.map((p) => {
        const sp = seed.db.projects.find((x) => x.id === p.id);
        return {
          priority: sp?.priority ?? 'Mittel',
          technicalContactName: sp?.technicalContactName ?? '',
          technicalContactPhone: sp?.technicalContactPhone ?? '',
          comments: sp?.comments ?? [],
          ...p,
        };
      });
      return parsed;
    } catch { /* fällt auf Seed zurück */ }
  }
  const seed = seedDb();
  localStorage.setItem(DB_KEY, JSON.stringify(seed.db));
  localStorage.setItem(PW_KEY, JSON.stringify(seed.passwords));
  return seed.db;
}
const demoPw = (): Record<string, string> => JSON.parse(localStorage.getItem(PW_KEY) || '{}');
function demoPersist(db: DB) {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
  channel?.postMessage({ type: 'changed' });
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------
export interface SignUpInput {
  username: string; email: string; password: string; role: 'shk' | 'arzt'; contract_hours: number; full_name: string;
}
interface Toast { id: number; text: string; kind: 'ok' | 'err' }

interface AppCtx {
  mode: 'supabase' | 'demo';
  ready: boolean;
  db: DB;
  me: Profile | null;
  save: <T extends { id: string }>(table: Table, row: T) => Promise<void>;
  remove: (table: Table, id: string) => Promise<void>;
  signIn: (identifier: string, password: string) => Promise<string | null>;
  signUp: (i: SignUpInput) => Promise<string | null>;
  signInGoogle: () => Promise<string | null>;
  signOut: () => Promise<void>;
  completeOnboarding: (role: 'shk' | 'arzt', hours: number) => Promise<void>;
  notify: (text: string, kind?: 'ok' | 'err') => void;
  resetDemo: () => void;
  dark: boolean;
  toggleDark: () => void;
}

const Ctx = createContext<AppCtx | null>(null);
export const useApp = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error('AppProvider fehlt');
  return c;
};

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [db, setDb] = useState<DB>(emptyDb);
  const [userId, setUserId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [dark, setDark] = useState<boolean>(() => {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'dark' || saved === 'light') return saved === 'dark';
    return typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  });
  const dbRef = useRef(db);
  dbRef.current = db;

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light');
  }, [dark]);

  const toggleDark = useCallback(() => setDark((d) => !d), []);

  const notify = useCallback((text: string, kind: 'ok' | 'err' = 'ok') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, text, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);

  // ---- Supabase: Laden ----
  const loadRemote = useCallback(async () => {
    if (!supabase) return;
    const results = await Promise.all(TABLES.map((t) => supabase.from(TABLE_NAME[t]).select('*')));
    const next = emptyDb();
    results.forEach((r, i) => {
      if (r.error) console.error(TABLES[i], r.error.message);
      else (next as any)[TABLES[i]] = r.data;
    });
    setDb(next);
  }, []);

  // ---- Session ----
  useEffect(() => {
    if (MODE === 'demo') {
      setDb(demoLoad());
      setUserId(localStorage.getItem(SESSION_KEY));
      setReady(true);
      const onMsg = () => {
        setDb(demoLoad());
        setUserId(localStorage.getItem(SESSION_KEY));
      };
      channel?.addEventListener('message', onMsg);
      const onStorage = (e: StorageEvent) => { if (e.key === DB_KEY || e.key === SESSION_KEY) onMsg(); };
      window.addEventListener('storage', onStorage);
      return () => {
        channel?.removeEventListener('message', onMsg);
        window.removeEventListener('storage', onStorage);
      };
    }
    supabase!.auth.getSession().then(({ data }) => {
      setUserId(data.session?.user.id ?? null);
      setReady(true);
    });
    const { data: sub } = supabase!.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user.id ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // ---- Supabase: Daten + Realtime ----
  useEffect(() => {
    if (MODE !== 'supabase' || !supabase) return;
    if (!userId) { setDb(emptyDb()); return; }
    loadRemote();
    let ch = supabase.channel('radconnect-live');
    TABLES.forEach((t) => {
      ch = ch.on('postgres_changes', { event: '*', schema: 'public', table: TABLE_NAME[t] }, (payload) => {
        setDb((cur) => {
          const list = (cur[t] as { id: string }[]).slice();
          if (payload.eventType === 'DELETE') {
            const id = (payload.old as { id: string }).id;
            return { ...cur, [t]: list.filter((r) => r.id !== id) } as DB;
          }
          const row = payload.new as { id: string };
          const idx = list.findIndex((r) => r.id === row.id);
          if (idx >= 0) list[idx] = row; else list.push(row);
          return { ...cur, [t]: list } as DB;
        });
      });
    });
    ch.subscribe();
    const onVisible = () => { if (document.visibilityState === 'visible') loadRemote(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      supabase!.removeChannel(ch);
    };
  }, [userId, loadRemote]);

  const me = useMemo(() => db.profiles.find((p) => p.id === userId) ?? null, [db.profiles, userId]);

  // ---- Schreiben ----
  const applyLocal = (cur: DB, table: Table, row: { id: string }): DB => {
    const list = (cur[table] as { id: string }[]).slice();
    const idx = list.findIndex((r) => r.id === row.id);
    if (idx >= 0) list[idx] = { ...list[idx], ...row }; else list.push(row);
    const next = { ...cur, [table]: list } as DB;
    return { ...next, profiles: recalcFree(next.profiles, next.assignments) };
  };

  const save: AppCtx['save'] = useCallback(async (table, row) => {
    if (MODE === 'demo') {
      const next = applyLocal(demoLoad(), table, row);
      demoPersist(next);
      setDb(next);
      return;
    }
    setDb((cur) => applyLocal(cur, table, row));
    let q;
    if (table === 'profiles') {
      const p = row as unknown as Profile;
      q = supabase!.from('profiles').update({
        skills: p.skills, contract_hours: p.contract_hours, full_name: p.full_name, role: p.role, onboarded: p.onboarded,
      }).eq('id', p.id);
    } else {
      q = supabase!.from(TABLE_NAME[table]).upsert(row);
    }
    const { error } = await q;
    if (error) {
      notify('Speichern fehlgeschlagen: ' + error.message, 'err');
      loadRemote();
    }
  }, [loadRemote, notify]);

  const remove: AppCtx['remove'] = useCallback(async (table, id) => {
    const strip = (cur: DB): DB => {
      const next = { ...cur, [table]: (cur[table] as { id: string }[]).filter((r) => r.id !== id) } as DB;
      if (table === 'projects') next.assignments = next.assignments.filter((a) => a.project_id !== id);
      return { ...next, profiles: recalcFree(next.profiles, next.assignments) };
    };
    if (MODE === 'demo') {
      const next = strip(demoLoad());
      demoPersist(next);
      setDb(next);
      return;
    }
    setDb(strip);
    const { error } = await supabase!.from(TABLE_NAME[table]).delete().eq('id', id);
    if (error) {
      notify('Löschen fehlgeschlagen: ' + error.message, 'err');
      loadRemote();
    }
  }, [loadRemote, notify]);

  // ---- Auth ----
  const setSession = (id: string | null) => {
    if (id) localStorage.setItem(SESSION_KEY, id); else localStorage.removeItem(SESSION_KEY);
    setUserId(id);
    channel?.postMessage({ type: 'session' });
  };

  const signIn: AppCtx['signIn'] = async (identifier, password) => {
    const ident = identifier.trim();
    if (!ident || !password) return 'Bitte Benutzername/E-Mail und Passwort eingeben.';
    if (MODE === 'demo') {
      const cur = demoLoad();
      const p = cur.profiles.find(
        (x) => x.username.toLowerCase() === ident.toLowerCase() || x.email?.toLowerCase() === ident.toLowerCase(),
      );
      if (!p || demoPw()[p.id] !== password) return 'Anmeldedaten ungültig.';
      setDb(cur);
      setSession(p.id);
      return null;
    }
    let email = ident;
    if (!ident.includes('@')) {
      const { data, error } = await supabase!.rpc('email_for_username', { p_username: ident });
      if (error || !data) return 'Anmeldedaten ungültig.';
      email = data as string;
    }
    const { error } = await supabase!.auth.signInWithPassword({ email, password });
    return error ? 'Anmeldedaten ungültig.' : null;
  };

  const signUp: AppCtx['signUp'] = async (i) => {
    const username = i.username.trim();
    if (!/^[a-zA-Z0-9_.-]{3,30}$/.test(username))
      return 'Benutzername: 3–30 Zeichen (Buchstaben, Zahlen, . _ -).';
    if (!/^\S+@\S+\.\S+$/.test(i.email)) return 'Bitte eine gültige E-Mail-Adresse eingeben.';
    if (i.password.length < 8) return 'Das Passwort muss mindestens 8 Zeichen lang sein.';
    if (MODE === 'demo') {
      const cur = demoLoad();
      if (cur.profiles.some((p) => p.username.toLowerCase() === username.toLowerCase())) return 'Benutzername bereits vergeben.';
      if (cur.profiles.some((p) => p.email?.toLowerCase() === i.email.toLowerCase())) return 'E-Mail bereits registriert.';
      const p: Profile = {
        id: uid(), username, email: i.email, full_name: i.full_name || username, role: i.role,
        contract_hours: i.role === 'shk' ? i.contract_hours : 0, free_hours: i.role === 'shk' ? i.contract_hours : 0,
        skills: [], onboarded: true, created_at: new Date().toISOString(),
      };
      const next = { ...cur, profiles: [...cur.profiles, p] };
      localStorage.setItem(PW_KEY, JSON.stringify({ ...demoPw(), [p.id]: i.password }));
      demoPersist(next);
      setDb(next);
      setSession(p.id);
      return null;
    }
    const { data: taken } = await supabase!.rpc('email_for_username', { p_username: username });
    if (taken) return 'Benutzername bereits vergeben.';
    const { data, error } = await supabase!.auth.signUp({
      email: i.email, password: i.password,
      options: { data: { username, role: i.role, contract_hours: i.contract_hours, full_name: i.full_name } },
    });
    if (error) return error.message;
    if (!data.session) return 'OK_CONFIRM';
    return null;
  };

  const signInGoogle: AppCtx['signInGoogle'] = async () => {
    if (MODE === 'demo') {
      const cur = demoLoad();
      const p: Profile = {
        id: uid(), username: 'google.nutzer' + Math.floor(Math.random() * 900 + 100), email: null,
        full_name: 'Google Nutzer (Demo)', role: 'shk', contract_hours: 0, free_hours: 0,
        skills: [], onboarded: false, created_at: new Date().toISOString(),
      };
      const next = { ...cur, profiles: [...cur.profiles, p] };
      demoPersist(next);
      setDb(next);
      setSession(p.id);
      return null;
    }
    const { error } = await supabase!.auth.signInWithOAuth({
      provider: 'google', options: { redirectTo: window.location.origin },
    });
    return error ? error.message : null;
  };

  const signOut = async () => {
    if (MODE === 'demo') setSession(null);
    else await supabase!.auth.signOut();
  };

  const completeOnboarding: AppCtx['completeOnboarding'] = async (role, hours) => {
    if (!me) return;
    await save('profiles', { ...me, role, contract_hours: role === 'shk' ? hours : 0, onboarded: true });
  };

  const resetDemo = () => {
    localStorage.removeItem(DB_KEY);
    localStorage.removeItem(PW_KEY);
    localStorage.removeItem(SESSION_KEY);
    setDb(demoLoad());
    setUserId(null);
    channel?.postMessage({ type: 'changed' });
  };

  const value: AppCtx = {
    mode: MODE, ready, db, me, save, remove, signIn, signUp, signInGoogle, signOut, completeOnboarding, notify, resetDemo, dark, toggleDark,
  };

  return (
    <Ctx.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-3 z-[100] flex flex-col items-center gap-2 px-3">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto animate-pop rounded-xl px-4 py-2.5 text-sm font-medium text-white shadow-lg ${
              t.kind === 'ok' ? 'bg-slate-900' : 'bg-red-600'
            }`}
          >
            {t.text}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export type { Role };
