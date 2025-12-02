// src/profile-scraper.ts
import { load } from 'cheerio';
import { getClient } from './forumApi'; // ou ton wrapper axios
// adapte l'import : prends le même client HTTP que dans le scraper principal

export async function fetchMemberPointsFromProfile(
  profileUrl: string
): Promise<number | null> {
  const c = getClient();
  const res = await c.get<string>(profileUrl, {
    validateStatus: () => true,
  });

  if (res.status >= 500) {
    throw new Error(
      `Erreur ${res.status} en récupérant le profil ${profileUrl}`
    );
  }

  const $ = load(res.data);

  // ⇩⇩⇩ recopie ici EXACTEMENT la logique de parsing que tu utilises déjà
  //     pour trouver le nombre de RPs / points sur la page profil.
  const pointsText = $('.hidden_fields #field_id-13 field div').text().trim();
  const points = parseInt(pointsText, 10);

  if (Number.isNaN(points)) return null;
  return points;
}
