import { PrismaClient } from "@prisma/client";

/**
 * Instância única do PrismaClient compartilhada por toda a aplicação.
 * Centralizar aqui evita múltiplas conexões abertas, especialmente
 * relevante com hot-reload em desenvolvimento (ts-node-dev).
 */

declare global {
  // Permite que a variável survive ao hot-reload do ts-node-dev
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

const prisma: PrismaClient =
  global.__prisma ?? new PrismaClient({ log: ["query", "error", "warn"] });

if (process.env.NODE_ENV !== "production") {
  global.__prisma = prisma;
}

export default prisma;
