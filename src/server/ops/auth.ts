import "server-only";

import { createHmac, scryptSync, timingSafeEqual } from "node:crypto";

import { cookies, headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { signal } from "@/server/observe";

/**
 * WHO MAY OPEN THE OPERATIONS CONSOLE.
 *
 * The console shows customers' names, phones and addresses, so it is closed
 * by default and stays closed until the owner configures it:
 *
 *   OPS_ACCOUNTS         comma-separated `name:salt:hash` entries — one per
 *                        person, so every action is attributed to someone.
 *                        Generate an entry with `npm run ops:account -- <name>`;
 *                        the password is typed, never passed as an argument.
 *   OPS_SESSION_SECRET   at least 32 characters; signs the session cookie.
 *
 * Without both, every console route is a 404 — the console does not announce
 * that it exists.
 *
 * PASSWORDS are stored as scrypt hashes (Node's own crypto; no dependency),
 * compared in constant time. An unknown name costs the same scrypt as a known
 * one, so timing does not reveal which accounts exist.
 *
 * THE SESSION is an HMAC-signed cookie — httpOnly, SameSite=Strict, scoped to
 * `/ops`, 12 hours — carrying the operator's name and an expiry. Removing a
 * name from OPS_ACCOUNTS revokes that person's session on their next request;
 * rotating OPS_SESSION_SECRET revokes everyone's.
 *
 * NOT an identity provider, and not pretending to be one: no password reset,
 * no 2FA, no audit of reads. The lockout below lives in one server instance's
 * memory. For more than a handful of trusted operators, put the console behind
 * the host's access control (e.g. Vercel deployment protection) as well.
 */
const COOKIE = "neogen_ops";
const SESSION_MS = 12 * 60 * 60 * 1000;
export const OPS_PATH = "/ops";

/* scrypt parameters: N=2^14, r=8, p=1, 32-byte key. ~16 MB, well under
   Node's default maxmem, and slow enough to make offline guessing costly. */
const SCRYPT = { N: 16384, r: 8, p: 1 } as const;
const KEYLEN = 32;

export interface OpsAccount {
  name: string;
  salt: Buffer;
  hash: Buffer;
}

const b64url = (buf: Buffer) => buf.toString("base64url");

export function hashPassword(password: string, salt: Buffer): Buffer {
  return scryptSync(password.normalize("NFKC"), salt, KEYLEN, SCRYPT);
}

/** Parse OPS_ACCOUNTS. Malformed entries are ignored rather than half-trusted. */
export function parseAccounts(raw: string | undefined): OpsAccount[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((entry) => entry.trim().split(":"))
    .filter((parts) => parts.length === 3 && /^[a-z][a-z0-9._-]{1,31}$/.test(parts[0]))
    .map(([name, salt, hash]) => ({
      name,
      salt: Buffer.from(salt, "base64url"),
      hash: Buffer.from(hash, "base64url"),
    }))
    .filter((a) => a.salt.length >= 16 && a.hash.length === KEYLEN);
}

function secret(): string | null {
  const value = process.env.OPS_SESSION_SECRET ?? "";
  return value.length >= 32 ? value : null;
}

export function opsConfigured(): boolean {
  return secret() !== null && parseAccounts(process.env.OPS_ACCOUNTS).length > 0;
}

const DUMMY_SALT = Buffer.alloc(16, 7);

/** Constant-time check. Returns the account name, or null. */
export function verifyPassword(
  accounts: readonly OpsAccount[],
  name: string,
  password: string,
): string | null {
  const account = accounts.find((a) => a.name === name.trim().toLowerCase());
  const computed = hashPassword(password.slice(0, 256), account?.salt ?? DUMMY_SALT);
  if (!account) return null;
  return timingSafeEqual(computed, account.hash) ? account.name : null;
}

/* ------------------------------------------------------------ the session */

function sign(payload: string, key: string): string {
  return b64url(createHmac("sha256", key).update(payload).digest());
}

export function issueSession(name: string, key: string, now = Date.now()): string {
  const payload = b64url(Buffer.from(JSON.stringify({ n: name, e: now + SESSION_MS })));
  return `${payload}.${sign(payload, key)}`;
}

/** The operator a cookie value names, if the signature, expiry and account all hold. */
export function readSession(
  value: string | undefined,
  key: string,
  accounts: readonly OpsAccount[],
  now = Date.now(),
): string | null {
  if (!value) return null;
  const [payload, signature] = value.split(".");
  if (!payload || !signature) return null;
  const expected = Buffer.from(sign(payload, key));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const { n, e } = JSON.parse(Buffer.from(payload, "base64url").toString()) as {
      n?: unknown;
      e?: unknown;
    };
    if (typeof n !== "string" || typeof e !== "number" || e < now) return null;
    return accounts.some((a) => a.name === n) ? n : null;
  } catch {
    return null;
  }
}

export async function currentOperator(): Promise<string | null> {
  const key = secret();
  if (!key) return null;
  const jar = await cookies();
  return readSession(jar.get(COOKIE)?.value, key, parseAccounts(process.env.OPS_ACCOUNTS));
}

/**
 * For every console page and every console action. A server action is a
 * public endpoint: checking the page that rendered the form is not enough.
 */
export async function requireOperator(): Promise<string> {
  if (!opsConfigured()) notFound();
  const name = await currentOperator();
  if (!name) redirect(`${OPS_PATH}/acceso`);
  return name;
}

/* ------------------------------------------------------------ the lockout */

const LOCK_KEY = "__neogen_ops_lockout__";
const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 5;

function failures(): Map<string, number[]> {
  const g = globalThis as typeof globalThis & { [LOCK_KEY]?: Map<string, number[]> };
  g[LOCK_KEY] ??= new Map();
  return g[LOCK_KEY];
}

function recent(key: string, now: number): number[] {
  return (failures().get(key) ?? []).filter((t) => now - t < WINDOW_MS);
}

export function isLocked(keys: readonly string[], now = Date.now()): boolean {
  return keys.some((k) => recent(k, now).length >= MAX_FAILURES);
}

export function recordFailure(keys: readonly string[], now = Date.now()): void {
  for (const k of keys) failures().set(k, [...recent(k, now), now]);
}

export function clearFailures(keys: readonly string[]): void {
  for (const k of keys) failures().delete(k);
}

/** Test-only. */
export function __resetLockout(): void {
  failures().clear();
}

export type LoginResult = "ok" | "invalid" | "locked" | "disabled";

/** Verify, rate-limit, and set the cookie. Called by the login action only. */
export async function login(name: string, password: string): Promise<LoginResult> {
  const key = secret();
  const accounts = parseAccounts(process.env.OPS_ACCOUNTS);
  if (!key || accounts.length === 0) return "disabled";

  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || "local";
  const keys = [`ip:${ip}`, `name:${name.trim().toLowerCase()}`];
  if (isLocked(keys)) {
    signal("ops.login_locked", "warn", {});
    return "locked";
  }

  const operator = verifyPassword(accounts, name, password);
  if (!operator) {
    recordFailure(keys);
    signal("ops.login_failed", "warn", {});
    return "invalid";
  }
  clearFailures(keys);

  const jar = await cookies();
  jar.set(COOKIE, issueSession(operator, key), {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: OPS_PATH,
    maxAge: SESSION_MS / 1000,
  });
  return "ok";
}

export async function logout(): Promise<void> {
  const jar = await cookies();
  jar.delete({ name: COOKIE, path: OPS_PATH });
}
