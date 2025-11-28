import axios from "axios";
import * as cheerio from "cheerio";
import { ForumMemberInfo } from "./types";

const BASE_URL = process.env.FORUM_BASE_URL!; // ex: https://tonforum.forumactif.com
const SESSION_COOKIE = process.env.FORUM_SESSION_COOKIE!;
// ex: "phpbb3_xxxxxx_sid=abcdef; phpbb3_xxxxxx_u=2; phpbb3_xxxxxx_k="

function getHttpClient() {
  return axios.create({
    baseURL: BASE_URL,
    headers: {
      Cookie: SESSION_COOKIE,
      "User-Agent": "ForumPointsWatcher/1.0 (+script cron)",
    },
  });
}

/**
 * Récupère la liste des membres d’un groupe donné.
 * À adapter à l’URL réelle des groupes Forumactif :
 * souvent un truc du genre /gXp1-groupe ou /gX-...
 */
export async function fetchGroupMembersFromForum(
  forumGroupId: string
): Promise<ForumMemberInfo[]> {
  const client = getHttpClient();

  // À ADAPTER : URL de la liste du groupe
  const url = `/g${forumGroupId}`; 

  const res = await client.get(url);
  const $ = cheerio.load(res.data);

  const members: ForumMemberInfo[] = [];

  // À ADAPTER : sélecteurs en fonction du HTML réel
  $(".memberrow").each((_, el) => {
    const username = $(el).find(".membername a").text().trim();
    const profileUrl = $(el).find(".membername a").attr("href") || "";
    const forumId = profileUrl.match(/u(\d+)/)?.[1] ?? "";

    if (forumId && username && profileUrl) {
      members.push({
        forumId,
        username,
        profileUrl: profileUrl.startsWith("http")
          ? profileUrl
          : BASE_URL + profileUrl,
      });
    }
  });

  return members;
}

/**
 * Récupère les points sur la page de profil.
 */
export async function fetchMemberPoints(profileUrl: string): Promise<number> {
  const client = getHttpClient();
  const res = await client.get(profileUrl);
  const $ = cheerio.load(res.data);

  // À adapter au DOM de tes "points"
  const pointsText = $(".user_points").text().trim(); 
  const points = parseInt(pointsText, 10);

  if (Number.isNaN(points)) {
    throw new Error(`Impossible de parser les points sur ${profileUrl}`);
  }

  return points;
}
