import "server-only";
import { createHash, createHmac, randomInt, randomUUID, timingSafeEqual } from "node:crypto";

export function sha256(value: Buffer | string) {
  return createHash("sha256").update(value).digest("hex");
}
export function hashOtp(code: string, email: string) {
  const secret = process.env.OTP_HASH_SECRET;
  if (!secret || secret.length < 32) throw new Error("OTP_HASH_SECRET doit contenir au moins 32 caractères.");
  return createHmac("sha256", secret).update(`${email.toLowerCase()}:${code}`).digest("hex");
}
export function createOtp() { return randomInt(0, 1_000_000).toString().padStart(6, "0"); }
export function safeEqual(a: string, b: string) {
  const aa = Buffer.from(a); const bb = Buffer.from(b);
  return aa.length === bb.length && timingSafeEqual(aa, bb);
}
export const newId = () => randomUUID();
