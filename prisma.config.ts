import path from "node:path";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  datasource: {
    // Prisma 7 reads the connection URL from this config, not from the schema.
    url: process.env.DATABASE_URL ?? "postgresql://bookit:bookit_dev@localhost:5432/bookit",
  },
});
