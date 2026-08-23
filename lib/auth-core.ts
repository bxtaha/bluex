import { createHash, randomBytes } from "node:crypto";

/**
 * The parts of authentication that are identical for every kind of account.
 *
 * There are two principals in this app — administrators and clients — and they
 * are deliberately kept in separate collections behind separate cookies, so that
 * a client session is structurally incapable of satisfying an admin guard. That
 * isolation is the point, but it would be worthless if it were bought by copying
 * `admin-auth.ts` and letting the copy drift: the scrypt parameters, the session
 * expiry and the lockout thresholds would then exist twice, and a security fix
 * applied to one and not the other is the predictable failure.
 *
 * So the shared parts live here and the *storage* stays separate. Nothing in
 * this file knows which collection it is serving, and nothing in it touches the
 * database — that is what makes it safe to share between two authentication
 * systems that must not be able to impersonate one another.
 */

/** Shortest password either kind of account may choose. */
export const MIN_PASSWORD_LENGTH = 8;

/** Eight hours — a working day, then sign in again. */
export const SESSION_MAX_AGE = 60 * 60 * 8;

/**
 * After this many consecutive failures the account is locked for `LOCKOUT_MS`.
 *
 * This is the per-account half of the defence; the per-address half is a rate
 * limit at the route, and neither is sufficient alone. Without the rate limit
 * this counter is itself an attack — knowing an email is enough to lock its
 * owner out on demand.
 */
export const MAX_FAILED_ATTEMPTS = 8;
export const LOCKOUT_MS = 15 * 60 * 1000;

/** Emails are identity here, so they are matched in one canonical form. */
export function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * A 256-bit random token, hex encoded.
 *
 * Used for both session cookies and setup links. `randomBytes` rather than
 * anything seeded from time or `Math.random`: a guessable session token is a
 * login, and a guessable setup link is an account takeover.
 */
export function newToken(): string {
  return randomBytes(32).toString("hex");
}

/**
 * What actually gets stored for any token we issue.
 *
 * Only the digest is persisted, never the token. Someone who reads the sessions
 * collection — a leaked backup, an aggregation pipeline that ended up in a log —
 * gets values they cannot present as cookies. Same reasoning as not storing
 * passwords, and it applies just as much to setup links, which are credentials
 * with an expiry rather than something less sensitive.
 *
 * SHA-256 without a work factor is correct here and would be wrong for a
 * password: these tokens are 256 bits of uniform randomness, so there is no
 * dictionary to slow an attacker down against. The work factor in `password.ts`
 * exists because human-chosen passwords are guessable, and that is the only
 * reason it exists.
 */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * A hash no password produces, for accounts that do not exist.
 *
 * A missing account still pays for a password comparison against this. Without
 * it, "no such user" returns in a millisecond while a real user waits for
 * scrypt, and the difference tells an attacker which addresses are real — which
 * turns a login form into an account enumeration endpoint.
 */
export const DUMMY_HASH =
  "scrypt$32768$8$1$AAAAAAAAAAAAAAAAAAAAAA==$" +
  "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

/** Whether a lockout is currently in force. Absent or past means no. */
export function isLockedOut(account: {
  lockedUntil?: Date | null;
}): boolean {
  return !!account.lockedUntil && account.lockedUntil.getTime() > Date.now();
}

/**
 * The fields to write after a failed attempt.
 *
 * Returned rather than applied so the caller decides which collection it lands
 * in, which is what lets both principals share the thresholds without sharing
 * storage.
 */
export function afterFailedAttempt(currentAttempts: number | undefined): {
  failedAttempts: number;
  lockedUntil: Date | null;
} {
  const failedAttempts = (currentAttempts ?? 0) + 1;

  return {
    failedAttempts,
    lockedUntil:
      failedAttempts >= MAX_FAILED_ATTEMPTS
        ? new Date(Date.now() + LOCKOUT_MS)
        : null,
  };
}

/** The fields to write after a successful sign-in. */
export function afterSuccessfulLogin(): {
  failedAttempts: number;
  lockedUntil: null;
  lastLoginAt: Date;
} {
  return { failedAttempts: 0, lockedUntil: null, lastLoginAt: new Date() };
}

/** When a session issued now should stop being accepted. */
export function sessionExpiry(): Date {
  return new Date(Date.now() + SESSION_MAX_AGE * 1000);
}
