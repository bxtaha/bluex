import assert from "node:assert/strict";
import test, { after, describe } from "node:test";
// First, and before anything that touches the database: this redirects every
// query in the file to a scratch database. See tests/setup.ts.
import { dropTestDatabase, hasDatabase, uniqueEmail } from "./setup.ts";
import {
  CLIENT_SESSION_COOKIE,
  checkSetupToken,
  clientLogin,
  completeSetup,
  createClient,
  createClientSession,
  deleteClient,
  ensureClientIndexes,
  getClientSessionUser,
  listClients,
  reissueSetupToken,
  setClientStatus,
  updateClient,
} from "../lib/client-auth.ts";
import {
  SESSION_COOKIE,
  getSessionUser,
  upsertAdminUser,
  ensureIndexes,
  login as adminLogin,
} from "../lib/admin-auth.ts";
import { MAX_FAILED_ATTEMPTS } from "../lib/auth-core.ts";
import { getDb } from "../lib/mongodb.ts";

/**
 * The client system's security properties, against a real database.
 *
 * These are integration tests on purpose. Every property here is a property of
 * a *query* — an atomic conditional update, a filter that excludes suspended
 * accounts, a lookup in one collection failing to find a token from another —
 * and a mocked driver would only prove the mock agrees with itself.
 *
 * They run against `bx_test_suite`, created by these tests and dropped at the
 * end. Nothing here touches the app's collections.
 */

// Skipped rather than failed without a connection string, so `npm test` is still
// useful on a machine with no database. The unit suite covers what it can there.
const options = { skip: hasDatabase ? false : "MONGO_URI is not set" };

const PASSWORD = "a-long-enough-password";

after(async () => {
  if (!hasDatabase) return;
  await dropTestDatabase();
  // The driver holds a pooled socket open, which would keep the process alive
  // past the last test. `lib/mongodb.ts` caches its client on `globalThis`, so
  // that is where the handle is.
  const cached = (
    globalThis as { __bxMongoClient?: Promise<{ close: () => Promise<void> }> }
  ).__bxMongoClient;
  await (await cached)?.close();
});

/** A client that has completed setup, plus a live session token. */
async function activeClient() {
  const email = uniqueEmail("active");
  const created = await createClient({
    email,
    name: "Test Client",
    company: "Test Co",
    createdBy: "admin@example.test",
  });
  assert.ok(created.ok, "fixture client should have been created");

  const setup = await completeSetup(created.setupToken, PASSWORD);
  assert.ok(setup.ok, "fixture client should have completed setup");

  const sessionToken = await createClientSession(setup.client);
  return { email, id: created.client.id, sessionToken };
}

describe("setup links", options, () => {
  test("a link works exactly once", async () => {
    const created = await createClient({
      email: uniqueEmail("single-use"),
      name: "Single Use",
      createdBy: "admin@example.test",
    });
    assert.ok(created.ok);

    const first = await completeSetup(created.setupToken, PASSWORD);
    assert.ok(first.ok, "the first use should succeed");

    const second = await completeSetup(created.setupToken, "a-different-password");
    assert.equal(second.ok, false);
    assert.equal(
      (second as { reason: string }).reason,
      "used",
      "the second use must be refused — the link is single-use",
    );
  });

  test("two simultaneous uses cannot both win", async () => {
    // The reason `completeSetup` claims the token with one conditional update
    // instead of a read followed by a write. With a read-then-write both of
    // these pass the read, and the link is used twice.
    const created = await createClient({
      email: uniqueEmail("race"),
      name: "Race",
      createdBy: "admin@example.test",
    });
    assert.ok(created.ok);

    const results = await Promise.all([
      completeSetup(created.setupToken, PASSWORD),
      completeSetup(created.setupToken, "another-password-here"),
    ]);

    const succeeded = results.filter((result) => result.ok).length;
    assert.equal(succeeded, 1, `expected exactly one to succeed, got ${succeeded}`);
  });

  test("an expired link is refused", async () => {
    const email = uniqueEmail("expired");
    const created = await createClient({
      email,
      name: "Expired",
      createdBy: "admin@example.test",
    });
    assert.ok(created.ok);

    // Backdated directly, because waiting 72 hours is not a test.
    const db = await getDb();
    await db
      .collection("clients")
      .updateOne(
        { email },
        { $set: { setupTokenExpiresAt: new Date(Date.now() - 1000) } },
      );

    const check = await checkSetupToken(created.setupToken);
    assert.equal(check.valid, false);
    assert.equal((check as { reason: string }).reason, "expired");

    const result = await completeSetup(created.setupToken, PASSWORD);
    assert.equal(result.ok, false);
    assert.equal((result as { reason: string }).reason, "expired");
  });

  test("reissuing invalidates the previous link", async () => {
    const created = await createClient({
      email: uniqueEmail("reissue"),
      name: "Reissue",
      createdBy: "admin@example.test",
    });
    assert.ok(created.ok);

    const reissued = await reissueSetupToken(created.client.id);
    assert.ok(reissued, "reissue should have returned a new token");

    const old = await completeSetup(created.setupToken, PASSWORD);
    assert.equal(old.ok, false, "the superseded link must stop working");

    const fresh = await completeSetup(reissued.setupToken, PASSWORD);
    assert.ok(fresh.ok, "the new link should work");
  });

  test("a suspended client cannot activate through an old link", async () => {
    const created = await createClient({
      email: uniqueEmail("suspended-setup"),
      name: "Suspended Setup",
      createdBy: "admin@example.test",
    });
    assert.ok(created.ok);

    await setClientStatus(created.client.id, "suspended");

    const result = await completeSetup(created.setupToken, PASSWORD);
    assert.equal(
      result.ok,
      false,
      "an outstanding invitation must not be a way back in after suspension",
    );
  });

  test("a password below the minimum is refused", async () => {
    const created = await createClient({
      email: uniqueEmail("weak"),
      name: "Weak",
      createdBy: "admin@example.test",
    });
    assert.ok(created.ok);

    const result = await completeSetup(created.setupToken, "short");
    assert.equal(result.ok, false);
    assert.equal((result as { reason: string }).reason, "weak");

    // And the link survives, so someone who typed a short password can retry.
    const check = await checkSetupToken(created.setupToken);
    assert.equal(check.valid, true);
  });

  test("an unknown token is refused", async () => {
    const check = await checkSetupToken("f".repeat(64));
    assert.equal(check.valid, false);
    assert.equal((check as { reason: string }).reason, "unknown");
  });
});

describe("a client cannot become an administrator", options, () => {
  test("the two cookies are not the same name", () => {
    // Load-bearing. If these were ever unified into one constant, one browser
    // cookie would be offered to both systems and the separation below would be
    // the only thing left standing.
    assert.notEqual(SESSION_COOKIE, CLIENT_SESSION_COOKIE);
  });

  test("a client session token does not resolve as an admin", async () => {
    const { sessionToken } = await activeClient();

    // It works as what it is.
    assert.ok(
      await getClientSessionUser(sessionToken),
      "the client's own session should resolve",
    );

    // And is nothing at all to the admin system — not rejected by a role check,
    // simply absent from `admin_sessions`.
    assert.equal(
      await getSessionUser(sessionToken),
      null,
      "a client session token must not resolve to an administrator",
    );
  });

  test("an admin session token does not resolve as a client", async () => {
    await ensureIndexes();
    const adminEmail = uniqueEmail("admin");
    await upsertAdminUser(adminEmail, PASSWORD, "Test Admin");

    const result = await adminLogin(adminEmail, PASSWORD);
    assert.ok(result.ok, "the admin fixture should sign in");

    const { createSession } = await import("../lib/admin-auth.ts");
    const adminToken = await createSession(result.user);

    assert.ok(await getSessionUser(adminToken));
    assert.equal(
      await getClientSessionUser(adminToken),
      null,
      "an admin session token must not resolve to a client either",
    );
  });
});

describe("deactivation takes effect immediately", options, () => {
  test("suspending revokes a live session", async () => {
    const { id, sessionToken } = await activeClient();

    assert.ok(
      await getClientSessionUser(sessionToken),
      "the session should be live before suspension",
    );

    await setClientStatus(id, "suspended");

    assert.equal(
      await getClientSessionUser(sessionToken),
      null,
      "the session must stop working the moment the client is suspended, not when it expires",
    );
  });

  test("a suspended client cannot sign in", async () => {
    const { email, id } = await activeClient();
    await setClientStatus(id, "suspended");

    const result = await clientLogin(email, PASSWORD);
    assert.equal(result.ok, false);
    assert.equal((result as { reason: string }).reason, "inactive");
  });

  test("reactivating restores sign-in", async () => {
    const { email, id } = await activeClient();
    await setClientStatus(id, "suspended");
    await setClientStatus(id, "active");

    const result = await clientLogin(email, PASSWORD);
    assert.ok(result.ok, "a reactivated client should sign in again");
  });

  test("reactivating someone who never set a password returns them to invited", async () => {
    const created = await createClient({
      email: uniqueEmail("never-setup"),
      name: "Never Setup",
      createdBy: "admin@example.test",
    });
    assert.ok(created.ok);

    await setClientStatus(created.client.id, "suspended");
    const reactivated = await setClientStatus(created.client.id, "active");

    assert.equal(
      reactivated?.status,
      "invited",
      "there is no password to make them active, so invited is the honest state",
    );
  });

  test("deleting a client revokes their session", async () => {
    const { id, sessionToken } = await activeClient();
    assert.ok(await getClientSessionUser(sessionToken));

    assert.equal(await deleteClient(id), true);
    assert.equal(
      await getClientSessionUser(sessionToken),
      null,
      "a deleted client's session must not outlive the account",
    );
  });
});

describe("sign-in", options, () => {
  test("the right password works", async () => {
    const { email } = await activeClient();
    assert.ok((await clientLogin(email, PASSWORD)).ok);
  });

  test("the wrong password does not", async () => {
    const { email } = await activeClient();
    const result = await clientLogin(email, "wrong-password-entirely");
    assert.equal(result.ok, false);
    assert.equal((result as { reason: string }).reason, "invalid");
  });

  test("an unknown address is invalid, and says nothing more", async () => {
    const result = await clientLogin(uniqueEmail("nobody"), PASSWORD);
    assert.equal(result.ok, false);
    assert.equal((result as { reason: string }).reason, "invalid");
  });

  test("a client who has not set a password cannot sign in", async () => {
    const email = uniqueEmail("invited-login");
    const created = await createClient({
      email,
      name: "Invited",
      createdBy: "admin@example.test",
    });
    assert.ok(created.ok);

    const result = await clientLogin(email, PASSWORD);
    assert.equal(result.ok, false);
    assert.equal((result as { reason: string }).reason, "invited");
  });

  test("email is matched case-insensitively", async () => {
    const { email } = await activeClient();
    assert.ok((await clientLogin(email.toUpperCase(), PASSWORD)).ok);
  });

  test("lockout engages on the threshold and then refuses the right password", async () => {
    const { email } = await activeClient();

    for (let attempt = 0; attempt < MAX_FAILED_ATTEMPTS; attempt += 1) {
      await clientLogin(email, "wrong-password-entirely");
    }

    // The correct password now, which is the point: a lockout that let the real
    // password through would only be slowing an attacker who already had it.
    const result = await clientLogin(email, PASSWORD);
    assert.equal(result.ok, false);
    assert.equal((result as { reason: string }).reason, "locked");
  });
});

describe("client records", options, () => {
  test("a duplicate email is refused", async () => {
    const email = uniqueEmail("duplicate");

    assert.ok(
      (await createClient({ email, name: "First", createdBy: "a@example.test" })).ok,
    );

    const second = await createClient({
      email,
      name: "Second",
      createdBy: "a@example.test",
    });
    assert.equal(second.ok, false);
    assert.equal((second as { reason: string }).reason, "duplicate");
  });

  test("a differently-cased duplicate is also refused", async () => {
    const email = uniqueEmail("case-duplicate");
    assert.ok(
      (await createClient({ email, name: "First", createdBy: "a@example.test" })).ok,
    );

    const second = await createClient({
      email: email.toUpperCase(),
      name: "Second",
      createdBy: "a@example.test",
    });
    assert.equal(second.ok, false, "case must not create a second record");
  });

  test("the record handed to the dashboard carries no secrets", async () => {
    const created = await createClient({
      email: uniqueEmail("no-secrets"),
      name: "No Secrets",
      createdBy: "admin@example.test",
    });
    assert.ok(created.ok);

    // The dashboard is told whether an invitation is outstanding, never what it
    // is. If a field is ever added to `Client` and the serialiser is spread
    // instead of built, this is what notices.
    const keys = Object.keys(created.client);
    for (const forbidden of [
      "passwordHash",
      "setupTokenHash",
      "setupTokenExpiresAt",
      "setupTokenUsedAt",
    ]) {
      assert.ok(
        !keys.includes(forbidden),
        `${forbidden} must never reach the dashboard`,
      );
    }

    assert.equal(created.client.invitePending, true);
    assert.equal(created.client.hasPassword, false);
  });

  test("an update cannot smuggle in a status or a password", async () => {
    const { id, email } = await activeClient();

    await updateClient(id, {
      name: "Renamed",
      // Not in `UpdateClientInput`, so this is what a hostile request body looks
      // like once it has passed the schema. `updateClient` assembles its fields
      // one at a time rather than spreading, which is what makes this inert.
      ...({ status: "suspended", passwordHash: "injected" } as object),
    });

    const result = await clientLogin(email, PASSWORD);
    assert.ok(
      result.ok,
      "the injected status and password hash must have been ignored",
    );
  });

  test("search matches name, email and company", async () => {
    const marker = `zz${Date.now().toString(36)}`;
    await createClient({
      email: uniqueEmail("searchable"),
      name: `Findable ${marker}`,
      company: `Company ${marker}`,
      createdBy: "admin@example.test",
    });

    for (const term of [`Findable ${marker}`, marker, marker.toUpperCase()]) {
      const found = await listClients({ search: term });
      assert.ok(found.total >= 1, `expected a match for "${term}"`);
    }
  });

  test("a regex in the search box is treated as text", async () => {
    // Unescaped, `.*` matches everything and would return the whole list — and
    // a nested quantifier would hold a CPU for the length of the request.
    const found = await listClients({ search: ".*" });
    assert.equal(found.total, 0, "the search input must not be a live pattern");

    const catastrophic = await listClients({ search: "(a+)+$" });
    assert.equal(catastrophic.total, 0);
  });

  test("pagination bounds the page size", async () => {
    // Asking for ten thousand rows must not return ten thousand rows.
    const result = await listClients({ perPage: 10_000 });
    assert.ok(result.perPage <= 100, `perPage was ${result.perPage}`);
  });

  test("an invalid id is a miss, not a crash", async () => {
    assert.equal(await deleteClient("not-an-object-id"), false);
    assert.equal(await updateClient("not-an-object-id", { name: "x" }), null);
    assert.equal(await setClientStatus("not-an-object-id", "active"), null);
  });
});

describe("indexes", options, () => {
  test("ensureClientIndexes is idempotent", async () => {
    // Called by the seed script, which is safe to re-run.
    await ensureClientIndexes();
    await ensureClientIndexes();

    const db = await getDb();
    const indexes = await db.collection("clients").indexes();
    const emailIndex = indexes.find((index) => index.key?.email === 1);

    assert.ok(emailIndex, "clients.email must be indexed");
    assert.equal(
      emailIndex.unique,
      true,
      "the unique index is what makes duplicate creation impossible to race",
    );
  });
});
