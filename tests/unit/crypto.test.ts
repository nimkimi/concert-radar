import { describe, it, expect } from "vitest";
import { encrypt, decrypt } from "@/lib/crypto";

const KEY = "0".repeat(64); // 32 bytes of zero as hex

describe("crypto", () => {
  it("round-trips a string", () => {
    const ct = encrypt("hello world", KEY);
    expect(ct).not.toBe("hello world");
    expect(decrypt(ct, KEY)).toBe("hello world");
  });

  it("round-trips UTF-8", () => {
    const ct = encrypt("Sigur Rós · Mø · 🎵", KEY);
    expect(decrypt(ct, KEY)).toBe("Sigur Rós · Mø · 🎵");
  });

  it("produces a different ciphertext each call (random IV)", () => {
    expect(encrypt("x", KEY)).not.toBe(encrypt("x", KEY));
  });

  it("throws when ciphertext is tampered with", () => {
    const ct = encrypt("hello", KEY);
    const bad = ct.slice(0, -2) + "AA";
    expect(() => decrypt(bad, KEY)).toThrow();
  });

  it("throws when decrypting with a different key", () => {
    const ct = encrypt("hello", KEY);
    const wrongKey = "1".repeat(64);
    expect(() => decrypt(ct, wrongKey)).toThrow();
  });

  it("rejects malformed payloads", () => {
    expect(() => decrypt("not-a-valid-payload", KEY)).toThrow();
  });
});
