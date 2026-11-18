import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from "node:crypto";

const SCRYPT_COST = 2 ** 15;
const SCRYPT_BLOCK_SIZE = 8;
const SCRYPT_PARALLELISM = 1;
const KEY_BYTES = 32;
const SALT_BYTES = 16;
const MAX_MEMORY_BYTES = 64 * 1024 * 1024;
const HASH_PATTERN = /^scrypt\$(\d+)\$(\d+)\$(\d+)\$([A-Za-z0-9+/]+={0,2})\$([A-Za-z0-9+/]+={0,2})$/;

function deriveKey(password: string, salt: Buffer, options: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, KEY_BYTES, { ...options, maxmem: MAX_MEMORY_BYTES }, (error, key) => {
      if (error) reject(error);
      else resolve(key);
    });
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const key = await deriveKey(password, salt, {
    N: SCRYPT_COST,
    r: SCRYPT_BLOCK_SIZE,
    p: SCRYPT_PARALLELISM,
  });

  return [
    "scrypt",
    SCRYPT_COST,
    SCRYPT_BLOCK_SIZE,
    SCRYPT_PARALLELISM,
    salt.toString("base64"),
    key.toString("base64"),
  ].join("$");
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const match = HASH_PATTERN.exec(storedHash);

  if (!match) {
    return false;
  }

  const [, cost, blockSize, parallelism, salt, expected] = match;
  const expectedKey = Buffer.from(expected, "base64");

  if (expectedKey.length !== KEY_BYTES) {
    return false;
  }

  const key = await deriveKey(password, Buffer.from(salt, "base64"), {
    N: Number(cost),
    r: Number(blockSize),
    p: Number(parallelism),
  }).catch(() => null);

  return key !== null && timingSafeEqual(key, expectedKey);
}
