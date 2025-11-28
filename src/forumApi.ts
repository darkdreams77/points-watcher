import axios, { AxiosInstance } from "axios";
import { wrapper } from "axios-cookiejar-support";
import { CookieJar } from "tough-cookie";
import * as cheerio from "cheerio";

const BASE_URL = process.env.FORUM_BASE_URL!;
const FORUM_USERNAME = process.env.FORUM_USERNAME!;
const FORUM_PASSWORD = process.env.FORUM_PASSWORD!;

if (!BASE_URL) throw new Error("FORUM_BASE_URL manquant");

let client: AxiosInstance | null = null;

function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

const MIN_INTERVAL_MS = 1500;
let lastRequestTime = 0;

// 1) Création d’un client connecté
async function createLoggedClient(): Promise<AxiosInstance> {
  if (client) return client;

  const jar = new CookieJar();

  let rawClient = axios.create({
    baseURL: BASE_URL,
    withCredentials: true,
    jar,
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, comme Gecko) Chrome/124.0.0.0 Safari/537.36",
    },
  });

  rawClient = wrapper(rawClient);

  // 1) GET page de login
  const loginPage = await rawClient.get("/login");
  const $ = cheerio.load(loginPage.data);

  // On récupère le premier <form> de login
  const form = $("form").first();
  if (!form.length) {
    throw new Error("Impossible de trouver le formulaire de login sur /login");
  }

  let action = form.attr("action") || "/login";
  if (!action.startsWith("http")) {
    // action relative
    if (!action.startsWith("/")) {
      action = "/" + action;
    }
  }

  const params = new URLSearchParams();

  // On prend TOUS les input[name], puis on écrase username/password
  form.find("input[name]").each((_, el) => {
    const name = $(el).attr("name");
    if (!name) return;
    let value = $(el).attr("value") ?? "";

    if (name.toLowerCase().includes("username")) {
      value = FORUM_USERNAME;
    }
    if (name.toLowerCase().includes("password")) {
      value = FORUM_PASSWORD;
    }

    // certains champs de type "submit" n'ont pas forcément besoin d'être envoyés, mais ça ne gêne pas
    params.set(name, value);
  });

  // 2) POST login
  const loginRes = await rawClient.post(action, params.toString(), {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    maxRedirects: 0,
    validateStatus: (s) => s === 302 || s === 200,
  });

  // Debug optionnel
  if (loginRes.status !== 302 && loginRes.status !== 200) {
    console.warn("⚠️ Login Forumactif : réponse inattendue", loginRes.status);
  }

  // 3) Vérification qu’on est bien connectés
  const profileRes = await rawClient.get("/profile?mode=editprofile");

  if (
    profileRes.data.includes("Connexion") ||
    profileRes.data.includes("S'enregistrer")
  ) {
    // ici tu peux logguer un extrait pour debug si besoin
    throw new Error("Login Forumactif échoué depuis la CI");
  }

  client = rawClient;
  return client;
}

// 2) Wrapper rate-limité pour toutes les requêtes
export async function rateLimitedGet(url: string) {
  const c = await createLoggedClient();

  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < MIN_INTERVAL_MS) {
    await sleep(MIN_INTERVAL_MS - elapsed);
  }

  const res = await c.get<string>(url, {
    validateStatus: () => true,
  });

  lastRequestTime = Date.now();
  return res;
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
