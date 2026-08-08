// src/discord.ts
import axios from 'axios';

const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

export async function sendDiscordAlert(content: string): Promise<void> {
  if (!WEBHOOK_URL) {
    console.warn(
      '⚠ DISCORD_WEBHOOK_URL non défini — alerte Discord ignorée :\n' + content
    );
    return;
  }

  try {
    await axios.post(WEBHOOK_URL, { content: content.slice(0, 1900) });
  } catch (e) {
    console.error('❌ Échec de l’envoi de l’alerte Discord', e);
  }
}
