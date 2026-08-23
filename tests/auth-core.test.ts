import assert from "node:assert/strict";
import test, { describe } from "node:test";
import {
  DUMMY_HASH,
  LOCKOUT_MS,
  MAX_FAILED_ATTEMPTS,
  SESSION_MAX_AGE,
  afterFailedAttempt,
  hashToken,
  isLockedOut,
  newToken,
  normaliseEmail,
  sessionExpiry,
} from "../lib/auth-core.ts";
import { hashPassword, verifyPassword } from "../lib/password.ts";

/**
 * The shared authentication primitives.
 *
 * No database and no network, so these run anywhere. What they cover is the
 * arithmetic that decides whether someone is locked out and whether a token can
 * be replayed — small functions where an off-by-one is either a permanent
 * lockout or no lockout at all, and neither is visible by reading the code.
 */

describe("token handling", () => {
  test("a token is 256 bits of randomness", () => {
    const token = newToken();
    assert.match(token, /^[0-9a-f]{64}$/, "expected 64 hex characters");
  });

  test("two tokens are never the same", () => {
    const tokens = new Set(Array.from({ length: 200 }, () => newToken()));
    assert.equal(tokens.size, 200);
  });

  test("the stored digest is not the token", () => {
    // The property the whole session design rests on: what is in the database
    // cannot be presented as a cookie.
    const token = newToken();
    assert.notEqual(hashToken(token), token);
    assert.match(hashToken(token), /^[0-9a-f]{64}$/);
  });

  test("hashing is stable, or no session would ever resolve", () => {
    const token = newToken();
    assert.equal(hashToken(token), hashToken(token));
  });

  test("different tokens do not collide", () => {
    assert.notEqual(hashToken(newToken()), hashToken(newToken()));
  });
});

describe("lockout arithmetic", () => {
  test("does not lock before the threshold", () => {
    for (let attempts = 0; attempts < MAX_FAILED_ATTEMPTS - 1; attempts += 1) {
      const result = afterFailedAttempt(attempts);
      assert.equal(
        result.lockedUntil,
        null,
        `locked after ${result.failedAttempts} attempts, before the limit of ${MAX_FAILED_ATTEMPTS}`,
      );
    }
  });

  test("locks exactly on the threshold, not one past it", () => {
    // The off-by-one that matters: locking at 9 gives an attacker a free guess,
    // and locking at 7 locks people out one attempt early.
    const result = afterFailedAttempt(MAX_FAILED_ATTEMPTS - 1);
    assert.equal(result.failedAttempts, MAX_FAILED_ATTEMPTS);
    assert.ok(result.lockedUntil, "expected a lockout at the threshold");
  });

  test("the lockout is in the future, and roughly the stated length", () => {
    const result = afterFailedAttempt(MAX_FAILED_ATTEMPTS - 1);
    const remaining = result.lockedUntil!.getTime() - Date.now();

    assert.ok(remaining > 0, "lockout already expired when it was created");
    assert.ok(
      Math.abs(remaining - LOCKOUT_MS) < 5000,
      `expected ~${LOCKOUT_MS}ms, got ${remaining}ms`,
    );
  });

  test("counts from undefined, so a record with no counter still locks", () => {
    assert.equal(afterFailedAttempt(undefined).failedAttempts, 1);
  });

  test("a past lockout is not a lockout", () => {
    assert.equal(isLockedOut({ lockedUntil: new Date(Date.now() - 1000) }), false);
  });

  test("a future lockout is", () => {
    assert.equal(isLockedOut({ lockedUntil: new Date(Date.now() + 60_000) }), true);
  });

  test("absent and null both mean not locked", () => {
    assert.equal(isLockedOut({}), false);
    assert.equal(isLockedOut({ lockedUntil: null }), false);
  });
});

describe("sessions", () => {
  test("expiry is in the future by the stated lifetime", () => {
    const remaining = sessionExpiry().getTime() - Date.now();
    assert.ok(
      Math.abs(remaining - SESSION_MAX_AGE * 1000) < 5000,
      `expected ~${SESSION_MAX_AGE}s, got ${remaining / 1000}s`,
    );
  });
});

describe("email normalising", () => {
  test("case and surrounding space collapse to one identity", () => {
    // Otherwise two records can exist for one address, and the unique index
    // will not stop it because the strings genuinely differ.
    const forms = ["Person@Example.com", "  person@example.com  ", "PERSON@EXAMPLE.COM"];
    for (const form of forms) {
      assert.equal(normaliseEmail(form), "person@example.com");
    }
  });
});

describe("password hashing", () => {
  test("a password verifies against its own hash", async () => {
    const hash = await hashPassword("correct horse battery staple");
    assert.equal(await verifyPassword("correct horse battery staple", hash), true);
  });

  test("a wrong password does not", async () => {
    const hash = await hashPassword("correct horse battery staple");
    assert.equal(await verifyPassword("Correct horse battery staple", hash), false);
    assert.equal(await verifyPassword("", hash), false);
  });

  test("the same password hashes differently every time", async () => {
    // Salted. Two identical passwords with identical hashes would let anyone
    // reading the table see which accounts share one.
    const [a, b] = await Promise.all([
      hashPassword("same password"),
      hashPassword("same password"),
    ]);
    assert.notEqual(a, b);
  });

  test("a malformed stored hash is a non-match, not a crash", async () => {
    for (const bad of ["", "not-a-hash", "scrypt$1$2$3", "bcrypt$a$b$c$d$e"]) {
      assert.equal(await verifyPassword("anything", bad), false);
    }
  });

  test("DUMMY_HASH is well-formed enough to actually cost time", async () => {
    // This is the test that protects the timing defence, and it is the least
    // obvious one here.
    //
    // Unknown accounts are compared against DUMMY_HASH so that "no such user"
    // takes as long as a real password check — otherwise the response time tells
    // an attacker which addresses exist. But `verifyPassword` returns false
    // *immediately* when it cannot parse the stored value. So if DUMMY_HASH were
    // ever malformed, it would still return false, every test of login
    // behaviour would still pass, and the enumeration defence would be silently
    // gone. Nothing about the code would look wrong.
    //
    // Asserting the shape parses is the real check; the timing assertion below
    // is generous enough not to be flaky but tight enough to catch an early
    // return.
    const parts = DUMMY_HASH.split("$");
    assert.equal(parts.length, 6, "DUMMY_HASH must have six $-separated parts");
    assert.equal(parts[0], "scrypt");

    const started = process.hrtime.bigint();
    assert.equal(await verifyPassword("anything", DUMMY_HASH), false);
    const elapsedMs = Number(process.hrtime.bigint() - started) / 1e6;

    assert.ok(
      elapsedMs > 5,
      `comparing against DUMMY_HASH took ${elapsedMs.toFixed(1)}ms — too fast to have run scrypt, so unknown accounts are distinguishable by timing`,
    );
  });
});
