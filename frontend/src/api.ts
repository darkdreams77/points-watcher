import type { Group, Member, MemberWithGroup } from './types';

export const API_BASE =
  import.meta.env.VITE_API_BASE ?? 'http://localhost:4000';

export class UnauthorizedError extends Error {
  constructor() {
    super('Unauthorized');
  }
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { credentials: 'include' });
  if (res.status === 401) throw new UnauthorizedError();
  if (!res.ok) throw new Error(`Erreur de récupération (${path})`);
  return res.json();
}

export async function checkAuthStatus(): Promise<boolean> {
  const res = await fetch(`${API_BASE}/auth/status`, { credentials: 'include' });
  return res.ok;
}

export async function fetchGroups(): Promise<Group[]> {
  return get<Group[]>('/groups');
}

export async function fetchGroupMembers(groupId: string): Promise<Member[]> {
  return get<Member[]>(`/groups/${groupId}/members`);
}

export async function fetchAllMembers(): Promise<MemberWithGroup[]> {
  return get<MemberWithGroup[]>('/members');
}

export async function updateMemberStatus(
  memberId: string,
  status: 'absent' | 'toDelete' | null,
  absenceEndDate?: string
) {
  const res = await fetch(`${API_BASE}/members/${memberId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ status, absenceEndDate }),
  });
  if (res.status === 401) throw new UnauthorizedError();
  if (!res.ok) throw new Error('Erreur de mise à jour du statut');
  return res.json();
}

export async function updateMemberLastChangeAt(
  memberId: string,
  lastChangeAt: string
) {
  const res = await fetch(`${API_BASE}/members/${memberId}/last-change-at`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ lastChangeAt }),
  });
  if (res.status === 401) throw new UnauthorizedError();
  if (!res.ok) throw new Error('Erreur de mise à jour de la date');
  return res.json();
}
