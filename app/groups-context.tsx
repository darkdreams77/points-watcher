'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { fetchGroups } from '../api';
import type { Group } from '../types';

const GroupsContext = createContext<Group[]>([]);

export function GroupsProvider({ children }: { children: React.ReactNode }) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGroups()
      .then((data) => setGroups(data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: 16 }}>Chargement des groupes…</div>;
  if (!groups.length) return <div style={{ padding: 16 }}>Aucun groupe trouvé.</div>;

  return <GroupsContext.Provider value={groups}>{children}</GroupsContext.Provider>;
}

export const useGroups = () => useContext(GroupsContext);
