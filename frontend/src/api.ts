import type { Group, Member } from './types';

const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:4000';

export async function fetchGroups(): Promise<Group[]> {
  const res = await fetch(`${API_BASE}/groups`);
  if (!res.ok) throw new Error('Erreur de récupération des groupes');
  return res.json();
}

export async function fetchGroupMembers(groupId: string): Promise<Member[]> {
  const res = await fetch(`${API_BASE}/groups/${groupId}/members`);
  if (!res.ok) throw new Error('Erreur de récupération des membres');
  return res.json();
}
