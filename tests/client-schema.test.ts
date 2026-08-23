import assert from "node:assert/strict";
import test, { describe } from "node:test";
import {
  clientStatusSchema,
  createClientSchema,
  fieldErrors,
  updateClientSchema,
} from "../lib/client-schema.ts";

/**
 * Request-body validation.
 *
 * No database. What these cover is the boundary where a JSON body becomes an
 * object the application trusts — the point at which mass assignment either
 * happens or does not.
 */

describe("creating a client", () => {
  test("accepts a minimal valid body", () => {
    const result = createClientSchema.safeParse({
      email: "person@example.com",
      name: "A Person",
    });

    assert.ok(result.success);
    assert.equal(result.data.email, "person@example.com");
    assert.equal(result.data.company, "");
  });

  test("strips fields nobody is allowed to set", () => {
    // The mass-assignment test. `status` and `passwordHash` are real fields on
    // the stored document, and if the schema passed them through, anyone able to
    // reach the create endpoint could mint an already-active client with a
    // password of their choosing — skipping the emailed setup link entirely.
    const result = createClientSchema.safeParse({
      email: "person@example.com",
      name: "A Person",
      status: "active",
      passwordHash: "scrypt$whatever",
      setupTokenHash: "deadbeef",
      createdBy: "someone-else@example.com",
      _id: "000000000000000000000000",
    });

    assert.ok(result.success);

    for (const forbidden of [
      "status",
      "passwordHash",
      "setupTokenHash",
      "createdBy",
      "_id",
    ]) {
      assert.ok(
        !(forbidden in result.data),
        `${forbidden} must be stripped by the schema, not forwarded to the database`,
      );
    }
  });

  test("rejects a malformed email", () => {
    for (const email of ["", "not-an-email", "@example.com", "person@"]) {
      assert.equal(
        createClientSchema.safeParse({ email, name: "A Person" }).success,
        false,
        `"${email}" should not have been accepted`,
      );
    }
  });

  test("rejects a name that is too short, and one that is too long", () => {
    assert.equal(
      createClientSchema.safeParse({ email: "a@b.com", name: "A" }).success,
      false,
    );
    assert.equal(
      createClientSchema.safeParse({
        email: "a@b.com",
        name: "A".repeat(121),
      }).success,
      false,
    );
  });

  test("bounds every string, so one request cannot write a megabyte", () => {
    const oversized = createClientSchema.safeParse({
      email: `${"a".repeat(200)}@example.com`,
      name: "A Person",
      company: "C".repeat(500),
      phone: "1".repeat(100),
    });

    assert.equal(oversized.success, false);
  });

  test("trims, so leading space cannot create a second identity", () => {
    const result = createClientSchema.safeParse({
      email: "  person@example.com  ",
      name: "  A Person  ",
    });

    assert.ok(result.success);
    assert.equal(result.data.email, "person@example.com");
    assert.equal(result.data.name, "A Person");
  });

  test("accepts international phone numbers and rejects implausible ones", () => {
    // The audience spans the Gulf, Canada and Australia, so a format regex
    // written for one of them rejects the others. Only a digit count is checked.
    for (const phone of ["+971 50 123 4567", "+1 240 820 3149", "+61 2 9876 5432", ""]) {
      assert.ok(
        createClientSchema.safeParse({
          email: "a@b.com",
          name: "A Person",
          phone,
        }).success,
        `"${phone}" should have been accepted`,
      );
    }

    assert.equal(
      createClientSchema.safeParse({
        email: "a@b.com",
        name: "A Person",
        phone: "12345",
      }).success,
      false,
    );
  });
});

describe("updating a client", () => {
  test("accepts a single field", () => {
    assert.ok(updateClientSchema.safeParse({ name: "New Name" }).success);
    assert.ok(updateClientSchema.safeParse({ phone: "" }).success);
  });

  test("rejects an empty body", () => {
    assert.equal(updateClientSchema.safeParse({}).success, false);
  });

  test("does not accept an email change", () => {
    // Email is the identity these records are keyed by. Changing it silently
    // would orphan an outstanding invitation and any session tied to the address.
    const result = updateClientSchema.safeParse({
      name: "New Name",
      email: "different@example.com",
    });

    assert.ok(result.success);
    assert.ok(!("email" in result.data), "email must not be updatable");
  });

  test("does not accept a status change", () => {
    // Status has its own endpoint because changing it revokes sessions. Allowing
    // it here would mean a rename could take away someone's access as a side
    // effect.
    const result = updateClientSchema.safeParse({
      name: "New Name",
      status: "active",
    });

    assert.ok(result.success);
    assert.ok(!("status" in result.data));
  });
});

describe("changing status", () => {
  test("accepts only the two real states", () => {
    assert.ok(clientStatusSchema.safeParse({ status: "active" }).success);
    assert.ok(clientStatusSchema.safeParse({ status: "suspended" }).success);
  });

  test("refuses anything else, including the internal state", () => {
    // `invited` is a state the system assigns, never one an administrator sets:
    // it means "no password yet", which is a fact about the record rather than a
    // decision.
    for (const status of ["invited", "admin", "", null, 1, {}]) {
      assert.equal(
        clientStatusSchema.safeParse({ status }).success,
        false,
        `${JSON.stringify(status)} should not have been accepted`,
      );
    }
  });
});

describe("error reporting", () => {
  test("reports one message per field, keyed by field name", () => {
    const result = createClientSchema.safeParse({ email: "nope", name: "A" });
    assert.equal(result.success, false);

    const errors = fieldErrors(result.error);
    assert.ok(errors.email, "expected an error against email");
    assert.ok(errors.name, "expected an error against name");
  });

  test("messages are for a person to read, not a schema to describe", () => {
    const result = createClientSchema.safeParse({ email: "nope", name: "Fine Name" });
    assert.equal(result.success, false);

    const errors = fieldErrors(result.error);
    assert.match(errors.email, /email/i);
    // Not "Invalid input" or a regex — the point of the custom messages is that
    // the person can act on them.
    assert.ok(!/^invalid/i.test(errors.email), `got "${errors.email}"`);
  });
});
