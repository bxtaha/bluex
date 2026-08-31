import { MongoClient, type Db } from "mongodb";

/**
 * One MongoDB client for the whole process.
 *
 * The driver holds an internal connection pool, so the expensive thing is
 * creating clients, not sharing one. Two details this file exists for:
 *
 * - **Dev.** Next replaces modules on every edit. A client created at module
 *   scope would be recreated on each hot reload while the old one kept its
 *   sockets open, and Atlas starts refusing connections after a few dozen
 *   edits. Stashing the promise on `globalThis` outlives module replacement.
 *
 * - **Serverless.** Instances are reused between invocations, so caching the
 *   promise means the second request through a warm instance does no handshake.
 *
 * The promise is cached rather than the resolved client, so concurrent callers
 * during startup await the same connection instead of racing to open several.
 *
 * **A rejected promise is not cached.** That distinction is the whole of the
 * `.catch` below and it is not defensive habit: a promise caches its rejection
 * exactly as durably as its value, so without it the first failed connect
 * becomes the permanent answer for the life of the process. Every later
 * request is then rejected in microseconds without any attempt being made —
 * indistinguishable, from the outside, from a database that is still down.
 *
 * This was observed rather than imagined. A dev server started while Atlas's
 * DNS was briefly unresolvable, and three hours later — with the cluster
 * healthy and a fresh connection completing in 3.5 seconds — every request was
 * still answering "Sign in is unavailable right now." in 25ms, because none of
 * them ever reached the network. In production it is worse: with
 * `output: "standalone"`, a container that starts during any transient blip
 * stays bricked until somebody notices and restarts it, while its health
 * checks report a process that is running perfectly.
 *
 * The speed of the failure is the diagnostic. A real attempt takes seconds; a
 * cached rejection returns instantly.
 */

declare global {
  // eslint-disable-next-line no-var
  var __bxMongoClient: Promise<MongoClient> | undefined;
}

function clientPromise(): Promise<MongoClient> {
  const uri = process.env.MONGO_URI;

  // Checked here rather than at module scope: this file is reachable from the
  // build's module graph, and throwing on import would fail `next build` on any
  // machine without the secret rather than at the point of use.
  if (!uri) {
    throw new Error(
      "MONGO_URI is not set. Add it to .env.local — see .env.example.",
    );
  }

  if (!globalThis.__bxMongoClient) {
    const pending: Promise<MongoClient> = new MongoClient(uri, {
      // Fail fast rather than hanging a request for 30s when the cluster is
      // unreachable or the IP is not allow-listed. Failing fast is only
      // acceptable because the `.catch` below lets the next request try again
      // — fail-fast without retry is just failing permanently, sooner.
      serverSelectionTimeoutMS: 8000,
    })
      .connect()
      .catch((error: unknown) => {
        // Cleared only if nothing has replaced it. Two requests can race here:
        // a late rejection from the attempt this one superseded must not throw
        // away a retry that is already in flight and may already have
        // succeeded.
        if (globalThis.__bxMongoClient === pending) {
          globalThis.__bxMongoClient = undefined;
        }
        // Rethrown, not swallowed. The caller that triggered this attempt still
        // gets its error — callers already handle that, and the admin login
        // route turns it into "unavailable" rather than "wrong password". What
        // changes is only that the *next* caller starts fresh.
        throw error;
      });

    globalThis.__bxMongoClient = pending;
  }

  return globalThis.__bxMongoClient;
}

export async function getDb(): Promise<Db> {
  const client = await clientPromise();
  // Falls back to the database encoded in the URI when the name is unset.
  return client.db(process.env.MONGO_DB_PROJECT_NAME || undefined);
}
