import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";
import { wrapper } from "axios-cookiejar-support";
import * as cheerio from "cheerio";
import { CookieJar } from "tough-cookie";

const BASE_URL = process.env.FORUM_BASE_URL!;
// const COOKIE = process.env.FORUM_SESSION_COOKIE!;
const FORUM_USERNAME = process.env.FORUM_USERNAME!;
const FORUM_PASSWORD = process.env.FORUM_PASSWORD!;

// === CONFIG RATE LIMIT ===
const MIN_INTERVAL_MS = 1500;   // 1.5s entre deux requêtes (à ajuster)
const MAX_RETRIES = 5;

let lastRequestTime = 0;

function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

if (!BASE_URL) throw new Error("FORUM_BASE_URL manquant");
if (!FORUM_USERNAME || !FORUM_PASSWORD) {
  console.warn("FORUM_USERNAME / FORUM_PASSWORD manquants : login auto impossible");
}

let client: AxiosInstance | null = null;

async function createLoggedClient(): Promise<AxiosInstance> {
  if (client) return client;

  const jar = new CookieJar();
  const rawClient = axios.create({
    baseURL: BASE_URL,
    withCredentials: true,
    jar,
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
        "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    },
  });

  const wrapped = wrapper(rawClient);
  // 1) GET page de login (pour initialiser les cookies et éventuellement récupérer un token)
  const loginPage = await wrapped.get("/login");
  const $ = cheerio.load(loginPage.data);

  // Si phpBB/Forumactif utilise un token CSRF dans le formulaire, tu peux le récupérer ici.
  // À ajuster si tu vois un <input type="hidden" name="token" ...> dans le formulaire.
  const token = $('input[name="form_token"]').attr("value");

  // 2) POST login
  const form = new URLSearchParams();
  form.set("username", FORUM_USERNAME);
  form.set("password", FORUM_PASSWORD);
  form.set("login", "Connexion");   // texte du bouton, souvent "Connexion" sur Forumactif
  form.set("redirect", "/");        // où retourner après login
  form.set("autologin", "on");      // facultatif
  if (token) form.set("form_token", token);

  const loginRes = await wrapped.post("/login", form.toString(), {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    maxRedirects: 0,
    validateStatus: (s) => s === 302 || s === 200,
  });

  // Optionnel : vérifier qu’on est bien connecté (par ex. en rechargeant /profile)
  const profileRes = await wrapped.get("/profile?mode=editprofile");
  if (profileRes.data.includes("Connexion") || profileRes.data.includes("Invité")) {
    throw new Error("Login Forumactif échoué depuis la CI");
  }

  client = wrapped;
  return client;
}

// Fonction générique : toutes les requêtes passent par là
async function rateLimitedGet(url: string) {
  const c = await createLoggedClient(); // s’assure qu’on est loggé

  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < MIN_INTERVAL_MS) {
    await sleep(MIN_INTERVAL_MS - elapsed);
  }

  const res = await c.get<string>(url, { validateStatus: () => true });
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
