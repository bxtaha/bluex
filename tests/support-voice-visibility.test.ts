import { test } from "node:test";
import assert from "node:assert/strict";
import {
  formatPathList,
  isVisibleOnPath,
  parsePathList,
} from "../lib/support-voice-visibility.ts";

/**
 * Which pages the support button appears on.
 *
 * Pure, and tested rather than eyeballed, because this is the one piece of the
 * feature whose failure is silent: a widget that renders where it should not is
 * noticed immediately, and one that *fails* to render where it should looks
 * exactly like a widget nobody clicked.
 */

test("'all' ignores the list entirely", () => {
  assert.equal(isVisibleOnPath("/anything", "all", []), true);
  assert.equal(isVisibleOnPath("/anything", "all", ["/pricing"]), true);
});

test("'only' shows on a listed path and nowhere else", () => {
  assert.equal(isVisibleOnPath("/pricing", "only", ["/pricing"]), true);
  assert.equal(isVisibleOnPath("/blog", "only", ["/pricing"]), false);
});

test("'except' hides on a listed path and shows everywhere else", () => {
  assert.equal(isVisibleOnPath("/pricing", "except", ["/pricing"]), false);
  assert.equal(isVisibleOnPath("/blog", "except", ["/pricing"]), true);
});

test("a trailing slash is not a different page", () => {
  assert.equal(isVisibleOnPath("/pricing/", "only", ["/pricing"]), true);
  assert.equal(isVisibleOnPath("/pricing", "only", ["/pricing/"]), true);
});

test("the root path is matchable and is not treated as empty", () => {
  assert.equal(isVisibleOnPath("/", "only", ["/"]), true);
  assert.equal(isVisibleOnPath("/blog", "only", ["/"]), false);
});

test("a wildcard covers the branch and its own root", () => {
  assert.equal(isVisibleOnPath("/blog", "only", ["/blog/*"]), true);
  assert.equal(isVisibleOnPath("/blog/hello", "only", ["/blog/*"]), true);
  assert.equal(isVisibleOnPath("/blog/2026/hello", "only", ["/blog/*"]), true);
});

test("a wildcard does not leak into a sibling with a shared prefix", () => {
  // The naive `startsWith("/blog")` implementation matches this. It must not:
  // /blogging is a different page.
  assert.equal(isVisibleOnPath("/blogging", "only", ["/blog/*"]), false);
});

test("an exact entry does not match descendants", () => {
  assert.equal(isVisibleOnPath("/blog/hello", "only", ["/blog"]), false);
});

test("'only' with an empty list shows nowhere, 'except' with one shows everywhere", () => {
  // Not symmetric by accident: "only these paths" with no paths named is a
  // request for nowhere, and refusing to render is the honest reading. The
  // inverse of that is "all except nothing", which is everywhere.
  assert.equal(isVisibleOnPath("/pricing", "only", []), false);
  assert.equal(isVisibleOnPath("/pricing", "except", []), true);
});

test("matching is case-insensitive, because URLs reaching this are not normalised", () => {
  assert.equal(isVisibleOnPath("/Pricing", "only", ["/pricing"]), true);
});

test("parsePathList accepts newlines or commas and tidies what it gets", () => {
  assert.deepEqual(parsePathList("/pricing\n/blog/*"), ["/pricing", "/blog/*"]);
  assert.deepEqual(parsePathList("/pricing, /blog/*"), ["/pricing", "/blog/*"]);
  assert.deepEqual(parsePathList("  /pricing  \n\n"), ["/pricing"]);
});

test("parsePathList adds the leading slash somebody forgot", () => {
  assert.deepEqual(parsePathList("pricing"), ["/pricing"]);
});

test("parsePathList drops duplicates rather than matching twice", () => {
  assert.deepEqual(parsePathList("/pricing\n/pricing"), ["/pricing"]);
});

test("parsePathList caps the list instead of storing whatever was pasted", () => {
  const many = Array.from({ length: 200 }, (_, i) => `/p${i}`).join("\n");
  assert.equal(parsePathList(many).length, 50);
});

test("formatPathList round-trips through parsePathList", () => {
  const paths = ["/pricing", "/blog/*"];
  assert.deepEqual(parsePathList(formatPathList(paths)), paths);
});
