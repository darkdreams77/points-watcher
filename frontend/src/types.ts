export interface Group {
  id: string;
  forumId: string;
  name: string;
}

export interface Member {
  id: string;
  forumId: string;
  username: string;
  lastPoints: number | null;
  lastScanAt: string | null;
  lastChangeAt: string | null;
  profileUrl: string;
  manualStatus?: 'absent' | null;
  groupId?: string;
}

// pour la page globale
export interface MemberWithGroup extends Member {
  groupId: string;
  groupName: string;
  groupForumId: string;
}
