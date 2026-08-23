# Alkarta: client portal, client management, admin redesign

Written 24 August 2026. Branch `alkarta`, cut from `main` at `a9bb474`.

This is the design that was approved before implementation. It records the
decisions and, more usefully, why the rejected alternatives were rejected —
those are the parts a later reader cannot reconstruct from the diff.

## What was already here

Worth stating plainly, because the audit's headline is not "this was bad":

The existing admin auth is well built. Passwords are scrypt hashes with the cost
parameters stored in the hash, so the cost can be raised without invalidating
anyone. Sessions are documents, not signed claims, so signing out revokes.
Lockout is a field on the user rather than a counter in memory, so it survives a
restart and is visible to every instance. An unknown email still pays for a
password comparison against a dummy hash, so timing does not disclose which
addresses exist. Guards fail closed. Uploads are signed server-side. The
ElevenLabs webhook verifies its signature before writing a transcript.

Guard coverage was checked route by route, not assumed: all 20 admin API routes
call `requireAdmin()`, except `login` and `logout`, which correctly do not.

Two things in `CLAUDE.md` had drifted and are corrected by this pass: the
ElevenLabs keys **are** now set in `.env.local`, and SMTP/IMAP are live — so
email infrastructure exists and the invite flow uses it rather than adding a
provider.

There was no client system at all. No `/clients` route, no `clients` collection,
no role concept. This is net-new architecture, not a modification.

## Security findings

### Committed Cloudinary secret — the real one

`.env.example` is tracked and carries a working `CLOUDINARY_API_SECRET`, API key
and cloud name. It has been in history since `dc712cb`, and the value matches
`.env.local`, so it is live.

**The fix is rotation, and only a human can do it.** This spec's change — blanking
the values — stops the secret leaking *again* from a file people copy into their
own `.env.local`. It does not un-leak it.

Git history is deliberately **not** rewritten. Five remote branches share that
history, so a rewrite invalidates every existing clone, and it buys nothing: the
key is already out. Rotation makes the history irrelevant, which no amount of
force-pushing does.

### Login had no IP rate limit

Per-account lockout existed; nothing capped a single address. Two consequences:
an attacker could spray one password across many accounts without ever tripping
a per-account counter, and anyone who knew an admin's email could lock them out
on demand by failing eight logins. The second is the more interesting one — a
lockout with no IP limit in front of it is a denial-of-service primitive aimed at
the account it protects.

`lib/rate-limit.ts` already existed and `/api/lead` already used it, so the fix
is a call, not a component.

It fails **open**, which is correct here and worth defending: per-account lockout
sits behind it, so an unreachable Mongo degrades to the protection that already
existed rather than locking out every administrator simultaneously.

### Not treated as a finding

No CSRF tokens. `SameSite=Lax` plus POST-only mutations already covers this: Lax
withholds the cookie on cross-site POST, and every state-changing route is POST.
Adding tokens would be ceremony with no threat behind it.

## Client authentication

Separate collections over shared primitives:

```
lib/auth-core.ts        hashToken, newToken, lockout maths, DUMMY_HASH,
                        normaliseEmail, MIN_PASSWORD_LENGTH
  |
  +-- lib/admin-auth.ts   admin_users + admin_sessions + bx_admin
  +-- lib/client-auth.ts  clients     + client_sessions + bx_client
```

**Why not one `users` collection with a `role` field.** That was the leading
alternative and it loses on failure mode, not on line count. With one collection
and one cookie, every guard must remember its role check, and a guard that
verifies the session but forgets the role promotes any client to full admin — one
oversight, total escalation. With two cookies and two collections, a client
session is structurally incapable of satisfying `requireAdmin()`: wrong cookie
name, and the token hash is absent from `admin_sessions` even if the cookie were
renamed. Escalation needs two independent bugs. It also needs no migration of
existing `admin_users`.

**Why not fully duplicated modules.** Isolation is the same, but the scrypt
parameters, lockout logic and session expiry would exist twice and drift. A
security fix applied to one copy and not the other is the predictable failure,
and it is worse than the coupling it avoids.

Two details carry more weight than the file layout:

- **`getClientSessionUser` re-checks `status === "active"` on every request**, not
  only at login. Checking at login only means deactivating a client leaves their
  session working until it expires — up to eight hours of access after the
  administrator believes they revoked it. Deactivation that does not take effect
  is not deactivation.
- **Deactivating revokes that client's sessions** in the same operation, for the
  same reason.

## Setup-link flow

No password is ever generated, so there is nothing for the dashboard to leak.
This is why a setup link beats a temporary password: a temporary password has to
be transmitted, and anything transmitted can be displayed, logged, or screenshotted.

1. Admin creates the client. A 256-bit token is generated; **only its SHA-256
   hash is stored**, with a 72-hour expiry and a null `usedAt`.
2. The raw token goes out by email through the existing `lib/mailer.ts`, as
   `/clients/setup?token=…`. It exists in exactly two places: the email, and the
   client's URL bar.
3. On successful setup: set `passwordHash`, set `status: "active"`, **null the
   token hash**, stamp `usedAt`, and revoke any existing client sessions.

Single-use, time-limited, invalidated on use. A resend overwrites the stored
hash, which invalidates the previous link for free rather than as a separate step.

The setup endpoint is rate-limited too. A 256-bit token is not brute-forceable and
the limit is not what protects it — but an unlimited endpoint that performs a
database lookup per request is worth capping regardless.

## Admin client management

Routes, all behind `requireAdmin`, all validated server-side with `zod` (already
the convention in `lib/contact-schema.ts`):

| Route | Method | Purpose |
|---|---|---|
| `/api/admin/clients` | GET | list, search, paginate |
| `/api/admin/clients` | POST | create; 409 on duplicate email |
| `/api/admin/clients/[id]` | GET | detail |
| `/api/admin/clients/[id]` | PATCH | edit fields, activate/deactivate |
| `/api/admin/clients/[id]/invite` | POST | resend setup link |
| `/api/admin/clients/[id]` | DELETE | hard delete |

Deactivation is the primary destructive action because it is reversible and
preserves the audit trail. Hard delete exists because it was asked for, and is
gated behind typing the client's email to confirm.

Pagination is present from the start rather than added when the list gets long,
since an unbounded list is the kind of thing that works fine until the day it
does not.

## Client record

A client is a customer whose leads and calls they will eventually view in the
portal. The schema reflects that without building it:

```
clients {
  email, name, company?, phone?,
  passwordHash: string | null,        // null until setup completes
  status: "invited" | "active" | "suspended",
  createdAt, createdBy,               // which admin, for the audit trail
  lastLoginAt?, passwordChangedAt?,
  failedAttempts, lockedUntil,
  setupTokenHash?, setupTokenExpiresAt?, setupTokenUsedAt?,
}
```

A reserved optional `clientId` is documented on the lead type so the eventual
lead-to-client association does not require a migration. **No index is created
for it and nothing writes it**, because an index on a field no query touches is
dead weight, and a field nothing writes is not a feature. It is schema
readiness, not a half-built feature.

## Portal scope

Log in, stay authenticated, log out. Nothing else, per the brief.

What makes this extensible later is that the session layer is complete rather
than minimal: `requireClient()` for API routes, a server-side check for pages,
status re-validation on every request, and revocation that works. Adding a panel
later is adding a panel, not revisiting authentication.

## Admin redesign

The eight existing panels are **not** rewritten. Their logic works; the problem
is chrome, and it is generic Tailwind grays where the brand is
`--color-electric: #2e6bff`, which is most of why it reads as a template.

- Shared primitives in `components/ui/admin/`: card, table, button, field,
  empty/loading/error states, confirm dialog, toast.
- The shell is rebuilt with a real mobile drawer. There is currently no mobile
  treatment at all.
- The Dashboard view stops being a blank empty state and shows real system
  status. The numbers for it — leads awaiting a call, unread conversations — are
  already flowing into the component for the sidebar badges.
- Existing panels are retrofitted onto the primitives at the chrome layer, with
  their logic untouched.

Following the admin area's own convention of inline Tailwind with `dark:`
variants, rather than the marketing site's `.bx-*`-in-globals.css convention.
Named classes in `globals.css` only where state or keyframes require them.

## SEO

The genuinely new work is small and would be a regression if skipped: `/clients`
needs `noindex, nofollow` and a `robots.ts` disallow. Without it this pass adds
an indexable login page to a site that currently has none.

Everything else is a re-audit against `docs/seo.md`, which already concludes that
on-page work is largely exhausted and what remains is backlinks (7 links, 6
domains) and a CDN in front of a single-region origin. Neither is fixable in this
repository. That note gets updated rather than replaced.

## Pricing

Research only. Every tier says "get a quote", and `docs/seo.md` records that
`priceRange` was left out of the structured data deliberately, because a price
band stated only to a crawler is one the page refuses to state to readers.
Publishing figures is a business decision, so the deliverable is a recommendation
in `docs/pricing.md` and no change to the live page.

## Testing

No test framework was installed. Rather than add one, this uses Node 22's
built-in `node:test` with `--experimental-strip-types` — the pattern the seed
scripts already use, and **zero new dependencies** for the one part of the app
where a bug is a breach.

Covered: token single-use, token expiry, lockout behaviour, and that a client
cookie cannot satisfy `requireAdmin()`. Those are the four properties whose
failure is a security incident rather than a bug.

Then lint, typecheck and production build.

**SMTP is live**, so exercising the invite flow sends real mail. Tests must not
depend on delivery, and manual checks use an address from `.env.local`.

## Out of scope

- Rotating the Cloudinary key — requires dashboard access.
- Backlinks and CDN — not code.
- Portal features beyond authentication.
- Publishing prices.
- Browser verification, which is handed off per the user's standing preference.
