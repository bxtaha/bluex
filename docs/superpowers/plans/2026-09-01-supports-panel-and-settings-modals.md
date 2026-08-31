# Supports panel and settings modals — implementation plan

**Goal:** Move each voice channel's settings into a gear modal on the panel it
configures, and add a Supports panel listing browser conversations with the
visitor's approximate location.

**Architecture:** Two independent chunks. The first splits one settings form
into three, each opened from the panel it belongs to, using the PATCH route's
existing partial-patch behaviour so no API changes. The second adds a
`channel=web` view of the calls archive and joins a coarse location onto each
conversation, keyed by a conversation id obtained at session-mint time.

**Tech Stack:** Next 16.2.12 (App Router) · React 19.2.4 · Tailwind v4 (no
config file) · MongoDB driver direct · `geoip-lite` (new, server-only)

**Spec:** [2026-09-01-supports-panel-and-settings-modals-design.md](../specs/2026-09-01-supports-panel-and-settings-modals-design.md)

## Global constraints

- Branch is `dev`. Work happens there directly, as requested.
- TypeScript `strict`. No `any` to force a type through.
- All component CSS in `app/globals.css` as `.bx-*` classes. No CSS modules,
  no styled-jsx.
- `npm test` is `node:test` over **pure logic only**.
- react-hooks lint blocks the build: no `setState` in an effect body, no ref
  writes during render.
- **The visitor's IP address is never written anywhere.** It is read, resolved,
  and dropped inside one request.
- Never `pkill -f "next start"` — kill PIDs one at a time.
- z-order: admin toast 70 → `AdminModal` **75** → `ConfirmDialog` 80.

---

## File structure

**Chunk 1 — settings into modals**

| File | Responsibility |
|---|---|
| Create `components/ui/admin/admin-modal.tsx` | Generic admin dialog at z-75. Focus trap, Escape, backdrop click. |
| Create `components/ui/admin/voice-settings/use-voice-settings.ts` | Shared load/save against `/api/admin/voice-settings`. One place that knows the endpoint. |
| Create `components/ui/admin/voice-settings/inbound.tsx` | Inbound modal body: `inboundAgentId`, `inboundPhoneNumberId`. |
| Create `components/ui/admin/voice-settings/outbound.tsx` | Outbound modal body: agent, phone number, transport. |
| Create `components/ui/admin/voice-settings/credentials.tsx` | API key + webhook secret. Stays on the Settings page. |
| Delete `components/ui/admin/admin-voice-settings.tsx` | Replaced by the three above. |
| Modify `components/ui/admin/admin-support-voice.tsx` | Becomes modal body: drop its outer `<form>`/card chrome, keep the fields. |
| Modify `components/ui/admin-calls.tsx` | Gear button in the header via `AdminSectionHeader`'s existing `action` slot. |
| Modify `components/ui/dashboard-with-collapsible-sidebar.tsx` | Settings view renders credentials + password only. |
| Modify `app/globals.css` | `.bx-admin-modal*` block. |

**Chunk 2 — Supports panel and location**

| File | Responsibility |
|---|---|
| Create `lib/geoip.ts` | Address → coarse place. The only file that imports `geoip-lite`. |
| Create `lib/voice-session-store.ts` | The `voiceSessions` join collection, TTL 7 days. |
| Create `tests/geoip.test.ts` | Private/malformed addresses, formatting, the "no address stored" property. |
| Modify `lib/elevenlabs.ts` | `getSignedUrl` returns the conversation id. |
| Modify `app/api/voice/session/route.ts` | Resolve, store, discard. |
| Modify `lib/call-store.ts` | `Call.location`. |
| Modify `lib/call-intake.ts` | Join the location onto a web conversation. |
| Modify `components/ui/admin-calls.tsx` | `CallScope`, location column. |
| Modify `components/ui/dashboard-with-collapsible-sidebar.tsx` | Supports nav row + `VIEWS` entry. |
| Modify `next.config.ts` | `outputFileTracingIncludes` for the geo data files. |

---

## Locked interfaces

Written before any code so names cannot drift across the twelve files.

```ts
// lib/geoip.ts
export type VisitorLocation = {
  country: string;  // ISO 3166-1 alpha-2, "" when unknown
  region: string;   // subdivision CODE ("C"), not a name. "" when unknown
  city: string;     // name, frequently ""
};

/** Null for a private, unroutable, malformed or unknown address. Never throws. */
export function lookupLocation(ip: string): VisitorLocation | null;

/** "Dhaka, BD" | "BD" | "Unknown". Never renders a stray comma. */
export function formatLocation(location: VisitorLocation | null | undefined): string;

// lib/voice-session-store.ts
export function rememberVoiceSession(
  conversationId: string,
  location: VisitorLocation,
): Promise<void>;

/** Non-destructive: TTL does the cleanup, so a retried intake still finds it. */
export function readVoiceSessionLocation(
  conversationId: string,
): Promise<VisitorLocation | null>;

// lib/elevenlabs.ts — CHANGED SHAPE
export function getSignedUrl(agentId: string): Promise<
  | { ok: true; signedUrl: string; conversationId: string }
  | { ok: false; reason: string }
>;

// lib/call-store.ts — Call gains
location: VisitorLocation | null;

// components/ui/admin-calls.tsx
export type CallScope =
  | { kind: "direction"; direction: CallDirection }
  | { kind: "channel"; channel: CallChannel };

export function AdminCalls(props: {
  scope: CallScope;
  onViewLeads?: () => void;
  onOpenSettings?: () => void;   // renders the gear only when provided
}): React.JSX.Element;

// components/ui/admin/admin-modal.tsx
export function AdminModal(props: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}): React.JSX.Element | null;

// components/ui/admin/voice-settings/use-voice-settings.ts
export function useVoiceSettings(enabled: boolean): {
  settings: VoiceSettingsView | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
  save: (patch: VoiceSettingsPatch) => Promise<{ ok: boolean; message?: string }>;
  saving: boolean;
};
```

**`enabled` on `useVoiceSettings`** is what stops three components fetching the
same endpoint on every dashboard render: a modal passes its own `open` state,
so the request happens when the modal opens and not before.

**`getSignedUrl`'s shape changes**, and it has exactly one caller
(`app/api/voice/session/route.ts`). Adding `include_conversation_id=true` also
makes the returned signature single-use — that is the documented behaviour of
the flag, not a side effect to work around.

---

## Tasks

Ordered so each leaves the tree building. Commit at the end of each.

### Chunk 1 — ships on its own

**Task 1 — `AdminModal`.** The primitive, plus its CSS. Escape closes, backdrop
click closes, focus moves into the dialog on open and returns to the trigger on
close, `aria-modal` + labelled by its title. z-75. No callers yet.

**Task 2 — split the voice settings.** `use-voice-settings.ts` and the three
bodies; delete `admin-voice-settings.tsx`. Settings page renders credentials +
password. At the end of this task the inbound/outbound fields are temporarily
unreachable from the UI — that is fixed in Task 3, and the two are one commit
if that bothers a reviewer.

**Task 3 — wire the gears.** `AdminCalls` gains `onOpenSettings`; the dashboard
passes handlers for Inbound and Outbound and hosts the two modals. Support
settings modal is wired in Task 5, when the panel that hosts it exists.

**Verify chunk 1:** `tsc`, `eslint`, `npm test`, `npm run build`, then curl
`PATCH /api/admin/voice-settings` with only `{"inboundAgentId":"agent_x"}` and
confirm the outbound fields are untouched in the GET that follows.

### Chunk 2 — Supports panel and location

**Task 4 — `lib/geoip.ts` + tests, TDD.** Tests first: `127.0.0.1` → null,
`10.0.0.0/8` → null, `""` → null, malformed → null, a known public address →
the expected shape. `formatLocation` for all four shapes including the
empty-city case that must not print `", BD"`. This is the only part `npm test`
can reach, so it is where the test effort goes.

**Task 5 — Supports panel.** `CallScope` on `AdminCalls`, the sidebar row, the
`VIEWS` entry, and the support-settings gear modal. No location column yet —
the panel is useful without it and this keeps the task reviewable.

**Task 6 — capture the location.** `getSignedUrl` returns the conversation id;
the session route resolves, stores and discards; `voice-session-store.ts` with
its TTL index.

**Task 7 — join and display.** `Call.location`, the join in `call-intake.ts`,
the column in the panel.

**Task 8 — the standalone trap.** `outputFileTracingIncludes` for geoip-lite's
data files, verified against a real `output: "standalone"` build by checking
the files exist under `.next/standalone` — not by assuming the config worked.

**Verify chunk 2:** the full gauntlet, plus a curl of the webhook with a
web-shaped payload whose `conversation_id` matches a stored session, confirming
the location lands on the call.

---

## Self-review against the spec

- Settings split, four rows of the table → Tasks 2, 3, 5. ✅
- No API change; partial patch → Task 2, verified by curl at the end of chunk 1. ✅
- `AdminModal` at 75, between toast and confirm → Task 1. ✅
- Supports panel via `channel=web` → Task 5. ✅
- `include_conversation_id=true`, single-use signature → Task 6. ✅
- Address resolved and discarded, never stored → Tasks 4, 6; asserted in tests. ✅
- `geoip-lite`, server-only → Task 4. ✅
- Failure never fatal; "Unknown" → Tasks 4, 7. ✅
- 7-day TTL on the join record → Task 6. ✅
- `outputFileTracingIncludes` verified not assumed → Task 8. ✅
- Field shapes (ISO-2 country, region *code*, empty city) → Task 4's tests. ✅
- Two independently shippable chunks → Tasks 1–3, then 4–8. ✅

No spec requirement is without a task.

## What cannot be verified here

The modal opening, the gear button, focus behaviour, and the panel rendering
need a real browser: React does not hydrate in the agent's in-app browser in
development. Those go back to the user as a short list, as the voice widget's
did.
