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
    globalThis.__bxMongoClient = new MongoClient(uri, {
      // Fail fast rather than hanging a request for 30s when the cluster is
      // unreachable or the IP is not allow-listed.
      serverSelectionTimeoutMS: 8000,
    }).connect();
  }

  return globalThis.__bxMongoClient;
}

export async function getDb(): Promise<Db> {
  const client = await clientPromise();
  // Falls back to the database encoded in the URI when the name is unset.
  return client.db(process.env.MONGO_DB_PROJECT_NAME || undefined);
}
