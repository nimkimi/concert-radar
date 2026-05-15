import { describe, it, expect, vi } from "vitest";
import { encryptedPrismaAdapter, getAccountTokens } from "@/lib/auth/encrypted-adapter";
import { encrypt, decrypt } from "@/lib/crypto";

const KEY = "0".repeat(64);

type CapturedCreate = { data: any };

function buildMockPrisma() {
  const created: CapturedCreate[] = [];
  const mockAccount = {
    create: vi.fn(async ({ data }: CapturedCreate) => {
      created.push({ data });
      return { id: "acc_1", ...data };
    }),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(async ({ data }) => data),
    delete: vi.fn(),
  };
  return {
    prisma: {
      account: mockAccount,
      user: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
      session: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
      verificationToken: { findUnique: vi.fn(), create: vi.fn(), delete: vi.fn() },
    } as any,
    created,
    mockAccount,
  };
}

describe("encryptedPrismaAdapter.linkAccount", () => {
  it("encrypts access_token and refresh_token before writing", async () => {
    const { prisma, created } = buildMockPrisma();
    const adapter = encryptedPrismaAdapter(prisma, KEY);

    await adapter.linkAccount!({
      userId: "u_1",
      type: "oauth",
      provider: "spotify",
      providerAccountId: "spotify_id_1",
      access_token: "raw-access-token-value",
      refresh_token: "raw-refresh-token-value",
      expires_at: 1700000000,
      token_type: "Bearer",
      scope: "user-top-read",
    } as any);

    expect(created).toHaveLength(1);
    const written = created[0].data;
    expect(written.access_token).not.toBe("raw-access-token-value");
    expect(written.refresh_token).not.toBe("raw-refresh-token-value");
    expect(decrypt(written.access_token, KEY)).toBe("raw-access-token-value");
    expect(decrypt(written.refresh_token, KEY)).toBe("raw-refresh-token-value");
    // Non-token fields pass through untouched.
    expect(written.userId).toBe("u_1");
    expect(written.provider).toBe("spotify");
    expect(written.expires_at).toBe(1700000000);
  });

  it("leaves null tokens as null", async () => {
    const { prisma, created } = buildMockPrisma();
    const adapter = encryptedPrismaAdapter(prisma, KEY);

    await adapter.linkAccount!({
      userId: "u_1",
      type: "oauth",
      provider: "spotify",
      providerAccountId: "spotify_id_1",
      access_token: null,
      refresh_token: null,
    } as any);

    expect(created[0].data.access_token).toBeNull();
    expect(created[0].data.refresh_token).toBeNull();
  });
});

describe("getAccountTokens", () => {
  it("returns decrypted tokens for a user", async () => {
    const { prisma, mockAccount } = buildMockPrisma();
    mockAccount.findFirst.mockResolvedValue({
      access_token: encrypt("plaintext-access", KEY),
      refresh_token: encrypt("plaintext-refresh", KEY),
      expires_at: 1700000000,
    });

    const tokens = await getAccountTokens(prisma, "u_1", KEY);
    expect(tokens).toEqual({
      accessToken: "plaintext-access",
      refreshToken: "plaintext-refresh",
      expiresAt: 1700000000,
    });
    expect(mockAccount.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ userId: "u_1", provider: "spotify" }) }),
    );
  });

  it("returns null when no account row exists", async () => {
    const { prisma, mockAccount } = buildMockPrisma();
    mockAccount.findFirst.mockResolvedValue(null);
    const tokens = await getAccountTokens(prisma, "u_missing", KEY);
    expect(tokens).toBeNull();
  });
});
