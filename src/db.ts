import { PrismaClient } from "@prisma/client";

export const db = new PrismaClient();
// pas besoin de passer l’URL ici : c’est géré par prisma.config.ts
