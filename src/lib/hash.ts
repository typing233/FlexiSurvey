import { createHash } from "crypto";

const SALT = process.env.HASH_SALT || "flexisurvey-default-salt";

export function hashIP(ip: string): string {
  return createHash("sha256")
    .update(`${SALT}:${ip}`)
    .digest("hex")
    .substring(0, 16);
}
