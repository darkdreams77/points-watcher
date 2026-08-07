// src/forumApi.ts
import axios, { AxiosInstance } from 'axios';
import * as cheerio from 'cheerio';

const BASE_URL = process.env.FORUM_BASE_URL!;
const COOKIE = process.env.FORUM_SESSION_COOKIE || ''; // pour le local si tu veux

if (!BASE_URL) throw new Error('FORUM_BASE_URL manquant');

let client: AxiosInstance | null = null;

export function getClient(): AxiosInstance {
  if (client) return client;

  const headers: Record<string, string> = {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, comme Gecko) Chrome/124.0.0.0 Safari/537.36',
  };

  if (COOKIE) {
    headers.Cookie = COOKIE;
  }

  client = axios.create({
    baseURL: BASE_URL,
    headers,
  });

  return client;
}

function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

const MIN_INTERVAL_MS = 1500;
let lastRequestTime = 0;

const MAX_RETRIES = 3;
const RETRY_BASE_MS = 2000;

export async function rateLimitedGet(url: string) {
  const c = getClient();

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const now = Date.now();
    const elapsed = now - lastRequestTime;
    if (elapsed < MIN_INTERVAL_MS) {
      await sleep(MIN_INTERVAL_MS - elapsed);
    }

    const res = await c.get<string>(url, { validateStatus: () => true });
    lastRequestTime = Date.now();

    if (res.status < 500) return res;

    lastError = new Error(`Remote ${res.status} on ${url}`);
    console.warn(`⚠ Tentative ${attempt}/${MAX_RETRIES} échouée (${res.status}) — ${url}`);

    if (attempt < MAX_RETRIES) {
      await sleep(RETRY_BASE_MS * attempt);
    }
  }

  throw lastError!;
}

const SELECTOR_MEMBER_ROW = 'table.table1 tr';
const SELECTOR_PROFILE_LINK = 'a[href*="/u"]';

export interface ForumMemberInfo {
  forumId: string; // ex: "1234"
  username: string; // pseudo
  profileUrl: string;
}

export async function fetchGroupMembersFromForum(
  forumGroupId: string
): Promise<ForumMemberInfo[]> {
  const allMembers: ForumMemberInfo[] = [];

  let start = 0;
  const pageSize = 50; // Forumactif = 50 membres par page

  while (true) {
    const url = `/g${forumGroupId}?start=${start}`;
    const res = await rateLimitedGet(url);
    const $ = cheerio.load(res.data);

    // === Extraction des membres sur la page courante ===
    const membersOnPage: ForumMemberInfo[] = [];

    $(SELECTOR_MEMBER_ROW).each((_, el) => {
      const link = $(el).find(SELECTOR_PROFILE_LINK);
      const href = link.attr('href') || '';
      const username = link.text().trim();

      const match = href.match(/\/u(\d+)/);
      const forumId = match?.[1];

      if (!forumId || !username || !href.includes('/u')) return;

      membersOnPage.push({
        forumId,
        username,
        profileUrl: href.startsWith('https') ? href : BASE_URL + href,
      });
    });

    if (membersOnPage.length === 0) {
      console.warn(`⚠️ AUCUN membre détecté sur ${url} (status ${res.status})`);
      console.warn('Extrait HTML:', res.data.slice(0, 55500));
    }

    // === Si aucune entrée trouvée → page vide → on s'arrête ===
    if (membersOnPage.length <= 1) {
      break;
    }

    // Ajouter sans doublons
    allMembers.push(...membersOnPage);

    // === Debug pagination ===
    console.log(`Page start=${start}: ${membersOnPage.length} membres`);

    // === Page suivante ===
    start += pageSize;
  }

  return allMembers.filter((m) => m.forumId !== '1');
}

export async function fetchMemberRps(profileUrl: string): Promise<number> {
  const res = await rateLimitedGet(profileUrl);
  const $ = cheerio.load(res.data);

  // À ADAPTER au DOM réel :
  const raw = $('.hidden_fields #field_id-13 field div').text().trim();
  const points = parseInt(raw, 10);

  if (Number.isNaN(points)) {
    throw new Error(`Impossible de lire les points sur ${profileUrl}`);
  }

  return points;
}
