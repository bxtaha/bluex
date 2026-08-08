import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import type { Collection, ObjectId } from "mongodb";
// Relative, with the extension: these are siblings, and spelling them this way
// keeps the module resolvable by plain Node as well as by the bundler — the
// seed script imports it directly, and Node does not know the `@/` alias.
import { getDb } from "./mongodb.ts";
import { hashPassword, verifyPassword } from "./password.ts";

/**
 * Admin authentication, backed by MongoDB.
 *
 * Three things here are what separate this from the placeholder it replaces:
 *
 * - Passwords are stored as scrypt hashes, never as plaintext. Nothing in this
 *   module can recover a password, including for the account it just checked.
 * - Sessions are rows, not claims. A signed stateless cookie cannot be revoked;
 *   a session document can be deleted, which is what makes signing out — and
 *   kicking a stolen session — actually mean something.
 * - Lockout is durable. The previous in-memory counter reset on restart and was
 *   invisible to other instances; this one is a field on the user.
 */

export const SESSION_COOKIE = "bx_admin";

/** Eight hours — a working day, then sign in again. */
export const SESSION_MAX_AGE = 60 * 60 * 8;

const MAX_FAILED_ATTEMPTS = 8;
const LOCKOUT_MS = 15 * 60 * 1000;

export type AdminUser = {
  _id?: ObjectId;
  email: string;
  name?: string;
  passwordHash: string;
  createdAt: Date;
  lastLoginAt?: Date;
  passwordChangedAt?: Date;
  failedAttempts: number;
  lockedUntil?: Date | null;
};

type AdminSession = {
  _id?: ObjectId;
  /** SHA-256 of the cookie value — see `createSession`. */
  tokenHash: string;
  userId: ObjectId;
  email: string;
  createdAt: Date;
  expiresAt: Date;
};

async function users(): Promise<Collection<AdminUser>> {
  const db = await getDb();
  return db.collection<AdminUser>("admin_users");
}

async function sessions(): Promise<Collection<AdminSession>> {
  const db = await getDb();
  return db.collection<AdminSession>("admin_sessions");
}

/** Emails are identity here, so they are matched in one canonical form. */
export function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Indexes. Called by the seed script rather than on every request.
 *
 * The TTL index on `expiresAt` is what stops the sessions collection growing
 * without limit — Mongo removes expired documents itself, so nothing in the app
 * has to remember to sweep. Expiry is still checked at read time, because the
 * TTL monitor only runs about once a minute.
 */
export async function ensureIndexes(): Promise<void> {
  const [userCollection, sessionCollection] = await Promise.all([
    users(),
    sessions(),
  ]);

  await userCollection.createIndex({ email: 1 }, { unique: true });
  await sessionCollection.createIndex({ tokenHash: 1 }, { unique: true });
  await sessionCollection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Issues a session and returns the cookie value.
 *
 * Only the hash is stored. Someone who reads the sessions collection — a leaked
 * backup, an aggregation pipeline in a log — gets digests they cannot present
 * as cookies, the same reason passwords are not stored either.
 */
export async function createSession(user: AdminUser): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const collection = await sessions();

  await collection.insertOne({
    tokenHash: hashToken(token),
    userId: user._id!,
    email: user.email,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + SESSION_MAX_AGE * 1000),
  });

  return token;
}

export type SessionUser = { email: string; name?: string };

/** Resolves a cookie to the account it belongs to, or null. */
export async function getSessionUser(
  token: string | undefined,
): Promise<SessionUser | null> {
  if (!token) return null;

  const collection = await sessions();
  const session = await collection.findOne({ tokenHash: hashToken(token) });
  if (!session) return null;

  // Checked here as well as by the TTL index: that monitor runs roughly once a
  // minute, so an expired session can still be present when it is presented.
  if (session.expiresAt.getTime() <= Date.now()) {
    await collection.deleteOne({ _id: session._id });
    return null;
  }

  const user = await (await users()).findOne({ _id: session.userId });
  if (!user) return null;

  return { email: user.email, name: user.name };
}

export async function destroySession(token: string | undefined): Promise<void> {
  if (!token) return;
  await (await sessions()).deleteOne({ tokenHash: hashToken(token) });
}

export type LoginResult =
  | { ok: true; user: AdminUser }
  | { ok: false; reason: "invalid" | "locked" };

/**
 * Verifies credentials.
 *
 * A missing account still pays for a password comparison, against a dummy hash.
 * Without that, "no such user" returns in a millisecond while a real user waits
 * for scrypt, and the difference tells an attacker which addresses exist.
 */
const DUMMY_HASH =
  "scrypt$32768$8$1$AAAAAAAAAAAAAAAAAAAAAA==$" +
  "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

export async function login(
  emailInput: unknown,
  passwordInput: unknown,
): Promise<LoginResult> {
  if (typeof emailInput !== "string" || typeof passwordInput !== "string") {
    return { ok: false, reason: "invalid" };
  }

  const email = normaliseEmail(emailInput);
  const collection = await users();
  const user = await collection.findOne({ email });

  if (!user) {
    await verifyPassword(passwordInput, DUMMY_HASH);
    return { ok: false, reason: "invalid" };
  }

  if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
    return { ok: false, reason: "locked" };
  }

  if (!(await verifyPassword(passwordInput, user.passwordHash))) {
    const failedAttempts = (user.failedAttempts ?? 0) + 1;
    await collection.updateOne(
      { _id: user._id },
      {
        $set: {
          failedAttempts,
          lockedUntil:
            failedAttempts >= MAX_FAILED_ATTEMPTS
              ? new Date(Date.now() + LOCKOUT_MS)
              : null,
        },
      },
    );
    return { ok: false, reason: "invalid" };
  }

  await collection.updateOne(
    { _id: user._id },
    { $set: { failedAttempts: 0, lockedUntil: null, lastLoginAt: new Date() } },
  );

  return { ok: true, user };
}

/** Shortest password the app will accept when one is being chosen. */
export const MIN_PASSWORD_LENGTH = 8;

export type ChangePasswordResult =
  | { ok: true; user: AdminUser }
  | { ok: false; reason: "invalid" | "weak" | "same" };

/**
 * Changes a signed-in account's password.
 *
 * The current password is required even though the caller already holds a valid
 * session. That is the point: a session proves the browser was once signed in,
 * not that the person at the keyboard is the account's owner. Without this step
 * an unattended laptop or a stolen cookie is enough to take the account
 * permanently, which is the one outcome a password change must not enable.
 */
export async function changePassword(
  email: string,
  currentPassword: unknown,
  newPassword: unknown,
): Promise<ChangePasswordResult> {
  if (typeof currentPassword !== "string" || typeof newPassword !== "string") {
    return { ok: false, reason: "invalid" };
  }

  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    return { ok: false, reason: "weak" };
  }

  const collection = await users();
  const user = await collection.findOne({ email: normaliseEmail(email) });
  if (!user) return { ok: false, reason: "invalid" };

  if (!(await verifyPassword(currentPassword, user.passwordHash))) {
    return { ok: false, reason: "invalid" };
  }

  if (currentPassword === newPassword) {
    return { ok: false, reason: "same" };
  }

  await collection.updateOne(
    { _id: user._id },
    {
      $set: {
        passwordHash: await hashPassword(newPassword),
        passwordChangedAt: new Date(),
        failedAttempts: 0,
        lockedUntil: null,
      },
    },
  );

  return { ok: true, user };
}

/**
 * Drops every session belonging to an account.
 *
 * Called after a password change, which is usually made *because* something is
 * wrong — a shared password, a machine left signed in, a suspicion. If the old
 * sessions survived it, the change would lock out nobody: whoever already had a
 * cookie would keep the account for another eight hours. The browser doing the
 * changing is given a fresh session immediately, so only everyone else is
 * signed out.
 */
export async function revokeAllSessions(userId: ObjectId): Promise<number> {
  const result = await (await sessions()).deleteMany({ userId });
  return result.deletedCount ?? 0;
}

/** Creates the account, or resets its password if it already exists. */
export async function upsertAdminUser(
  emailInput: string,
  password: string,
  name?: string,
): Promise<{ email: string; created: boolean }> {
  const email = normaliseEmail(emailInput);
  const collection = await users();
  const passwordHash = await hashPassword(password);

  const result = await collection.updateOne(
    { email },
    {
      $set: { passwordHash, failedAttempts: 0, lockedUntil: null, ...(name ? { name } : {}) },
      $setOnInsert: { email, createdAt: new Date() },
    },
    { upsert: true },
  );

  return { email, created: result.upsertedCount > 0 };
}

export async function countAdminUsers(): Promise<number> {
  return (await users()).countDocuments();
}

/** Exported for the tests that do not exist yet, and for parity of intent. */
export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}
