import {
  parseConversation,
  phoneKey,
  type CallChannel,
  type CallDirection,
  type ParsedCall,
} from "./call-payload.ts";
import { readSupportVoiceUncached } from "./support-voice-store.ts";
import { insertCallIfNew } from "./call-store.ts";
import {
  advanceStageOnContact,
  findOrCreateLeadByPhone,
  hasLeadWithConversation,
  markLeadCallNotConnected,
  markLeadSpokenTo,
} from "./lead-store.ts";

/**
 * Recording a conversation, however it reached us.
 *
 * The webhook and the reconciliation cron both land here. That is the point:
 * two paths that stored calls slightly differently would give an archive where
 * the record depends on which pipe happened to deliver it, and the whole
 * purpose of the cron is that a call recovered late is indistinguishable from
 * one that arrived on time.
 *
 * Everything that touches Mongo goes through `call-store.ts` / `lead-store.ts`
 * — this file only decides what to call them with.
 */

export type IntakeResult = {
  stored: boolean;
  reason: "stored" | "duplicate" | "unparseable" | "skipped";
};

export async function recordConversation(
  payload: unknown,
  source: "webhook" | "sync",
): Promise<IntakeResult> {
  const parsed = parseConversation(payload);
  if (!parsed) return { stored: false, reason: "unparseable" };

  const { direction, channel } = await resolveRouting(parsed);

  // "Record conversations" off means browser conversations are not archived.
  // It cannot stop the webhook arriving — the URL lives in the ElevenLabs
  // dashboard and fires for every channel — so the choice is honoured here.
  // Phone calls are never affected: the setting is about this feature, and
  // silently dropping a phone call because of a support toggle would be a
  // trap.
  if (channel === "web" && !(await readSupportVoiceUncached()).logToInbox) {
    return { stored: false, reason: "skipped" };
  }

  /*
   * A browser visitor has no caller ID, so the only number that can identify
   * them is one the agent asked for and they chose to give. Using it is the
   * same rule the rest of this file follows — a lead is a person, and a phone
   * number is how this system knows which person. Without one the conversation
   * is stored unattached rather than merged into somebody.
   */
  const number =
    channel === "web" && !parsed.counterpartyNumber
      ? parsed.collected.phone
      : parsed.counterpartyNumber;

  const key = phoneKey(number);

  // A caller who withheld their number has no key to find or create a lead
  // by. `phoneKey` backs a unique index on `leads`, so treating "" as a real
  // key would make the first anonymous caller the permanent home for every
  // anonymous caller after them — one fictional person absorbing everyone who
  // ever called from a blocked number. Storing the call unattached (empty
  // `leadId`/`name`) is the correct failure here, not that merge.
  let leadId = "";
  let name = "";

  if (key) {
    /*
     * The collected fields are used for browser conversations only, and that
     * restriction is deliberate rather than an oversight.
     *
     * `findOrCreateLeadByPhone` fills blanks and never overwrites, so passing
     * them for phone calls too would be safe and would arguably improve them —
     * an inbound caller whose name the agent captured would stop being a lead
     * called "". But that is a change to the behaviour of a flow this work was
     * asked not to touch, and "safe and arguably better" is how unrequested
     * changes get made. Phone intake stays byte-identical; the improvement is
     * noted for whoever decides to make it deliberately.
     */
    const collected =
      channel === "web"
        ? parsed.collected
        : { name: "", company: "", email: "" };

    const { lead } = await findOrCreateLeadByPhone({
      name: collected.name,
      business: collected.company,
      phone: number,
      email: collected.email,
      source: direction === "inbound" ? "inbound" : "form",
      ipHash: "",
    });
    leadId = lead.id;
    name = lead.name;
  }

  const call = await insertCallIfNew({
    conversationId: parsed.conversationId,
    direction,
    channel,
    counterpartyNumber: number,
    counterpartyKey: key,
    agentId: parsed.agentId,
    leadId,
    name,
    callSuccessful: parsed.callSuccessful,
    startedAt: parsed.startedAt,
    durationSeconds: parsed.durationSeconds,
    transcript: parsed.transcript,
    summary: parsed.summary,
    source,
  });

  // Already stored. Nothing further to do — the lead was updated the first
  // time and doing it again would be a second write for no new information.
  if (!call) return { stored: false, reason: "duplicate" };

  if (leadId) {
    if (parsed.connected) {
      await markLeadSpokenTo(leadId, parsed.conversationId);
      await advanceStageOnContact(leadId);
    } else if (direction === "outbound") {
      // A dispatch that produced a conversation but never rang. Only outbound
      // touches `callStatus` — the field describes whether our own dispatch got
      // through, so a failed inbound attempt has nothing to say about it and
      // must not overwrite the result of the last call we placed.
      await markLeadCallNotConnected(
        leadId,
        parsed.conversationId,
        parsed.failureReason,
      );
    }
  }

  return { stored: true, reason: "stored" };
}

/**
 * Which way it went, and how it was held.
 *
 * Four cases, in this order. The first three are the behaviour that was here
 * before, unchanged and in the same sequence; only the fourth is new, and it
 * is a case that used to fall into the third:
 *
 *   1. the provider stated a direction  → phone, that direction
 *   2. a lead already claims this id    → phone, outbound (it was our dispatch)
 *   3. there is a phone_call block      → phone, inbound
 *   4. otherwise                        → web,   inbound
 *
 * Case 2 stays ahead of case 3 deliberately. A lead carrying this conversation
 * id got it from our own dispatch, and that is a fact about our records rather
 * than an inference from the payload — it cannot be wrong however the provider
 * renames its metadata.
 *
 * Case 4 reads absence rather than presence. A conversation with no telephony
 * metadata at all was not dialled, so it did not happen on a phone. Guessing
 * from the agent id instead would need a database read to answer a question
 * the payload already answers, and would file a support conversation as a
 * phone call the moment somebody pointed a second agent at the widget.
 *
 * A web conversation is `inbound` because the visitor came to us. There is no
 * outbound equivalent and there should not be one: this app cannot make
 * somebody's browser ring.
 */
async function resolveRouting(
  parsed: ParsedCall,
): Promise<{ direction: CallDirection; channel: CallChannel }> {
  if (parsed.direction) return { direction: parsed.direction, channel: "phone" };

  if (await hasLeadWithConversation(parsed.conversationId)) {
    return { direction: "outbound", channel: "phone" };
  }

  return parsed.hasPhoneCall
    ? { direction: "inbound", channel: "phone" }
    : { direction: "inbound", channel: "web" };
}
