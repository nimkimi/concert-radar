import { PrismaAdapter } from "@auth/prisma-adapter";
import type { Adapter, AdapterAccount } from "next-auth/adapters";
import type { PrismaClient } from "@prisma/client";
import { encrypt, decrypt } from "@/lib/crypto";

// Wraps the Auth.js Prisma adapter so that OAuth `access_token` and
// `refresh_token` are AES-encrypted at rest. The plain columns on the
// Account model store ciphertext; nothing else changes.
//
// Use `getAccountTokens(prisma, userId, keyHex)` to read back decrypted
// tokens at runtime (e.g. before making Spotify API calls).

export function encryptedPrismaAdapter(prisma: PrismaClient, keyHex: string): Adapter {
  const base = PrismaAdapter(prisma) as Adapter;

  const wrapped: Adapter = {
    ...base,
    async linkAccount(account: AdapterAccount): Promise<void> {
      const encrypted = encryptAccountTokens(account, keyHex);
      await base.linkAccount!(encrypted);
    },
  };

  return wrapped;
}

export function encryptAccountTokens(account: AdapterAccount, keyHex: string): AdapterAccount {
  return {
    ...account,
    access_token: account.access_token ? encrypt(account.access_token, keyHex) : account.access_token,
    refresh_token: account.refresh_token ? encrypt(account.refresh_token, keyHex) : account.refresh_token,
  };
}

export type DecryptedTokens = {
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: number | null;
};

export async function getAccountTokens(
  prisma: PrismaClient,
  userId: string,
  keyHex: string,
  provider = "spotify",
): Promise<DecryptedTokens | null> {
  const row = await prisma.account.findFirst({
    where: { userId, provider },
    select: { access_token: true, refresh_token: true, expires_at: true },
  });
  if (!row) return null;
  return {
    accessToken: row.access_token ? decrypt(row.access_token, keyHex) : null,
    refreshToken: row.refresh_token ? decrypt(row.refresh_token, keyHex) : null,
    expiresAt: row.expires_at ?? null,
  };
}
