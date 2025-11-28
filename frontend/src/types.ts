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
}
