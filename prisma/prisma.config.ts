import { defineConfig } from "@prisma/config";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

export default defineConfig({
  datasource: {
    db: async () => {
      const url = process.env.DATABASE_URL;
      if (!url) throw new Error("DATABASE_URL is missing");

      const pool = new pg.Pool({
        connectionString: url,
      });

      // Adapter Prisma 7 PostgreSQL
      const adapter = new PrismaPg(pool);

      return { adapter };
    },
  },
});
