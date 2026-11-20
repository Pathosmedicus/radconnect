import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import './index.css';
import { AppProvider, useApp } from './lib/app';
import { ViewProvider, useView } from './lib/view';
import { AuthScreen, OnboardingModal } from './components/Auth';
import { Layout } from './components/Layout';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import Capacity from './pages/Capacity';
import { Absences, Profile } from './pages/Absences';
import Wiki from './pages/Wiki';
import Approvals from './pages/Approvals';

function AuthedRoutes() {
  const { viewRole } = useView();
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="projekte" element={<Projects />} />
        <Route path="wiki" element={<Wiki />} />
        <Route path="kapazitaet" element={viewRole === 'shk' ? <Navigate to="/" /> : <Capacity />} />
        <Route path="freigaben" element={viewRole === 'admin' ? <Approvals /> : <Navigate to="/" />} />
        <Route path="abwesenheiten" element={viewRole === 'shk' ? <Absences /> : <Navigate to="/" />} />
        <Route path="profil" element={viewRole === 'shk' ? <Profile /> : <Navigate to="/" />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Route>
    </Routes>
  );
}

function Root() {
  const { ready, me } = useApp();
  if (!ready) return <div className="flex h-full items-center justify-center text-slate-400">Lade …</div>;
  if (!me) return <AuthScreen />;
  return (
    <ViewProvider me={me}>
      <AuthedRoutes />
      {!me.onboarded && <OnboardingModal />}
    </ViewProvider>
  );
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AppProvider>
        <Root />
      </AppProvider>
    </BrowserRouter>
  </React.StrictMode>,
);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => undefined));
}
