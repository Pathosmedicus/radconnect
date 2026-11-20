import React, { useState } from 'react';
import { Activity, FlaskConical, Moon, ShieldAlert, Sun } from 'lucide-react';
import { useApp } from '../lib/app';
import { DEMO_PASSWORD } from '../lib/seed';
import { Modal } from './ui';

export const Logo = ({ dark }: { dark?: boolean }) => (
  <div className="flex items-center gap-2.5">
    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-700 text-white shadow-lg shadow-brand-900/30">
      <Activity size={20} strokeWidth={2.6} />
    </div>
    <span className={`text-xl font-extrabold tracking-tight ${dark ? 'text-white' : 'text-slate-900 dark:text-white'}`}>RadConnect</span>
  </div>
);

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
    <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z" />
    <path fill="#FBBC05" d="M10.5 28.7A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.8-4.7l-7.9-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.8l7.9-6.1z" />
    <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.9 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
  </svg>
);

export function AuthScreen() {
  const { mode, signIn, signUp, signInGoogle, resetDemo, dark, toggleDark } = useApp();
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [f, setF] = useState({
    identifier: '', password: '', username: '', email: '', full_name: '', role: 'shk' as 'shk' | 'arzt', hours: 40,
  });
  const set = (k: keyof typeof f, v: string | number) => setF((s) => ({ ...s, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr(null); setInfo(null);
    let res: string | null;
    if (tab === 'login') res = await signIn(f.identifier, f.password);
    else {
      res = await signUp({
        username: f.username, email: f.email, password: f.password, role: f.role,
        contract_hours: f.role === 'shk' ? Number(f.hours) : 0, full_name: f.full_name,
      });
      if (res === 'OK_CONFIRM') { setInfo('Registrierung erfolgreich! Bitte bestätige deine E-Mail-Adresse und melde dich dann an.'); res = null; setTab('login'); }
    }
    setErr(res);
    setBusy(false);
  };

  const quick = async (u: string) => { setBusy(true); setErr(await signIn(u, DEMO_PASSWORD)); setBusy(false); };

  return (
    <div className="grid min-h-full lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-slate-900 p-12 text-white lg:flex">
        <div className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-brand-500/30 blur-3xl" />
        <div className="absolute -bottom-32 right-0 h-96 w-96 rounded-full bg-indigo-500/20 blur-3xl" />
        <Logo dark />
        <div className="relative">
          <h2 className="text-4xl font-extrabold leading-tight">Forschung koordinieren.<br />Kapazitäten im Blick.</h2>
          <p className="mt-4 max-w-md text-slate-300">
            Projekte, Stunden, Meilensteine und SOPs für Ärzte, studentische Hilfskräfte und Koordination – in Echtzeit synchronisiert.
          </p>
          <div className="mt-8 flex items-center gap-2 text-sm text-slate-400">
            <ShieldAlert size={16} /> DSGVO-konform: keine Patientendaten, nur Projekt-Metadaten.
          </div>
        </div>
        <div className="relative text-xs text-slate-500">Universitätsklinik · Radiologie</div>
      </div>

      <div className="relative flex items-center justify-center p-5 sm:p-10">
        <button
          onClick={toggleDark}
          className="absolute right-5 top-5 rounded-xl border border-slate-200 bg-white p-2 text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          aria-label={dark ? 'Hellmodus aktivieren' : 'Dunkelmodus aktivieren'}
          title={dark ? 'Hellmodus' : 'Dunkelmodus'}
        >
          {dark ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        <div className="w-full max-w-md">
          <div className="mb-6 lg:hidden"><Logo /></div>
          {mode === 'demo' && (
            <div className="mb-4 flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-200">
              <FlaskConical size={16} className="mt-0.5 shrink-0" />
              <p><b>Demo-Modus</b> – keine Supabase-Keys gefunden. Daten liegen lokal im Browser und werden zwischen Tabs live synchronisiert.</p>
            </div>
          )}
          <div className="card p-6">
            <div className="mb-5 grid grid-cols-2 rounded-xl bg-slate-100 p-1 text-sm font-semibold dark:bg-slate-800">
              {(['login', 'register'] as const).map((t) => (
                <button key={t} onClick={() => { setTab(t); setErr(null); }}
                  className={`rounded-lg py-2 transition ${tab === t ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>
                  {t === 'login' ? 'Anmelden' : 'Registrieren'}
                </button>
              ))}
            </div>

            <button type="button" disabled={busy} onClick={async () => setErr(await signInGoogle())}
              className="btn btn-ghost w-full">
              <GoogleIcon /> Mit Google (Gmail) anmelden
            </button>
            <div className="my-4 flex items-center gap-3 text-xs text-slate-400">
              <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" /> oder <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
            </div>

            <form onSubmit={submit} className="space-y-3">
              {tab === 'login' ? (
                <div>
                  <label className="label" htmlFor="identifier">Benutzername oder E-Mail</label>
                  <input id="identifier" className="input" autoComplete="username" value={f.identifier}
                    onChange={(e) => set('identifier', e.target.value)} required />
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label" htmlFor="username">Benutzername</label>
                      <input id="username" className="input" value={f.username} onChange={(e) => set('username', e.target.value)} required />
                    </div>
                    <div>
                      <label className="label" htmlFor="full_name">Name (optional)</label>
                      <input id="full_name" className="input" value={f.full_name} onChange={(e) => set('full_name', e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <label className="label" htmlFor="email">E-Mail</label>
                    <input id="email" type="email" className="input" autoComplete="email" value={f.email} onChange={(e) => set('email', e.target.value)} required />
                  </div>
                  <div>
                    <span className="label">Rolle</span>
                    <div className="grid grid-cols-2 gap-2">
                      {(['shk', 'arzt'] as const).map((r) => (
                        <button type="button" key={r} onClick={() => set('role', r)}
                          className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${f.role === r ? 'border-brand-500 bg-brand-50 text-brand-800 dark:bg-brand-950/60 dark:text-brand-200' : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'}`}>
                          {r === 'shk' ? 'SHK' : 'Arzt'}
                        </button>
                      ))}
                    </div>
                  </div>
                  {f.role === 'shk' && (
                    <div>
                      <label className="label" htmlFor="hours">Vertragsstunden pro Monat</label>
                      <input id="hours" type="number" min={0} max={80} className="input" value={f.hours} onChange={(e) => set('hours', e.target.value)} />
                    </div>
                  )}
                </>
              )}
              <div>
                <label className="label" htmlFor="password">Passwort</label>
                <input id="password" type="password" className="input" autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
                  value={f.password} onChange={(e) => set('password', e.target.value)} required minLength={tab === 'register' ? 8 : undefined} />
                {tab === 'register' && (
                  <p className="mt-1.5 flex gap-1.5 text-xs text-slate-500">
                    <ShieldAlert size={14} className="mt-px shrink-0 text-amber-500" />
                    Sicherheitshinweis: Bitte verwende hier ein eigenes Passwort und NICHT dein internes Klinik-Netzwerk-Passwort.
                  </p>
                )}
              </div>
              {err && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{err}</p>}
              {info && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">{info}</p>}
              <button className="btn btn-primary w-full" disabled={busy}>
                {tab === 'login' ? 'Anmelden' : 'Konto erstellen'}
              </button>
            </form>
          </div>

          {mode === 'demo' && (
            <div className="mt-4 text-center text-xs text-slate-500">
              <p className="mb-2 font-semibold">Demo-Schnellzugang (Passwort: {DEMO_PASSWORD})</p>
              <div className="flex flex-wrap justify-center gap-2">
                {[['koordinator', 'Koordinator'], ['dr.weber', 'Arzt'], ['lena.k', 'SHK']].map(([u, l]) => (
                  <button key={u} onClick={() => quick(u)} className="btn btn-ghost btn-sm">{l} ({u})</button>
                ))}
              </div>
              <button onClick={resetDemo} className="mt-3 underline">Demo-Daten zurücksetzen</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function OnboardingModal() {
  const { completeOnboarding } = useApp();
  const [role, setRole] = useState<'shk' | 'arzt'>('shk');
  const [hours, setHours] = useState(40);
  return (
    <Modal title="Willkommen bei RadConnect" onClose={() => { /* Pflichtschritt */ }}>
      <p className="mb-4 text-sm text-slate-600 dark:text-slate-300">Bitte wähle deine Rolle, um loszulegen.</p>
      <div className="mb-4 grid grid-cols-2 gap-2">
        {(['shk', 'arzt'] as const).map((r) => (
          <button key={r} onClick={() => setRole(r)}
            className={`rounded-xl border px-3 py-3 text-sm font-semibold ${role === r ? 'border-brand-500 bg-brand-50 text-brand-800 dark:bg-brand-950/60 dark:text-brand-200' : 'border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300'}`}>
            {r === 'shk' ? 'Studentische Hilfskraft' : 'Arzt / Projektleiter'}
          </button>
        ))}
      </div>
      {role === 'shk' && (
        <div className="mb-4">
          <label className="label" htmlFor="ob-hours">Vertragsstunden pro Monat</label>
          <input id="ob-hours" type="number" min={0} max={80} className="input" value={hours} onChange={(e) => setHours(Number(e.target.value))} />
        </div>
      )}
      <button className="btn btn-primary w-full" onClick={() => completeOnboarding(role, hours)}>Weiter</button>
    </Modal>
  );
}
