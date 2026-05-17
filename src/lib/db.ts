import { PrismaClient } from "@prisma/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function build(): PrismaClient {
  // Production runs against Turso via the libsql driver adapter. Locally,
  // when TURSO_DATABASE_URL is unset, fall back to the standard SQLite file
  // driver (DATABASE_URL=file:./dev.db) so `prisma migrate dev` and tests
  // keep working without any extra services.
  if (process.env.TURSO_DATABASE_URL) {
    const adapter = new PrismaLibSQL({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
    return new PrismaClient({ adapter });
  }
  return new PrismaClient();
}

export const prisma = globalForPrisma.prisma ?? build();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
