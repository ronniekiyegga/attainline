import assert from "node:assert/strict";
import { test } from "node:test";
import { hashPassword, verifyPassword } from "../src/features/auth/password.js";
import {
  bearerToken,
  createSessionToken,
  hashSessionToken,
} from "../src/features/auth/session-token.js";

test("verifies a password against its own hash only", async () => {
  const hash = await hashPassword("correct horse battery staple");

  assert.match(hash, /^scrypt\$32768\$8\$1\$/);
  assert.equal(await verifyPassword("correct horse battery staple", hash), true);
  assert.equal(await verifyPassword("correct horse battery stapl", hash), false);
  assert.notEqual(await hashPassword("correct horse battery staple"), hash);
});

test("rejects malformed and truncated stored hashes", async () => {
  const hash = await hashPassword("synthetic-password");
  const [prefix, cost, blockSize, parallelism, salt] = hash.split("$");

  for (const stored of [
    "",
    "plaintext",
    hash.replace("scrypt", "bcrypt"),
    [prefix, cost, blockSize, parallelism, salt, "AAAA"].join("$"),
    [prefix, "0", blockSize, parallelism, salt, hash.split("$")[5]].join("$"),
  ]) {
    assert.equal(await verifyPassword("synthetic-password", stored), false, stored);
  }
});

test("issues unpredictable tokens and stores only their digest", () => {
  const first = createSessionToken();
  const second = createSessionToken();

  assert.match(first, /^[A-Za-z0-9_-]{43}$/);
  assert.notEqual(first, second);
  assert.equal(hashSessionToken(first).length, 32);
  assert.notDeepEqual(hashSessionToken(first), hashSessionToken(second));
  assert.ok(!Buffer.from(hashSessionToken(first)).toString("utf8").includes(first));
});

test("accepts only a single well-formed bearer token", () => {
  const token = createSessionToken();

  assert.equal(bearerToken(`Bearer ${token}`), token);

  for (const header of [
    undefined,
    "",
    token,
    `bearer ${token}`,
    `Basic ${token}`,
    `Bearer ${token} extra`,
    `Bearer  ${token}`,
    `Bearer ${token.slice(1)}`,
    `Bearer ${token}=`,
  ]) {
    assert.equal(bearerToken(header), null, String(header));
  }
});
