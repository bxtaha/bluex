import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Admin authentication.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * This is a placeholder, and it should be read as one. It has ONE account, and
 * that account's password is compared as plaintext. What it does give you is
 * the one property a fake login usually lacks: the password is never sent to
 * the browser. It is read here, on the server, and this module is imported only
 * by route handlers and server components, so it cannot end up in a client
 * bundle where anyone could read it out of the JavaScript.
 *
 * Before this guards anything that actually matters, it needs: hashed passwords
 * (argon2/bcrypt), real accounts, and a shared rate limiter. See the note on
 * `tooManyAttempts` for why the one here is weaker than it looks.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "dev@taha.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "123456";

/**
 * Signs the session cookie.
 *
 * Without a signature the cookie would be a claim rather than proof — anyone
 * could type `bx_admin=1` into devtools and be an admin. The token carries its
 * own expiry and an HMAC of it, so it can be checked without any server-side
 * session store.
 *
 * A random per-process fallback means an unset secret fails safe: sessions do
 * not survive a restart, and will not verify across instances, but they can
 * never be forged. Set `ADMIN_SESSION_SECRET` to make them stable.
 */
const SESSION_SECRET =
  process.env.ADMIN_SESSION_SECRET ?? randomBytes(32).toString("hex");

export const SESSION_COOKIE = "bx_admin";

/** Eight hours — a working day, then you sign in again. */
export const SESSION_MAX_AGE = 60 * 60 * 8;

function sign(payload: string): string {
  return createHmac("sha256", SESSION_SECRET).update(payload).digest("hex");
}

/** Compares without leaking, through timing, how much of the value matched. */
function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");
  // Lengths are compared first because timingSafeEqual throws on a mismatch.
  // That does leak length, which for a password is not worth defending.
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function createSessionToken(): string {
  const expiresAt = String(Date.now() + SESSION_MAX_AGE * 1000);
  return `${expiresAt}.${sign(expiresAt)}`;
}

export function isValidSession(token: string | undefined): boolean {
  if (!token) return false;

  const [expiresAt, signature] = token.split(".");
  if (!expiresAt || !signature) return false;
  if (!safeEqual(signature, sign(expiresAt))) return false;

  const expiry = Number(expiresAt);
  return Number.isFinite(expiry) && expiry > Date.now();
}

export function isValidLogin(email: unknown, password: unknown): boolean {
  if (typeof email !== "string" || typeof password !== "string") return false;

  // Both are always compared, rather than short-circuiting on the email, so a
  // wrong address and a wrong password take the same path.
  const emailOk = safeEqual(email.trim().toLowerCase(), ADMIN_EMAIL.toLowerCase());
  const passwordOk = safeEqual(password, ADMIN_PASSWORD);
  return emailOk && passwordOk;
}

/* ── Attempt throttling ─────────────────────────────────────────────────────
   A six-character password with unlimited guesses is not a password, so this
   is here rather than absent. Be clear about what it is worth: the map lives in
   one process, so it does not survive a restart and is not shared between
   serverless instances. It raises the cost of a naive script; it is not a
   defence against a determined one. A real deployment wants this in Redis or
   at the edge. */

const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 8;
const attempts = new Map<string, { count: number; firstAt: number }>();

export function tooManyAttempts(key: string): boolean {
  const record = attempts.get(key);
  if (!record) return false;
  if (Date.now() - record.firstAt > WINDOW_MS) {
    attempts.delete(key);
    return false;
  }
  return record.count >= MAX_ATTEMPTS;
}

export function recordFailure(key: string): void {
  const now = Date.now();
  const record = attempts.get(key);

  if (!record || now - record.firstAt > WINDOW_MS) {
    attempts.set(key, { count: 1, firstAt: now });
    return;
  }
  record.count += 1;
}

export function clearAttempts(key: string): void {
  attempts.delete(key);
}
