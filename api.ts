import type { Group, Member, MemberWithGroup } from './types';

export const API_BASE = '';

export class UnauthorizedError extends Error {
  constructor() {
    super('Unauthorized');
  }
}

export async function fetchGroups(): Promise<Group[]> {
  const res = await fetch(`${API_BASE}/api/groups`);
  if (!res.ok) throw new Error('Erreur de récupération des groupes');
  return res.json();
}

export async function fetchGroupMembers(groupId: string): Promise<Member[]> {
  const res = await fetch(`${API_BASE}/api/groups/${groupId}/members`);
  if (!res.ok) throw new Error('Erreur de récupération des membres');
  return res.json();
}

export async function updateMemberStatus(
  memberId: string,
  status: 'absent' | 'toDelete' | null
) {
  const res = await fetch(`${API_BASE}/api/members/${memberId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  if (res.status === 401) throw new UnauthorizedError();
  if (!res.ok) throw new Error('Erreur de mise à jour du statut');
  return res.json();
}

export async function fetchAllMembers(): Promise<MemberWithGroup[]> {
  const res = await fetch(`${API_BASE}/api/members`);
  if (!res.ok) throw new Error('Erreur de récupération de tous les membres');
  return res.json();
}