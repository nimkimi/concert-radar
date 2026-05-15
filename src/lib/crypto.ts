import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

// AES-256-GCM with a 12-byte IV. Payload is "iv:ciphertext:tag", all base64.
// keyHex is a 64-character hex string representing a 32-byte key.

const IV_LEN = 12;

function keyBuffer(keyHex: string): Buffer {
  if (keyHex.length !== 64 || !/^[0-9a-fA-F]+$/.test(keyHex)) {
    throw new Error("crypto: keyHex must be 64 hex characters (32 bytes)");
  }
  return Buffer.from(keyHex, "hex");
}

export function encrypt(plain: string, keyHex: string): string {
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv("aes-256-gcm", keyBuffer(keyHex), iv);
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, ciphertext, tag].map((b) => b.toString("base64")).join(":");
}

export function decrypt(payload: string, keyHex: string): string {
  const parts = payload.split(":");
  if (parts.length !== 3) {
    throw new Error("crypto: malformed payload");
  }
  const [ivB64, ctB64, tagB64] = parts;
  const iv = Buffer.from(ivB64, "base64");
  const ciphertext = Buffer.from(ctB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const decipher = createDecipheriv("aes-256-gcm", keyBuffer(keyHex), iv);
  decipher.setAuthTag(tag);
  const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plain.toString("utf8");
}
