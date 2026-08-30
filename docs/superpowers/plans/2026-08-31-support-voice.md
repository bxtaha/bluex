# Customer Support voice — implementation plan

**Goal:** A visitor clicks a button on the public site and talks to the
ElevenLabs agent through their browser, with the conversation landing in the
same archive as phone calls.

**Architecture:** Three load gates (server-side master toggle → client-side path
rule → dynamic import of the SDK on click). Settings in one `siteSettings`
document behind the existing cache-and-tag pattern. A new server route mints a
signed URL so the browser never sees the agent id or the key. The existing
webhook absorbs the new channel through a new `channel` field rather than a
third `direction`.

**Tech Stack:** Next 16.2.12 App Router · React 19.2.4 · Tailwind v4 (no config
file) · MongoDB driver direct · `@elevenlabs/react@1.15.0` (new dependency)

**Spec:** [2026-08-31-support-voice-design.md](../specs/2026-08-31-support-voice-design.md)

## Global constraints

- TypeScript `strict: true`. No `any` to force a type through.
- All component CSS goes in `app/globals.css` as named `.bx-*` classes. No CSS
  modules, no styled-jsx — neither exists here.
- `npm test` is `node:test` over **pure logic only**. Nothing touching Mongo or
  HTTP goes in there; those are checked with curl.
- react-hooks lint is strict and blocks the build: no `setState` in an effect
  body, no ref reads during render, no mutation inside a render-time `.map`.
- `inert` is typed `boolean` in React 19, not `""`.
- Never write `-webkit-backdrop-filter`. Never put `backdrop-filter` on anything
  that repeats.
- Anything gated on an IntersectionObserver must fail **open**.
- The existing outbound flow is not refactored. `lib/call-intake.ts` gains one
  leading case; every existing branch stays byte-identical.

---

## File structure

**Create**

| File | Responsibility |
|---|---|
| `lib/support-voice-store.ts` | Settings document, validation, public projection. Framework-free. |
| `lib/support-voice-visibility.ts` | Pure path matching. |
| `lib/support-voice.ts` | Next-facing: `unstable_cache` + tag + publish. |
| `app/api/admin/support-voice/route.ts` | GET/PATCH behind `requireAdmin()`. |
| `app/api/voice/session/route.ts` | POST. Origin allowlist, rate limit, mints the signed URL. |
| `components/ui/admin/admin-support-voice.tsx` | Settings card, built from existing primitives. |
| `components/ui/support-voice/support-voice-mount.tsx` | Path gate + launcher + panel open state. |
| `components/ui/support-voice/support-panel.tsx` | The conversation window. Holds the SDK import. |
| `components/ui/support-voice/support-waveform.tsx` | The rAF animation. |
| `tests/support-voice-visibility.test.ts` | Path matching. |
| `tests/support-voice-store.test.ts` | Validation and the public projection. |

**Modify**

| File | Change |
|---|---|
| `lib/elevenlabs.ts` | Add `getSignedUrl`. Additive only. |
| `lib/call-payload.ts` | Add `hasPhoneCall` and `collected` to `ParsedCall`. |
| `lib/call-store.ts` | Add `channel` to `Call`, index it, default it in `toCall`. |
| `lib/call-intake.ts` | One leading case in direction resolution; channel; log-to-inbox gate; lead from a collected number. |
| `app/(site)/layout.tsx` | Read settings, mount when enabled. |
| `app/globals.css` | `.bx-support-*` classes; move `.btt-root` up. |
| `next.config.ts` | Permissions-Policy, connect-src, media-src, worker-src, and the comment above them. |
| `components/ui/dashboard-with-collapsible-sidebar.tsx` | Render the new card in Settings. |
| `components/ui/admin-calls.tsx` | Channel badge and filter. |
| `tests/call-payload.test.ts` | Web conversation, `hasPhoneCall`, collected fields. |
| `.env.example`, `README.md` | Document the feature and why it adds no variables. |

---

## Locked interfaces

Written before any code so names cannot drift across sixteen files.

```ts
// lib/support-voice-store.ts
export type SupportVoicePlacement = "bottom-right" | "bottom-left";
export type SupportVoiceTheme = "light" | "dark" | "site";
export type SupportVoiceVisibilityMode = "all" | "only" | "except";

export type StoredSupportVoice = {
  enabled: boolean;
  agentId: string;
  buttonLabel: string;
  placement: SupportVoicePlacement;
  visibilityMode: SupportVoiceVisibilityMode;
  visibilityPaths: string[];
  greeting: string;
  theme: SupportVoiceTheme;
  mobileEnabled: boolean;
  maxSessionMinutes: number;
  logToInbox: boolean;
};

/** What may reach the browser. No agent id, no secrets, no greeting. */
export type SupportVoicePublic = Pick<
  StoredSupportVoice,
  "buttonLabel" | "placement" | "visibilityMode" | "visibilityPaths"
  | "theme" | "mobileEnabled" | "maxSessionMinutes"
>;

export const DEFAULT_SUPPORT_VOICE: StoredSupportVoice;
export const MIN_SESSION_MINUTES = 1;
export const MAX_SESSION_MINUTES = 60;

export type SupportVoicePatch = Partial<StoredSupportVoice>;
export type SupportVoiceUpdateResult =
  | { ok: true; settings: StoredSupportVoice }
  | { ok: false; message: string };

export function validateSupportVoice(
  patch: SupportVoicePatch,
): { ok: true; value: Partial<StoredSupportVoice> } | { ok: false; message: string };
export function toPublicSupportVoice(s: StoredSupportVoice): SupportVoicePublic;
export function readSupportVoiceUncached(): Promise<StoredSupportVoice>;
export function updateSupportVoice(patch: SupportVoicePatch): Promise<SupportVoiceUpdateResult>;

// lib/support-voice-visibility.ts
export function isVisibleOnPath(
  pathname: string,
  mode: SupportVoiceVisibilityMode,
  paths: string[],
): boolean;
export function parsePathList(raw: string): string[];
export function formatPathList(paths: string[]): string;

// lib/support-voice.ts
export const SUPPORT_VOICE_TAG = "support-voice-settings";
export function getSupportVoice(): Promise<StoredSupportVoice>;  // spreads over defaults, never throws
export function publishSupportVoice(): void;                     // revalidateTag AND revalidatePath("/")

// lib/elevenlabs.ts (added)
export function getSignedUrl(
  agentId: string,
): Promise<{ ok: true; signedUrl: string } | { ok: false; reason: string }>;

// POST /api/voice/session response
type SessionResponse =
  | { ok: true; signedUrl: string; maxSessionMinutes: number; greeting: string }
  | { ok: false; message: string };

// lib/call-payload.ts (added)
export type CallChannel = "phone" | "web";
export type CollectedFields = {
  name: string; email: string; phone: string; company: string; serviceInterest: string;
};
export function parseCollected(analysis: unknown): CollectedFields;
// ParsedCall gains: hasPhoneCall: boolean; collected: CollectedFields;

// lib/call-store.ts — Call gains: channel: CallChannel;
// lib/call-intake.ts — IntakeResult.reason gains "skipped"
```

**Path matching semantics**, fixed here so the admin copy and the matcher agree:
an entry is either an exact path (`/pricing`) or a prefix wildcard
(`/blog/*`, matching `/blog` and anything beneath it). Nothing else. Leading
slash required; trailing slashes ignored.

**Direction and channel resolution**, replacing the two-line `resolveDirection`.
Ordered so every previously-reachable outcome is unchanged:

```
1. parsed.direction present            → phone, that direction   (unchanged)
2. a lead already claims this id       → phone, outbound         (unchanged)
3. metadata.phone_call present         → phone, inbound          (unchanged)
4. otherwise                           → web,   inbound          (new)
```

Case 4 is the only new outcome. It was previously folded into case 3.

---

## Tasks

Ordered so each leaves the tree building and testable. Commit at the end of
each.

### Task 1 — Pure logic and its tests
`lib/support-voice-visibility.ts`, the validation half of
`lib/support-voice-store.ts`, `tests/support-voice-visibility.test.ts`,
`tests/support-voice-store.test.ts`. Tests first; they must fail before the
implementation exists. This is the only part of the feature `npm test` can
reach, so it is where the test effort goes.

### Task 2 — Settings storage and the admin route
The Mongo half of `lib/support-voice-store.ts`, `lib/support-voice.ts`,
`app/api/admin/support-voice/route.ts`. Verify with curl: unauthenticated GET
is 401, PATCH round-trips, an invalid agent id is rejected server-side.

### Task 3 — Admin settings card
`components/ui/admin/admin-support-voice.tsx` wired into the Settings view.
Built from `AdminCard` / `AdminField` / `AdminButton` / `useToast`. Copy must
say plainly that the greeting override needs allowlisting on the agent, and
that the language indicator needs the detection tool — neither is reachable
from here.

### Task 4 — Session route
`getSignedUrl` in `lib/elevenlabs.ts`, then `app/api/voice/session/route.ts`.
Verify with curl: a foreign `Origin` is refused, the response carries no key,
the route refuses when disabled.

### Task 5 — Headers
`next.config.ts`. Do this before the client so the browser can actually
connect. Confirm `worker-src` / `media-src` values against the built bundle
rather than assuming `blob:`.

### Task 6 — The client
`support-voice-mount.tsx`, `support-panel.tsx`, `support-waveform.tsx`, the
`.bx-support-*` block in `globals.css`, `.btt-root` moved up, and the mount in
`app/(site)/layout.tsx`. Add `@elevenlabs/react`. All ten states, the
reduced-motion fallback, teardown, and the rAF loop that parks when closed.

### Task 7 — Channel and intake
`lib/call-payload.ts`, `lib/call-store.ts`, `lib/call-intake.ts`,
`components/ui/admin-calls.tsx`, plus the new cases in
`tests/call-payload.test.ts`. Verify with curl: bad signature refused, replay
stores once, a web-shaped payload files as `channel: "web"`.

### Task 8 — Docs and full verification
`.env.example`, `README.md`, `CLAUDE.md` if the invariants changed. Then
`npm test`, `eslint`, `tsc --noEmit`, `npm run build`, and the curl suite, with
real output shown. Compile the browser-only checklist.

---

## Self-review against the spec

- Three gates → Tasks 2 (server toggle), 6 (path gate, dynamic import). ✅
- No new env vars → Task 8 documents the reasoning. ✅
- Session route, origin, rate limit, no key in payload → Task 4. ✅
- Headers incl. rewritten comment → Task 5. ✅
- Waveform, both directions, real levels, reduced motion, parked loop → Task 6. ✅
- Ten states, contact-form fallback → Task 6. ✅
- Teardown: pagehide, 30s visibility grace, max cap → Task 6. ✅
- z-45, `.btt-root` moved, safe-area → Task 6. ✅
- `channel` not a third direction; one leading case; collected fields; lead from
  a collected number; log-to-inbox returning 200 → Task 7. ✅
- Language indicator hidden until the tool fires → Task 6. ✅
- Greeting-override and language-tool caveats surfaced in copy → Task 3. ✅
- Verification split, browser checks handed back → Task 8. ✅

No spec requirement is without a task.
