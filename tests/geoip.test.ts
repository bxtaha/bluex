import { test } from "node:test";
import assert from "node:assert/strict";
import { formatLocation, normaliseAddress } from "../lib/visitor-location.ts";

/**
 * The half of the location work that can be tested here: normalising an
 * address on the way in, and rendering a place on the way out.
 *
 * `lookupLocation` itself is **not** covered by this suite, and deliberately
 * so — it imports `server-only`, which throws outside a Next server context,
 * and a 110MB dataset that has no business in a unit test. Its two load-bearing
 * behaviours were verified directly against the dataset instead: every private
 * and loopback range returns null (so development does not stamp one country
 * on every local conversation), and the library hands back nine fields —
 * including latitude and longitude — of which the wrapper copies exactly three
 * by name. That last point is why it builds its result field by field rather
 * than spreading: a spread would put precise coordinates in the database.
 *
 * What is tested here is what the rest of the app touches. `formatLocation`
 * runs in the admin panel, which is a client component, and that is also why
 * these functions live in `visitor-location.ts` rather than beside the lookup —
 * one file cannot be both `server-only` and importable by the UI.
 */

test("normaliseAddress strips a port from an IPv4 address", () => {
  // `x-forwarded-for` entries arrive in several shapes depending on the proxy
  // chain. All of these are what the header looks like in the wild.
  assert.equal(normaliseAddress("8.8.8.8:443"), "8.8.8.8");
  assert.equal(normaliseAddress("8.8.8.8"), "8.8.8.8");
});

test("normaliseAddress unwraps bracketed IPv6, with or without a port", () => {
  assert.equal(normaliseAddress("[::1]:443"), "::1");
  assert.equal(normaliseAddress("[2001:db8::1]"), "2001:db8::1");
});

test("normaliseAddress leaves a bare IPv6 address intact", () => {
  // The trap in stripping ports: a bare IPv6 address is full of colons, and
  // cutting after the last one corrupts it into a different address.
  assert.equal(normaliseAddress("2001:db8::1"), "2001:db8::1");
  assert.equal(normaliseAddress("::1"), "::1");
});

test("normaliseAddress reduces blank input to the empty string", () => {
  // The caller treats "" as "do not look this up", so whitespace must not
  // reach the dataset as a query.
  assert.equal(normaliseAddress(""), "");
  assert.equal(normaliseAddress("   "), "");
});

test("formatLocation never prints a stray comma for a city it does not know", () => {
  // The dataset frequently has a country and no city. "  , BD" is the bug this
  // exists to prevent.
  assert.equal(formatLocation({ country: "BD", region: "C", city: "Dhaka" }), "Dhaka, BD");
  assert.equal(formatLocation({ country: "BD", region: "C", city: "" }), "BD");
  assert.equal(formatLocation({ country: "", region: "", city: "Dhaka" }), "Dhaka");
});

test("formatLocation says Unknown rather than rendering an empty string", () => {
  assert.equal(formatLocation({ country: "", region: "", city: "" }), "Unknown");
  assert.equal(formatLocation(null), "Unknown");
  assert.equal(formatLocation(undefined), "Unknown");
});
