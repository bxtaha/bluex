import {
  randomBytes,
  scrypt,
  timingSafeEqual,
  type ScryptOptions,
} from "node:crypto";

/**
 * Promisified scrypt.
 *
 * Wrapped by hand rather than with `promisify`: its types resolve to the
 * three-argument overload and silently drop the options object, which is where
 * every cost parameter lives — so the call would compile against the wrong
 * signature and hash with defaults.
 */
function scryptAsync(
  password: string,
  salt: Buffer,
  keyLength: number,
  options: ScryptOptions,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keyLength, options, (error, derivedKey) => {
      if (error) reject(error);
      else resolve(derivedKey);
    });
  });
}

/**
 * Password hashing, on `node:crypto`'s scrypt.
 *
 * scrypt rather than a bcrypt/argon2 package because it is a memory-hard KDF in
 * Node core: no dependency to install, no native build to fail on a deploy
 * host, and no supply-chain surface for the one function in the app that
 * guards everything else. bcrypt's other advantage — being deliberately slow —
 * scrypt matches through its cost parameters.
 *
 * The parameters are stored *in* the hash rather than hardcoded at the
 * comparison site, so raising the cost later does not invalidate existing
 * passwords: old hashes keep verifying with the parameters they were made
 * with, and are upgraded the next time their owner signs in.
 */

/** 2^15. With r=8 this is ~32MB of memory per hash. */
const COST = 32768;
const BLOCK_SIZE = 8;
const PARALLELISM = 1;
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;

/** scrypt needs 128 * N * r bytes; the default 32MB cap is just under it. */
const MAX_MEM = 128 * COST * BLOCK_SIZE * 2;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const derived = await scryptAsync(password, salt, KEY_LENGTH, {
    N: COST,
    r: BLOCK_SIZE,
    p: PARALLELISM,
    maxmem: MAX_MEM,
  });

  return [
    "scrypt",
    COST,
    BLOCK_SIZE,
    PARALLELISM,
    salt.toString("base64"),
    derived.toString("base64"),
  ].join("$");
}

export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;

  const [, cost, blockSize, parallelism, saltB64, hashB64] = parts;
  const salt = Buffer.from(saltB64, "base64");
  const expected = Buffer.from(hashB64, "base64");

  let derived: Buffer;
  try {
    derived = await scryptAsync(password, salt, expected.length, {
      N: Number(cost),
      r: Number(blockSize),
      p: Number(parallelism),
      maxmem: MAX_MEM,
    });
  } catch {
    // Corrupt or hostile parameters in the stored value — treat as no match
    // rather than letting it throw into the request.
    return false;
  }

  if (derived.length !== expected.length) return false;
  return timingSafeEqual(derived, expected);
}
