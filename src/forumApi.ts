import axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import * as cheerio from "cheerio";

const BASE_URL = process.env.FORUM_BASE_URL!;
const COOKIE = process.env.FORUM_SESSION_COOKIE!;

// === CONFIG RATE LIMIT ===
const MIN_INTERVAL_MS = 1500;   // 1.5s entre deux requêtes (à ajuster)
const MAX_RETRIES = 5;

let lastRequestTime = 0;

function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

const client = axios.create({
  baseURL: BASE_URL,
  headers: {
    Cookie: COOKIE,
    "User-Agent": "ILH-PointsWatcher/1.0",
  },
});

// Fonction générique : toutes les requêtes passent par là
async function rateLimitedGet(
  url: string,
  config?: AxiosRequestConfig
): Promise<AxiosResponse<string>> {
  let attempt = 0;

  while (true) {
    attempt++;

    // Throttle simple : on s'assure d'attendre MIN_INTERVAL_MS
    const now = Date.now();
    const elapsed = now - lastRequestTime;
    if (elapsed < MIN_INTERVAL_MS) {
      await sleep(MIN_INTERVAL_MS - elapsed);
    }

    try {
      const res = await client.get<string>(url, {
        ...(config || {}),
        validateStatus: () => true, // on gère nous-mêmes les statuts
      });

      lastRequestTime = Date.now();

      if (res.status === 429) {
        // Trop de requêtes -> backoff agressif
        const retryAfterHeader = res.headers["retry-after"];
        const retryAfterSeconds = retryAfterHeader
          ? Number(retryAfterHeader)
          : null;

        const waitMs =
          retryAfterSeconds && !Number.isNaN(retryAfterSeconds)
            ? retryAfterSeconds * 1000
            : 30_000; // fallback : 30s

        console.warn(
          `429 sur ${url} (tentative ${attempt}/${MAX_RETRIES}), pause ${waitMs}ms`
        );

        if (attempt >= MAX_RETRIES) {
          throw new Error(
            `429 persistant sur ${url} après ${MAX_RETRIES} tentatives`
          );
        }

        await sleep(waitMs);
        continue; // retry
      }

      if (res.status >= 500 && attempt < MAX_RETRIES) {
        console.warn(
          `Erreur serveur ${res.status} sur ${url}, tentative ${attempt}/${MAX_RETRIES}`
        );
        await sleep(2_000);
        continue;
      }

      if (res.status >= 400) {
        throw new Error(`HTTP ${res.status} sur ${url}`);
      }

      return res;
    } catch (err) {
      // Erreur réseau / timeout
      if (attempt >= MAX_RETRIES) {
        throw err;
      }
      console.warn(
        `Erreur réseau sur ${url}, tentative ${attempt}/${MAX_RETRIES}, on retry dans 2s`
      );
      await sleep(2_000);
    }
  }
}


const SELECTOR_MEMBER_ROW = "table.table1 tr"; // EXEMPLE
const SELECTOR_PROFILE_LINK = 'a[href*="/u"]';      // souvent ça marche tel quel


export interface ForumMemberInfo {
  forumId: string;   // ex: "1234"
  username: string;  // pseudo
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
      const href = link.attr("href") || "";
      const username = link.text().trim();

      const match = href.match(/\/u(\d+)/);
      const forumId = match?.[1];

      if (!forumId || !username || !href.includes("/u")) return;

      membersOnPage.push({
        forumId,
        username,
        profileUrl: href.startsWith("https") ? href : BASE_URL + href,
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

  return allMembers.filter(m => m.forumId !== "1");
}

export async function fetchMemberRps(profileUrl: string): Promise<number> {
  const res = await rateLimitedGet(profileUrl);
  const $ = cheerio.load(res.data);

  // À ADAPTER au DOM réel :
  const raw = $(".hidden_fields #field_id-13 field div").text().trim();  
  const points = parseInt(raw, 10);

  if (Number.isNaN(points)) {
    throw new Error(`Impossible de lire les points sur ${profileUrl}`);
  }

  return points;
}
