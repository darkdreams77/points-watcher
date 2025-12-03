import axios from "axios";
import "dotenv/config";

const TEST_URL = "https://www.i-love-harvard.com/profile?mode=editprofile"; 
// Une page accessible seulement si tu es connectée

async function run() {
  try {
    const res = await axios.get(TEST_URL, {
      headers: {
        Cookie: process.env.FORUM_SESSION_COOKIE!,
        "User-Agent": "CookieTestBot/1.0",
      },
      validateStatus: () => true,
    });

    console.log("Statut HTTP :", res.status);
    console.log("Taille HTML :", res.data?.length);

    // Test 1 — Statut doit être 200
    if (res.status !== 200) {
      console.log("Échec : pas de statut 200.");
      return;
    }

    // Test 2 — Vérifier ton pseudo dans le HTML
    // (remplace Marine par ton pseudo Forumactif EXACT)
    const html = res.data as string;

    if (html.includes("class=\"username\"") || html.includes("Pluton")) {
      console.log(">>> COOKIE OK (page connectée)");
    } else if (html.includes("Invité") || html.includes("Connexion")) {
      console.log(">>> COOKIE NON VALIDE (tu es vue comme invité)");
    } else {
      console.log(">>> COOKIE INCONNU : je ne vois ni connecté ni invité dans le HTML");
    }

  } catch (err: any) {
    console.error("Erreur de requête :", err.message);
  }
}

run();
