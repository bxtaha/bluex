import "server-only";
import geoip from "geoip-lite";
import { normaliseAddress, type VisitorLocation } from "./visitor-location.ts";

/**
 * The half of the location work that needs the dataset.
 *
 * Deliberately thin. The type, the address normalisation and the formatting
 * live in `visitor-location.ts`, which imports nothing and is therefore both
 * unit-testable and safe for the admin panel to import — this file is only the
 * lookup.
 *
 * `geoip-lite` bundles the MaxMind dataset, so the lookup is in-process and
 * roughly a millisecond, and no third party ever sees a visitor's address —
 * which matters on a site whose CSP comment correctly states that it loads
 * nothing from anyone else. The cost is around 110MB on disk. The alternative,
 * a 24KB reader over a `.mmdb` supplied separately, was rejected because this
 * project has no secret-management story to hang a MaxMind licence key on and
 * inventing one to display city names is disproportionate.
 *
 * **`server-only`** is not decoration: 110MB of geographic data has no business
 * in a browser bundle, and the import turns that from a convention into a build
 * error. It is also why the tests exercise `visitor-location.ts` rather than
 * this file — `server-only` throws outside a Next server context by design.
 */

/**
 * Null for anything not usefully locatable — private, loopback, malformed, or
 * simply absent from the dataset. **Never throws.**
 *
 * This sits between a visitor clicking a button and talking to an agent, and
 * nothing in that path may be able to stop a conversation starting. A caller
 * that receives null stores no location and the panel shows "Unknown", which is
 * an honest answer rather than a fabricated one.
 */
export function lookupLocation(ip: string): VisitorLocation | null {
  const address = normaliseAddress(ip);
  if (!address) return null;

  let found: geoip.Lookup | null;
  try {
    // Returns null for private and loopback ranges of its own accord, which is
    // what we want: in development every request arrives from 127.0.0.1, and a
    // fabricated location there would put one country against every local
    // conversation.
    found = geoip.lookup(address);
  } catch (error) {
    console.error("[geoip] lookup threw:", error);
    return null;
  }

  if (!found) return null;

  // Built field by field rather than spread, so the returned object can only
  // ever hold these three. A spread of the library's row would carry its
  // latitude, longitude, timezone and range along with it — and an address is
  // exactly the kind of thing that ends up in an object nobody audited.
  const location: VisitorLocation = {
    country: typeof found.country === "string" ? found.country : "",
    region: typeof found.region === "string" ? found.region : "",
    city: typeof found.city === "string" ? found.city : "",
  };

  // A row that resolved but carries nothing readable is the same as no row.
  // Storing three empty strings would make the panel claim a location it does
  // not have.
  if (!location.country && !location.city) return null;

  return location;
}
