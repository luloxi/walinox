import { PrismaClient } from "@prisma/client";

const g = globalThis as unknown as { __walinoxPrisma?: PrismaClient };

function prismaUrl(): string | undefined {
  let url =
    process.env.POSTGRES_PRISMA_URL ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL;
  if (!url) return undefined;
  url = url.trim().replace(/^['"]|['"]$/g, "");
  if (!url || url === '""') return undefined;
  try {
    const parsed = new URL(url);
    parsed.searchParams.delete("channel_binding");
    return parsed.toString();
  } catch {
    return url;
  }
}

export function databaseConfigured(): boolean {
  return Boolean(prismaUrl());
}

export function getPrisma(): PrismaClient | null {
  const url = prismaUrl();
  if (!url) return null;
  if (!g.__walinoxPrisma) {
    g.__walinoxPrisma = new PrismaClient({
      datasources: { db: { url } },
    });
  }
  return g.__walinoxPrisma;
}
