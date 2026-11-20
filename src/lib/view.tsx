import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useApp } from './app';
import type { Profile, Role } from '../types';

/** "Ansicht wechseln": Nur Koordinatoren (Admins) können als Arzt/SHK-Ansicht agieren. */
interface ViewCtx {
  viewRole: Role;
  actor: Profile;
  isAdmin: boolean;
  setViewRole: (r: Role) => void;
  setActorId: (id: string) => void;
  candidates: Profile[];
}
const Ctx = createContext<ViewCtx | null>(null);
export const useView = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error('ViewProvider fehlt');
  return c;
};

export function ViewProvider({ me, children }: { me: Profile; children: React.ReactNode }) {
  const { db } = useApp();
  const isAdmin = me.role === 'admin';
  const [viewRole, setViewRole] = useState<Role>(me.role);
  const [actorIds, setActorIds] = useState<Partial<Record<Role, string>>>({});

  useEffect(() => { if (!isAdmin) setViewRole(me.role); }, [isAdmin, me.role]);

  const value = useMemo<ViewCtx>(() => {
    const candidates = db.profiles.filter((p) => p.role === viewRole);
    let actor: Profile = me;
    if (isAdmin && viewRole !== 'admin') {
      actor = candidates.find((p) => p.id === actorIds[viewRole]) ?? candidates[0] ?? me;
    }
    return {
      viewRole: isAdmin ? viewRole : me.role,
      actor, isAdmin, candidates,
      setViewRole,
      setActorId: (id) => setActorIds((s) => ({ ...s, [viewRole]: id })),
    };
  }, [db.profiles, viewRole, actorIds, isAdmin, me]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
