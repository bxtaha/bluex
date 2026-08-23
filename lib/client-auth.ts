import { ObjectId, type Collection, type Filter } from "mongodb";
import { getDb } from "./mongodb.ts";
import { hashPassword, verifyPassword } from "./password.ts";
import {
  DUMMY_HASH,
  MIN_PASSWORD_LENGTH,
  afterFailedAttempt,
  afterSuccessfulLogin,
  hashToken,
  isLockedOut,
  newToken,
  normaliseEmail,
  sessionExpiry,
} from "./auth-core.ts";

/**
 * Client authentication and client records.
 *
 * A deliberate mirror of `admin-auth.ts`, sharing its mechanics through
 * `auth-core.ts` but never its storage. The separation is the security property:
 * this module reads `clients` and `client_sessions`, that one reads
 * `admin_users` and `admin_sessions`, and the cookies are named differently. A
 * client's session token is simply absent from `admin_sessions`, so there is no
 * value a client can hold that resolves to an administrator — not because a
 * check rejects it, but because the lookup cannot succeed. Escalation would take
 * two independent bugs rather than one forgotten `role === "admin"`.
 *
 * Clients never choose their own password at sign-up, because there is no
 * sign-up. An administrator creates the record and the client sets a password
 * through a single-use emailed link. That is why `passwordHash` is nullable: an
 * invited client is a real record that cannot yet authenticate.
 */

export const CLIENT_SESSION_COOKIE = "bx_client";

/**
 * How long an invitation stays usable.
 *
 * Three days rather than an hour: this arrives by email and the recipient may
 * well be asleep, on a weekend, or in another timezone. Long enough to be
 * usable, short enough that an old message in a mailbox is not a standing key —
 * and an administrator can always send a fresh one, which invalidates the old.
 */
export const SETUP_TOKEN_TTL_MS = 72 * 60 * 60 * 1000;

export type ClientStatus =
  /** Record exists, invitation outstanding, cannot sign in yet. */
  | "invited"
  /** Password set, may sign in. */
  | "active"
  /** Deactivated by an administrator. Sessions revoked, sign-in refused. */
  | "suspended";

export type Client = {
  _id?: ObjectId;
  email: string;
  name: string;
  company?: string;
  phone?: string;
  /** Null until the client completes setup. See the module comment. */
  passwordHash: string | null;
  status: ClientStatus;
  createdAt: Date;
  /** Which administrator created this record, for the audit trail. */
  createdBy: string;
  lastLoginAt?: Date;
  passwordChangedAt?: Date;
  failedAttempts: number;
  lockedUntil?: Date | null;
  /** SHA-256 of the setup token. Nulled the moment it is used. */
  setupTokenHash?: string | null;
  setupTokenExpiresAt?: Date | null;
  setupTokenUsedAt?: Date | null;
};

type ClientSession = {
  _id?: ObjectId;
  tokenHash: string;
  clientId: ObjectId;
  email: string;
  createdAt: Date;
  expiresAt: Date;
};

async function clients(): Promise<Collection<Client>> {
  const db = await getDb();
  return db.collection<Client>("clients");
}

async function sessions(): Promise<Collection<ClientSession>> {
  const db = await getDb();
  return db.collection<ClientSession>("client_sessions");
}

export async function ensureClientIndexes(): Promise<void> {
  const [clientCollection, sessionCollection] = await Promise.all([
    clients(),
    sessions(),
  ]);

  await clientCollection.createIndex({ email: 1 }, { unique: true });
  // Sparse: most clients have no outstanding token, and a unique index would
  // otherwise collide on the many documents where this is null.
  await clientCollection.createIndex({ setupTokenHash: 1 }, { sparse: true });
  await clientCollection.createIndex({ createdAt: -1 });
  await sessionCollection.createIndex({ tokenHash: 1 }, { unique: true });
  await sessionCollection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  await sessionCollection.createIndex({ clientId: 1 });
}

/**
 * What the admin dashboard is allowed to see.
 *
 * A separate shape rather than the document, so adding a field to `Client` can
 * never quietly publish it. `passwordHash` and the token hashes are absent by
 * construction: there is no code path that serialises them to a response,
 * because this is the only thing that gets serialised. The dashboard is told
 * *whether* an invitation is outstanding, never what the token is.
 */
export type ClientRecord = {
  id: string;
  email: string;
  name: string;
  company: string;
  phone: string;
  status: ClientStatus;
  createdAt: string;
  createdBy: string;
  lastLoginAt: string | null;
  /** True when an unused, unexpired invitation exists. */
  invitePending: boolean;
  /** When the outstanding invitation lapses, if there is one. */
  inviteExpiresAt: string | null;
  /** True once a password has been set — never the hash itself. */
  hasPassword: boolean;
};

function inviteIsLive(client: Client): boolean {
  return (
    !!client.setupTokenHash &&
    !client.setupTokenUsedAt &&
    !!client.setupTokenExpiresAt &&
    client.setupTokenExpiresAt.getTime() > Date.now()
  );
}

export function toClientRecord(client: Client): ClientRecord {
  return {
    id: client._id!.toHexString(),
    email: client.email,
    name: client.name,
    company: client.company ?? "",
    phone: client.phone ?? "",
    status: client.status,
    createdAt: client.createdAt.toISOString(),
    createdBy: client.createdBy,
    lastLoginAt: client.lastLoginAt?.toISOString() ?? null,
    invitePending: inviteIsLive(client),
    inviteExpiresAt: inviteIsLive(client)
      ? client.setupTokenExpiresAt!.toISOString()
      : null,
    hasPassword: !!client.passwordHash,
  };
}

/**
 * Escapes a user-supplied search string for use inside a regex.
 *
 * Not cosmetic. Mongo compiles `$regex` with a real engine, so an unescaped
 * query is both a way to match unintended documents and — with something like
 * `(a+)+$` — a way to pin a CPU for the length of the request.
 */
function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export type ListClientsOptions = {
  search?: string;
  status?: ClientStatus | "all";
  page?: number;
  perPage?: number;
};

export type ListClientsResult = {
  clients: ClientRecord[];
  total: number;
  page: number;
  perPage: number;
  pageCount: number;
};

/**
 * A page of clients.
 *
 * Paginated from the first commit rather than when the list gets slow. An
 * unbounded find is the kind of thing that behaves perfectly until the day it
 * does not, and by then it is in the dashboard's critical path.
 */
export async function listClients(
  options: ListClientsOptions = {},
): Promise<ListClientsResult> {
  const page = Math.max(1, Math.floor(options.page ?? 1));
  const perPage = Math.min(100, Math.max(1, Math.floor(options.perPage ?? 20)));
  const collection = await clients();

  const filter: Filter<Client> = {};

  if (options.status && options.status !== "all") {
    filter.status = options.status;
  }

  const search = options.search?.trim();
  if (search) {
    const pattern = new RegExp(escapeRegex(search), "i");
    filter.$or = [
      { email: pattern },
      { name: pattern },
      { company: pattern },
    ];
  }

  const [documents, total] = await Promise.all([
    collection
      .find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * perPage)
      .limit(perPage)
      .toArray(),
    collection.countDocuments(filter),
  ]);

  return {
    clients: documents.map(toClientRecord),
    total,
    page,
    perPage,
    pageCount: Math.max(1, Math.ceil(total / perPage)),
  };
}

/** Null for anything that is not a valid id, rather than throwing. */
function toObjectId(id: string): ObjectId | null {
  return ObjectId.isValid(id) ? new ObjectId(id) : null;
}

export async function getClientById(id: string): Promise<ClientRecord | null> {
  const _id = toObjectId(id);
  if (!_id) return null;

  const client = await (await clients()).findOne({ _id });
  return client ? toClientRecord(client) : null;
}

export type CreateClientInput = {
  email: string;
  name: string;
  company?: string;
  phone?: string;
  createdBy: string;
};

export type CreateClientResult =
  | { ok: true; client: ClientRecord; setupToken: string }
  | { ok: false; reason: "duplicate" };

/**
 * Creates a client and its first invitation.
 *
 * The raw setup token is returned to the caller once, to be emailed and then
 * forgotten. Only its digest is stored, so it cannot be recovered afterwards —
 * not by the dashboard, not by whoever reads the database. A lost invitation is
 * replaced, never retrieved, which is the same trade as the password policy.
 */
export async function createClient(
  input: CreateClientInput,
): Promise<CreateClientResult> {
  const email = normaliseEmail(input.email);
  const collection = await clients();
  const token = newToken();

  const document: Client = {
    email,
    name: input.name.trim(),
    company: input.company?.trim() || undefined,
    phone: input.phone?.trim() || undefined,
    passwordHash: null,
    status: "invited",
    createdAt: new Date(),
    createdBy: input.createdBy,
    failedAttempts: 0,
    lockedUntil: null,
    setupTokenHash: hashToken(token),
    setupTokenExpiresAt: new Date(Date.now() + SETUP_TOKEN_TTL_MS),
    setupTokenUsedAt: null,
  };

  try {
    const result = await collection.insertOne(document);
    return {
      ok: true,
      client: toClientRecord({ ...document, _id: result.insertedId }),
      setupToken: token,
    };
  } catch (error) {
    // Relies on the unique index rather than a read-then-write, which would
    // race: two administrators adding the same address at the same time both
    // see "no such client" and both insert. Mongo's duplicate-key error is the
    // only answer here that cannot be beaten by timing.
    if (isDuplicateKeyError(error)) return { ok: false, reason: "duplicate" };
    throw error;
  }
}

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: number }).code === 11000
  );
}

export type UpdateClientInput = {
  name?: string;
  company?: string;
  phone?: string;
};

export async function updateClient(
  id: string,
  input: UpdateClientInput,
): Promise<ClientRecord | null> {
  const _id = toObjectId(id);
  if (!_id) return null;

  // Built field by field rather than spread from the request. A spread is how
  // `status`, `passwordHash` or `setupTokenHash` end up settable by anyone who
  // adds them to a JSON body — the shape of bug that turns an edit form into a
  // privilege escalation.
  const update: Partial<Client> = {};
  if (input.name !== undefined) update.name = input.name.trim();
  if (input.company !== undefined) update.company = input.company.trim();
  if (input.phone !== undefined) update.phone = input.phone.trim();

  if (Object.keys(update).length === 0) return getClientById(id);

  const result = await (await clients()).findOneAndUpdate(
    { _id },
    { $set: update },
    { returnDocument: "after" },
  );

  return result ? toClientRecord(result) : null;
}

/**
 * Activates or deactivates a client.
 *
 * Anything other than `active` revokes their sessions in the same call. Without
 * that, deactivation only stops the *next* sign-in: an already-signed-in client
 * keeps working for up to eight hours after an administrator believed they had
 * removed the access. A revocation that takes effect later is not a revocation,
 * and the case it exists for — someone who should be out *now* — is exactly the
 * case where a delay matters.
 *
 * A client who never completed setup returns to `invited` rather than `active`,
 * since there is no password to reactivate them to.
 */
export async function setClientStatus(
  id: string,
  status: Extract<ClientStatus, "active" | "suspended">,
): Promise<ClientRecord | null> {
  const _id = toObjectId(id);
  if (!_id) return null;

  const collection = await clients();
  const existing = await collection.findOne({ _id });
  if (!existing) return null;

  const resolved: ClientStatus =
    status === "active" && !existing.passwordHash ? "invited" : status;

  const result = await collection.findOneAndUpdate(
    { _id },
    {
      $set:
        resolved === "active"
          ? { status: resolved, failedAttempts: 0, lockedUntil: null }
          : { status: resolved },
    },
    { returnDocument: "after" },
  );

  if (resolved !== "active") await revokeAllClientSessions(_id);

  return result ? toClientRecord(result) : null;
}

/** Hard delete. Sessions go with it, or they would outlive the account. */
export async function deleteClient(id: string): Promise<boolean> {
  const _id = toObjectId(id);
  if (!_id) return false;

  const result = await (await clients()).deleteOne({ _id });
  await revokeAllClientSessions(_id);

  return (result.deletedCount ?? 0) > 0;
}

/**
 * Issues a fresh invitation, invalidating any outstanding one.
 *
 * Overwriting the stored hash is what invalidates the previous link — not a
 * separate revocation step that could be forgotten. One column, one live token,
 * by construction.
 */
export async function reissueSetupToken(
  id: string,
): Promise<{ client: ClientRecord; setupToken: string } | null> {
  const _id = toObjectId(id);
  if (!_id) return null;

  const token = newToken();
  const result = await (await clients()).findOneAndUpdate(
    { _id },
    {
      $set: {
        setupTokenHash: hashToken(token),
        setupTokenExpiresAt: new Date(Date.now() + SETUP_TOKEN_TTL_MS),
        setupTokenUsedAt: null,
      },
    },
    { returnDocument: "after" },
  );

  if (!result) return null;
  return { client: toClientRecord(result), setupToken: token };
}

export type SetupTokenCheck =
  | { valid: true; email: string; name: string }
  | { valid: false; reason: "unknown" | "expired" | "used" | "suspended" };

/**
 * Whether a setup link is still good, without consuming it.
 *
 * Used by the setup page so it can render a form or an explanation rather than
 * letting someone type a password into something that will be rejected. The
 * distinction between reasons is safe to show: whoever holds the token already
 * holds the secret, so there is nothing left to disclose.
 */
export async function checkSetupToken(
  token: string,
): Promise<SetupTokenCheck> {
  if (!token) return { valid: false, reason: "unknown" };

  const client = await (await clients()).findOne({
    setupTokenHash: hashToken(token),
  });

  if (!client) return { valid: false, reason: "unknown" };
  if (client.setupTokenUsedAt) return { valid: false, reason: "used" };
  if (client.status === "suspended") return { valid: false, reason: "suspended" };
  if (
    !client.setupTokenExpiresAt ||
    client.setupTokenExpiresAt.getTime() <= Date.now()
  ) {
    return { valid: false, reason: "expired" };
  }

  return { valid: true, email: client.email, name: client.name };
}

export type CompleteSetupResult =
  | { ok: true; client: Client }
  | {
      ok: false;
      reason: "unknown" | "expired" | "used" | "suspended" | "weak";
    };

/**
 * Sets the password a setup link was issued for, and burns the link.
 *
 * The claim is a single conditional update rather than a read followed by a
 * write. That is what makes the link genuinely single-use: two requests arriving
 * together both pass a prior read, but only one can match a filter that
 * requires the token hash to still be present. The loser is told the link was
 * already used, which is true.
 *
 * The password is hashed before the claim, because scrypt takes long enough that
 * doing it inside the window would widen the race it is trying to close. If the
 * claim then fails, the hash is simply discarded.
 */
export async function completeSetup(
  token: string,
  password: unknown,
): Promise<CompleteSetupResult> {
  if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
    return { ok: false, reason: "weak" };
  }

  const check = await checkSetupToken(token);
  if (!check.valid) return { ok: false, reason: check.reason };

  const passwordHash = await hashPassword(password);
  const tokenHash = hashToken(token);

  const result = await (await clients()).findOneAndUpdate(
    {
      setupTokenHash: tokenHash,
      setupTokenUsedAt: null,
      status: { $ne: "suspended" },
      setupTokenExpiresAt: { $gt: new Date() },
    },
    {
      $set: {
        passwordHash,
        status: "active",
        passwordChangedAt: new Date(),
        failedAttempts: 0,
        lockedUntil: null,
        // Nulled, not left in place. A used token that is still stored is a
        // token that only policy stops working.
        setupTokenHash: null,
        setupTokenUsedAt: new Date(),
      },
    },
    { returnDocument: "after" },
  );

  if (!result) return { ok: false, reason: "used" };

  // Anyone holding a session from before the password was set does not keep it.
  // Setting a password is the moment the account becomes real, and it should
  // start with exactly one way in.
  await revokeAllClientSessions(result._id!);

  return { ok: true, client: result };
}

export type ClientLoginResult =
  | { ok: true; client: Client }
  | { ok: false; reason: "invalid" | "locked" | "inactive" | "invited" };

/**
 * Verifies a client's credentials.
 *
 * The dummy-hash comparison for unknown and not-yet-set-up accounts is the same
 * defence as on the admin side: without it the response time distinguishes
 * addresses that exist from addresses that do not, and the login form becomes a
 * way to enumerate a customer list.
 */
export async function clientLogin(
  emailInput: unknown,
  passwordInput: unknown,
): Promise<ClientLoginResult> {
  if (typeof emailInput !== "string" || typeof passwordInput !== "string") {
    return { ok: false, reason: "invalid" };
  }

  const email = normaliseEmail(emailInput);
  const collection = await clients();
  const client = await collection.findOne({ email });

  if (!client) {
    await verifyPassword(passwordInput, DUMMY_HASH);
    return { ok: false, reason: "invalid" };
  }

  if (isLockedOut(client)) return { ok: false, reason: "locked" };

  if (client.status === "suspended") {
    await verifyPassword(passwordInput, DUMMY_HASH);
    return { ok: false, reason: "inactive" };
  }

  if (!client.passwordHash) {
    await verifyPassword(passwordInput, DUMMY_HASH);
    return { ok: false, reason: "invited" };
  }

  if (!(await verifyPassword(passwordInput, client.passwordHash))) {
    await collection.updateOne(
      { _id: client._id },
      { $set: afterFailedAttempt(client.failedAttempts) },
    );
    return { ok: false, reason: "invalid" };
  }

  await collection.updateOne(
    { _id: client._id },
    { $set: afterSuccessfulLogin() },
  );

  return { ok: true, client };
}

export async function createClientSession(client: Client): Promise<string> {
  const token = newToken();

  await (await sessions()).insertOne({
    tokenHash: hashToken(token),
    clientId: client._id!,
    email: client.email,
    createdAt: new Date(),
    expiresAt: sessionExpiry(),
  });

  return token;
}

export type SessionClient = {
  id: string;
  email: string;
  name: string;
  company: string;
};

/**
 * Resolves a client cookie to the account it belongs to, or null.
 *
 * The status check happens **here**, on every request, not only at sign-in.
 * Checking at sign-in alone means an administrator who deactivates a client has
 * done nothing to the session that client is currently using — it keeps working
 * until it expires, which can be another eight hours. Every request is the only
 * place a revocation can be made to mean "now".
 */
export async function getClientSessionUser(
  token: string | undefined,
): Promise<SessionClient | null> {
  if (!token) return null;

  const sessionCollection = await sessions();
  const session = await sessionCollection.findOne({ tokenHash: hashToken(token) });
  if (!session) return null;

  // Checked here as well as by the TTL index: that monitor runs roughly once a
  // minute, so an expired session can still be present when it is presented.
  if (session.expiresAt.getTime() <= Date.now()) {
    await sessionCollection.deleteOne({ _id: session._id });
    return null;
  }

  const client = await (await clients()).findOne({ _id: session.clientId });
  if (!client) return null;

  if (client.status !== "active" || !client.passwordHash) {
    // The session outlived the account's right to it. Delete rather than merely
    // refuse, so the cookie stops being a live handle.
    await sessionCollection.deleteOne({ _id: session._id });
    return null;
  }

  return {
    id: client._id!.toHexString(),
    email: client.email,
    name: client.name,
    company: client.company ?? "",
  };
}

export async function destroyClientSession(
  token: string | undefined,
): Promise<void> {
  if (!token) return;
  await (await sessions()).deleteOne({ tokenHash: hashToken(token) });
}

export async function revokeAllClientSessions(
  clientId: ObjectId,
): Promise<number> {
  const result = await (await sessions()).deleteMany({ clientId });
  return result.deletedCount ?? 0;
}

export async function countClients(): Promise<{
  total: number;
  active: number;
  invited: number;
  suspended: number;
}> {
  const collection = await clients();

  const [total, active, invited, suspended] = await Promise.all([
    collection.countDocuments(),
    collection.countDocuments({ status: "active" }),
    collection.countDocuments({ status: "invited" }),
    collection.countDocuments({ status: "suspended" }),
  ]);

  return { total, active, invited, suspended };
}
