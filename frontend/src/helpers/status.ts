import type { Member } from '../types';

export type ComputedStatus = 'actif' | 'enDanger' | 'toDelete' | 'absent';

export function computeStatus(member: Member): ComputedStatus {
  if (member.manualStatus === 'toDelete') return 'toDelete';
  if (member.manualStatus === 'absent') return 'absent';

  if (!member.lastChangeAt) return 'enDanger';

  const THREE_WEEKS_MS = 21 * 24 * 60 * 60 * 1000;
  if (!member.lastChangeAt) return 'enDanger';

  const lastChange = new Date(member.lastChangeAt).getTime();
  const now = Date.now();

  return now - lastChange <= THREE_WEEKS_MS ? 'actif' : 'enDanger';
}
