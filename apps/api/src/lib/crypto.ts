import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { env } from "./env.js";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function getKey(): Buffer {
  const key = Buffer.from(env.MASTER_ENCRYPTION_KEY, "base64");
  if (key.length !== 32) {
    throw new Error(
      `MASTER_ENCRYPTION_KEY must be 32 bytes after base64 decode, got ${key.length}`
    );
  }
  return key;
}

export function seal(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);

  const cipher = createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  const packed = Buffer.concat([iv, authTag, encrypted]);
  return packed.toString("base64");
}

export function open(sealed: string): string {
  const key = getKey();
  const packed = Buffer.from(sealed, "base64");

  const iv = packed.subarray(0, IV_LENGTH);
  const authTag = packed.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = packed.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}

export function validateEncryptionKey(): void {
  try {
    const key = Buffer.from(env.MASTER_ENCRYPTION_KEY, "base64");
    if (key.length !== 32) {
      throw new Error(`Key must be 32 bytes, got ${key.length}`);
    }
    const test = "boot-validation-test";
    const sealed = seal(test);
    const opened = open(sealed);
    if (opened !== test) {
      throw new Error("Roundtrip validation failed");
    }
    console.log("✅ Encryption key validated (AES-256-GCM, 32-byte key)");
  } catch (err) {
    console.error("❌ MASTER_ENCRYPTION_KEY validation failed:", err);
    process.exit(1);
  }
}
