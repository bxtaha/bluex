import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { clientIp, hashIp } from "@/lib/client-ip";
import { validateLead, type LeadInput, type LeadSource } from "@/lib/lead";
import {
  findOrCreateLeadByPhone,
  recordDispatch,
  recordDispatchFailure,
} from "@/lib/lead-store";
import { isConfigured, placeCall } from "@/lib/elevenlabs";
import { rateLimit } from "@/lib/rate-limit";

/**
 * Lead intake.
 *
 * The order is the design — limit, validate, **store**, then call — and the
 * last two are in that order for the same reason the contact form writes to the
 * database before it sends mail: a lead that was recorded but not called can be
 * called from the dashboard, and a lead that was called but not recorded is a
 * conversation nobody can follow up.
 *
 * The dispatch is awaited rather than deferred. The visitor is on the page
 * being told their phone is about to ring, and `dispatched` in the response is
 * what decides whether the form says so — returning a guess before the provider
 * has accepted the job would make that copy a hope rather than a fact.
 *
 * With no ElevenLabs credentials set the lead is still stored, marked
 * `not_configured`, and the response reports `dispatched: false`, which the form
 * already degrades to honestly.
 */

/** Three per hour, per address. Each one placed is a billable phone call. */
const IP_LIMIT = 3;
/** Two per hour, per number — a double submit must not ring someone twice. */
const PHONE_LIMIT = 2;
const WINDOW_MS = 60 * 60 * 1000;

export async function POST(request: Request) {
  let body: Partial<LeadInput> & { source?: LeadSource };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, message: "Malformed request." },
      { status: 400 },
    );
  }

  const source: LeadSource = body.source === "inline" ? "inline" : "form";

  const errors = validateLead(body, source);
  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ ok: false, errors }, { status: 422 });
  }

  const lead = {
    name: body.name!.trim(),
    business: body.business?.trim() ?? "",
    phone: body.phone!.trim(),
    email: body.email?.trim() ?? "",
    source,
  };

  const headerList = await headers();
  const ip = clientIp(headerList);
  const ipHash = hashIp(ip);

  // Keyed on digits only, so `+880 1712…` and `+8801712…` are one number
  // rather than two allowances.
  const phoneKey = lead.phone.replace(/\D/g, "");

  const [byIp, byPhone] = await Promise.all([
    rateLimit(`lead:ip:${ipHash || ip}`, IP_LIMIT, WINDOW_MS),
    rateLimit(`lead:phone:${phoneKey}`, PHONE_LIMIT, WINDOW_MS),
  ]);

  if (!byIp.allowed || !byPhone.allowed) {
    /*
     * Say what is actually true, which the previous copy did not.
     *
     * It read "We've already got a call queued for that number. Give it a few
     * minutes." Three things were wrong with that. Nothing is necessarily
     * queued — the allowance is spent by *attempts*, and an attempt that
     * failed to dial spends it just the same, so someone whose calls all
     * failed was told a call was on its way. "A few minutes" described a
     * sixty-minute window. And the sentence is about a phone number, but it
     * also fired for the per-address limit, so a second person in the same
     * office submitting a different number was told *their* number already had
     * a call coming.
     *
     * The limit itself is unchanged and stays counted on attempts rather than
     * on successes: a guard that only counts calls that connected is one an
     * abuser can spin freely against any endpoint that happens to be failing.
     */
    const resetAt = !byPhone.allowed ? byPhone.resetAt : byIp.resetAt;
    const minutes = Math.max(
      1,
      Math.ceil((resetAt.getTime() - Date.now()) / 60_000),
    );
    const wait =
      minutes >= 60
        ? "in about an hour"
        : `in about ${minutes} minute${minutes === 1 ? "" : "s"}`;

    return NextResponse.json(
      {
        ok: false,
        message: byPhone.allowed
          ? `That's a few requests from this device in a short time. Please try again ${wait}.`
          : `We've already taken a couple of requests for that number. Please try again ${wait}, or call us directly.`,
      },
      { status: 429 },
    );
  }

  let stored;
  try {
    const { lead: found } = await findOrCreateLeadByPhone({ ...lead, ipHash });
    stored = found;
  } catch (error) {
    // Nothing downstream is worth attempting if the lead cannot be written —
    // it would be a call with no record of who it was for.
    console.error("[lead] could not store:", error, lead.phone);
    return NextResponse.json(
      { ok: false, message: "We couldn't take that just now. Please try again." },
      { status: 503 },
    );
  }

  if (!(await isConfigured())) {
    console.warn("[lead] voice agent not configured — stored only:", stored.id);
    await recordDispatchFailure(
      stored.id,
      "ElevenLabs credentials are not set.",
      "not_configured",
    );
    // Still `ok`. The lead is safe, it is in the dashboard, and someone can
    // ring it by hand — that is a success from the visitor's side, and the form
    // already tells them a human will follow up when `dispatched` is false.
    return NextResponse.json({ ok: true, dispatched: false });
  }

  const call = await placeCall({
    toNumber: lead.phone,
    variables: {
      name: lead.name,
      // The agent's prompt has to say *something* here, and "your business"
      // reads as intended in a sentence where the real name would go — the
      // inline widget deliberately does not ask for it.
      business: lead.business || "your business",
      email: lead.email,
      source: lead.source,
    },
  });

  if (!call.ok) {
    await recordDispatchFailure(stored.id, call.reason);
    return NextResponse.json(
      { ok: false, message: "We couldn't start the call. Please try again." },
      { status: 502 },
    );
  }

  await recordDispatch(stored.id, {
    conversationId: call.conversationId,
    callSid: call.callSid,
  });

  return NextResponse.json({ ok: true, dispatched: true });
}
