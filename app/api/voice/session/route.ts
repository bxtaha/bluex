import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { clientIp, hashIp } from "@/lib/client-ip";
import { getSignedUrl } from "@/lib/elevenlabs";
import { rateLimit } from "@/lib/rate-limit";
import { SITE_URL } from "@/lib/site";
import { getSupportVoice } from "@/lib/support-voice";

/**
 * Where the browser asks for a conversation.
 *
 * **This route exists so the API key does not have to reach the browser.** The
 * agent could be made public and dialled with an agent id alone; it is not,
 * because that would put the id in the page source and leave no place to
 * tighten anything later. Keeping one route as the only way a session starts
 * means authentication can be added here — a signed-in visitor, a captcha, a
 * per-account quota — without touching the client at all.
 *
 * Nothing in the response is a secret. That is the design: the signed URL is
 * short-lived and single-purpose, and the API key that minted it never leaves
 * the server.
 */

/** Generous for a person, useless for a script farming session URLs. */
const SESSIONS_PER_HOUR = 12;
const WINDOW_MS = 60 * 60 * 1000;

/**
 * Where a legitimate request can come from.
 *
 * `Origin` is set by the browser on cross-origin POSTs and cannot be forged by
 * page script, so it is a real check against another site embedding this
 * endpoint — not against curl, which can send anything and is what the rate
 * limit is for. A same-origin `fetch` in some browsers omits the header
 * entirely, so an absent `Origin` is allowed; only a *present* and *foreign*
 * one is refused.
 */
function originAllowed(origin: string | null): boolean {
  if (!origin) return true;

  try {
    const host = new URL(origin).host;
    if (host === new URL(SITE_URL).host) return true;
    // Localhost on any port, so `npm run dev` works without special-casing
    // the port number in three places.
    return /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(host);
  } catch {
    return false;
  }
}

export async function POST() {
  const headerList = await headers();

  // First, and before any database read. A request from another origin is
  // refused for the price of parsing one header rather than a round trip, and
  // it keeps this branch answerable even when Mongo is unreachable.
  if (!originAllowed(headerList.get("origin"))) {
    return NextResponse.json(
      { ok: false, message: "This session could not be started." },
      { status: 403 },
    );
  }

  const ip = clientIp(headerList);
  const limit = await rateLimit(`voice-session:${hashIp(ip) || ip}`, SESSIONS_PER_HOUR, WINDOW_MS);
  if (!limit.allowed) {
    return NextResponse.json(
      { ok: false, message: "Too many sessions started from here. Try again later." },
      { status: 429 },
    );
  }

  const settings = await getSupportVoice();

  // Re-checked here rather than trusted from the client. The widget only
  // renders when this is on, but the route is reachable directly and a
  // disabled feature that still mints paid sessions is not disabled.
  if (!settings.enabled || !settings.agentId) {
    return NextResponse.json(
      { ok: false, message: "Voice support isn't available right now." },
      { status: 503 },
    );
  }

  const session = await getSignedUrl(settings.agentId);
  if (!session.ok) {
    // The provider's reason goes to the log, not to the visitor. It can name
    // the agent id or the state of the account, and neither is theirs to read
    // — but whoever is on call needs it to be somewhere.
    console.error("[voice/session] could not mint a session:", session.reason);
    return NextResponse.json(
      { ok: false, message: "Couldn't start the conversation. Please try again." },
      { status: 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    signedUrl: session.signedUrl,
    maxSessionMinutes: settings.maxSessionMinutes,
    // Applied by the client as a first-message override. Only has an effect if
    // that override is allowlisted on the agent in the ElevenLabs dashboard —
    // see the note on the Settings card.
    greeting: settings.greeting,
  });
}
