import crypto from "node:crypto";

const KEY_B64 = process.env.ENCRYPTION_KEY;
if (!KEY_B64) throw new Error("ENCRYPTION_KEY is not set");

const KEY = Buffer.from(KEY_B64, "base64");
if (KEY.length !== 32)
  throw new Error("ENCRYPTION_KEY must be 32 bytes (base64)");

export function encryptSecret(plaintext: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", KEY, iv);

  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return {
    pwdCipher: ciphertext.toString("base64"),
    pwdIv: iv.toString("base64"),
    pwdTag: tag.toString("base64"),
  };
}

export function decryptSecret(payload: {
  pwdCipher: string;
  pwdIv: string;
  pwdTag: string;
}) {
  const iv = Buffer.from(payload.pwdIv, "base64");
  const tag = Buffer.from(payload.pwdTag, "base64");
  const ciphertext = Buffer.from(payload.pwdCipher, "base64");

  const decipher = crypto.createDecipheriv("aes-256-gcm", KEY, iv);
  decipher.setAuthTag(tag);

  const plaintext = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);
  return plaintext.toString("utf8");
}
