import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

function normalizeRounds(rounds) {
  if (typeof rounds === "number" && Number.isFinite(rounds)) {
    return Math.max(4, Math.min(31, Math.trunc(rounds)));
  }

  return 10;
}

function deriveDigest(plain, salt) {
  return createHash("sha256").update(`${salt}:${plain}`).digest("base64url");
}

export async function hash(plain, rounds = 10) {
  const normalizedRounds = normalizeRounds(rounds);
  const salt = randomBytes(16).toString("base64url");
  const digest = deriveDigest(plain, salt);
  return `$2a$${String(normalizedRounds).padStart(2, "0")}$${salt}$${digest}`;
}

export async function compare(plain, encodedHash) {
  if (typeof encodedHash !== "string") {
    return false;
  }

  const parts = encodedHash.split("$");
  if (parts.length !== 5 || !parts[3] || !parts[4]) {
    return false;
  }

  const digest = deriveDigest(plain, parts[3]);
  const left = Buffer.from(digest);
  const right = Buffer.from(parts[4]);

  if (left.length !== right.length) {
    return false;
  }

  return timingSafeEqual(left, right);
}

export default {
  hash,
  compare,
};
