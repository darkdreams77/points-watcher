import type { Member } from '../types';

export type ComputedStatus = 'actif' | 'enDanger' | 'absent';

export function computeStatus(member: Member): ComputedStatus {
  if (member.manualStatus === 'absent') return 'absent';

  const LIMIT_DAYS = 21;
  if (!member.lastChangeAt) return 'enDanger';

  const last = new Date(member.lastChangeAt);
  const now = new Date();

  const lastMid = new Date(last.getFullYear(), last.getMonth(), last.getDate());
  const nowMid = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const diffDays =
    (nowMid.getTime() - lastMid.getTime()) / (1000 * 60 * 60 * 24);

  return diffDays >= LIMIT_DAYS ? 'enDanger' : 'actif';
}
