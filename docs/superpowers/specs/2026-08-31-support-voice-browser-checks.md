# Customer Support voice — the checks that need a real browser

Everything in this list needs a running microphone, a real permission prompt,
or a rendering engine that hydrates React. None of the three exists on the
machine this was built on: the agent's in-app browser blocks `eval()` in its
CSP, which React's development bootstrap needs, so no client component ever
mounts and every client-side check there returns a false negative rather than
an answer.

So these are unverified. Not "probably fine" — unverified. Each one below says
what to do and what a pass looks like.

## Before you start

```bash
npm run dev
```

Then in **Admin → Settings → Customer Support voice**: switch *Enabled* on and
paste the support agent's ID (`agent_…`). Nothing appears on the public site
until both are set — the layout requires the toggle *and* an agent id, because
a button with nothing behind it can only fail.

Two things must also be true in the **ElevenLabs dashboard**, and neither can
be set from this repo:

- **First-message overrides allowlisted on that agent**, or the greeting typed
  into Settings is silently ignored. Skip this if you leave the greeting blank.
- **The `language_detection` system tool enabled**, or check 5 below has nothing
  to show. This is off by default.

---

## 1. Microphone permission is actually granted

The site used to send `Permissions-Policy: microphone=()`, which denies the
microphone to every origin *including itself* — `getUserMedia` fails before a
prompt is ever shown. That is now `microphone=(self)`.

**Do:** load the site, open DevTools → Network → click the document request →
Response Headers.

**Pass:** `permissions-policy` contains `microphone=(self)`, and
`content-security-policy` contains `connect-src 'self' https://api.elevenlabs.io
wss://api.elevenlabs.io`.

## 2. The animation responds to your voice, and differs when the agent speaks

The core claim of the whole feature.

**Do:** click the button, allow the microphone, and talk. Then stop and let the
agent reply.

**Pass:** the bars move with *your* voice and are **cream** while you speak;
they move with the agent's voice and are **electric blue** while it speaks. In
a silence they drift gently rather than freezing flat.

**Fail worth reporting:** bars that move identically regardless of who is
talking, or that move when the room is silent — that would mean the level
getters are not returning what I read them to return.

## 3. The worklets load from this origin

This is the one I would bet against if anything is wrong, because it is the
part that could not be exercised here at all.

**Do:** with the panel open, DevTools → Network, filter `worklet`.

**Pass:** three requests to `/worklets/…` on **localhost**, all 200. No request
to `cdn.jsdelivr.net`. No CSP violation in the console.

**If it fails:** the console will say `Failed to load the … worklet module`, or
a CSP error naming `script-src`. Run `npm run worklets:sync` and reload before
concluding anything — a stale vendored copy fails exactly this way.

## 4. Reduced motion replaces the animation rather than freezing it

**Do:** DevTools → Rendering → *Emulate CSS prefers-reduced-motion: reduce*.
Reopen the panel and talk.

**Pass:** the seven bars are replaced by a single dot that still changes colour
with who is speaking. Nothing oscillates. Critically — it is not a row of
motionless bars, which would be the failure mode the blanket motion rule
produces elsewhere in this codebase.

## 5. The language indicator (only if you enabled the tool)

**Do:** start in English, then speak a sentence in another supported language.

**Pass:** a language code appears top-right of the panel *after* the switch, and
not before. If you did not enable the tool, **the correct result is that no
language ever appears** — that is the designed behaviour, not a bug.

## 6. Permission denied gives a real explanation and a way out

**Do:** DevTools → the site's permission settings → block the microphone.
Reload, click the button.

**Pass:** "No microphone access", copy telling you to allow it in the address
bar, and a working "Use the contact form instead" link to `/#contact`. No
spinner, and no dead button.

## 7. Nothing runs behind a closed panel, and a hidden tab hangs up

**Do:** with a conversation live, DevTools → Performance → record 3 seconds,
then close the panel and record 3 more.

**Pass:** animation frames while open; **no rAF activity at all** once closed.

**Then:** start a conversation and switch to another tab for a full minute.
Come back. The session should have ended (the grace period is 30 seconds). Say
if you would rather it were instant, or longer — it is one constant,
`HIDDEN_GRACE_MS` in `support-panel.tsx`.

## 8. Placement and layering

**Do:** scroll down so back-to-top appears, with the widget set to
*bottom-right*.

**Pass:** the two do not overlap — back-to-top sits above the launcher. Then
open the lead form (any "Get a call" button): **the modal must cover the
launcher**, not the other way round. Switch placement to *bottom-left* in
Settings and reload: the launcher moves, and back-to-top returns to the corner
on its own.

Check a phone width too (375px): the launcher should be a circle with no label,
clear of the home indicator.

## 9. Page visibility rules

**Do:** set *Pages* to "Only these" and enter `/blog/*`.

**Pass:** no button on `/`, button present on `/blog` and on any post. Then
switch to "All except these" with the same list and confirm it inverts. No
redeploy needed for either — if you have to restart the dev server, that is a
finding.

---

## 10. The SDK is not downloaded until you click

Verified structurally here, but not observed loading — that needs a browser.

Measured in the build: the SDK lands in exactly one chunk, **159 KB gzipped**,
holding `livekit` and none of our markup. The launcher lands in a different
chunk, **17 KB gzipped**, holding none of `livekit` — and referencing the SDK
chunk by name, which is the lazy edge itself. The site's eager payload is six
files totalling **133 KB gzipped**, and the SDK chunk is not among them.

**Do:** DevTools → Network → JS, with the widget enabled. Load the page and
leave it alone. Then click the button.

**Pass:** no ~600 KB (159 KB transferred) chunk before the click; it arrives on
the click. If it loads on page load, something imported `support-panel.tsx`
eagerly and the whole performance argument is void.

**Also worth a look while you are there:** with the widget *disabled* in
Settings, the ~17 KB launcher chunk should also be absent — the layout renders
nothing at all. I could not settle that one from the build manifests, so it is
genuinely open.

## What was verified here, for contrast

Static and server-side only: `tsc`, `eslint`, `npm test`, `npm run build`, the
route table, the pure path-matching and validation logic, the payload parsing
for browser conversations, and that the SDK is confined to a lazily-loaded
chunk. The database was unreachable from this machine all night (Atlas SRV DNS
does not resolve here), so **no route was exercised against a running server** —
the session route, the webhook signature check and the replay-idempotency check
are all unverified in the same way the browser checks are.
