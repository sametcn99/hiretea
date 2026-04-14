import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { env } from "@/lib/env";

const ENCRYPTION_PREFIX = "v1";
const ENCRYPTION_ALGORITHM = "aes-256-gcm";
const IV_LENGTH_BYTES = 12;

function getEncryptionKey() {
  if (!env.HIRETEA_CONFIG_ENCRYPTION_KEY) {
    throw new Error(
      "HIRETEA_CONFIG_ENCRYPTION_KEY is required for external Gitea secret storage.",
    );
  }

  return createHash("sha256")
    .update(env.HIRETEA_CONFIG_ENCRYPTION_KEY, "utf8")
    .digest();
}

export function encryptExternalGiteaSecret(value: string) {
  const iv = randomBytes(IV_LENGTH_BYTES);
  const cipher = createCipheriv(ENCRYPTION_ALGORITHM, getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [
    ENCRYPTION_PREFIX,
    iv.toString("base64"),
    authTag.toString("base64"),
    encrypted.toString("base64"),
  ].join(":");
}

export function decryptExternalGiteaSecret(payload: string) {
  const [prefix, iv, authTag, encrypted] = payload.split(":");

  if (!prefix || !iv || !authTag || !encrypted || prefix !== ENCRYPTION_PREFIX) {
    throw new Error("Unsupported encrypted external Gitea secret payload.");
  }

  const decipher = createDecipheriv(
    ENCRYPTION_ALGORITHM,
    getEncryptionKey(),
    Buffer.from(iv, "base64"),
  );

  decipher.setAuthTag(Buffer.from(authTag, "base64"));

  return Buffer.concat([
    decipher.update(Buffer.from(encrypted, "base64")),
    decipher.final(),
  ]).toString("utf8");
}