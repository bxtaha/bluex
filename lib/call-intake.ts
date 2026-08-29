import {
  parseConversation,
  phoneKey,
  type CallDirection,
  type ParsedCall,
} from "./call-payload.ts";
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
  reason: "stored" | "duplicate" | "unparseable";
};

export async function recordConversation(
  payload: unknown,
  source: "webhook" | "sync",
): Promise<IntakeResult> {
  const parsed = parseConversation(payload);
  if (!parsed) return { stored: false, reason: "unparseable" };

  const direction = await resolveDirection(parsed);
  const key = phoneKey(parsed.counterpartyNumber);

  // A caller who withheld their number has no key to find or create a lead
  // by. `phoneKey` backs a unique index on `leads`, so treating "" as a real
  // key would make the first anonymous caller the permanent home for every
  // anonymous caller after them — one fictional person absorbing everyone who
  // ever called from a blocked number. Storing the call unattached (empty
  // `leadId`/`name`) is the correct failure here, not that merge.
  let leadId = "";
  let name = "";

  if (key) {
    const { lead } = await findOrCreateLeadByPhone({
      name: "",
      business: "",
      phone: parsed.counterpartyNumber,
      email: "",
      source: direction === "inbound" ? "inbound" : "form",
      ipHash: "",
    });
    leadId = lead.id;
    name = lead.name;
  }

  const call = await insertCallIfNew({
    conversationId: parsed.conversationId,
    direction,
    counterpartyNumber: parsed.counterpartyNumber,
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
 * Inbound or outbound.
 *
 * The provider's own field first. When it is absent the fallback cannot be
 * wrong: a lead already carrying this conversation id got it from our own
 * dispatch, so the call went out. Anything else came in. That holds whatever
 * the provider renames its metadata to.
 */
async function resolveDirection(parsed: ParsedCall): Promise<CallDirection> {
  if (parsed.direction) return parsed.direction;
  return (await hasLeadWithConversation(parsed.conversationId))
    ? "outbound"
    : "inbound";
}
