import { createHash, randomBytes } from "node:crypto";

const TOKEN_BYTES = 32;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export function createSessionToken(): string {
  return randomBytes(TOKEN_BYTES).toString("base64url");
}

export function hashSessionToken(token: string): Uint8Array<ArrayBuffer> {
  return new Uint8Array(createHash("sha256").update(token).digest());
}

export function bearerToken(authorization: string | undefined): string | null {
  const [scheme, token, ...rest] = authorization?.split(" ") ?? [];

  return scheme === "Bearer" && token && rest.length === 0 && TOKEN_PATTERN.test(token)
    ? token
    : null;
}
