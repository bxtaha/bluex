import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

/**
 * Copies the audio worklets the voice SDK needs into `public/worklets/`.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Why these files are served from this origin rather than left to the SDK.
 *
 * Left alone, `@elevenlabs/client` loads its two worklets by building a Blob
 * from an inlined source string and calling `audioWorklet.addModule()` on a
 * `blob:` URL — falling back to a `data:` URL if that is refused. And it loads
 * libsamplerate from `cdn.jsdelivr.net`, hard-coded.
 *
 * All three are scripts, so all three are governed by `script-src`. Running
 * them as shipped would mean adding `blob:`, `data:` **and a third-party CDN**
 * to the script-src of a site whose CSP comment currently states, accurately,
 * that it loads no third-party script at all. That is a much larger concession
 * than this feature needs, and the CDN one is not even a concession to our own
 * code — it is an outage waiting on somebody else's uptime.
 *
 * The SDK anticipates this. `AudioWorkletConfig`'s own doc comment reads:
 * "Allows self-hosting the worklets to avoid whitelisting blob: and data: in
 * the CSP script-src". Passing `workletPaths` and `libsampleratePath` makes it
 * load all three from here instead, and the CSP change this feature needs
 * shrinks to microphone permission and one connect-src host.
 *
 * The libsamplerate one is not optional or rare, which is worth knowing before
 * anyone deletes it: the SDK fetches it whenever the audio context's sample
 * rate differs from the agent's, which is the ordinary case on a 48kHz device
 * talking to a 16kHz agent.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Run after any upgrade of `@elevenlabs/client`:
 *
 *     npm run worklets:sync
 *
 * These are vendored copies of a dependency's internals, so they can go stale
 * silently — which is exactly why regenerating them is one command and not a
 * paragraph in a README nobody re-reads. The build does not run this: a
 * postinstall that writes into `public/` would surprise anyone who ran `npm
 * ci` expecting a read-only install.
 */

const OUT_DIR = new URL("../public/worklets/", import.meta.url);

/**
 * Both packages are reached by path rather than through `require.resolve`.
 *
 * Their `exports` maps do not expose these internals — resolving them fails
 * with ERR_PACKAGE_PATH_NOT_EXPORTED, which is the package telling us these
 * are not a public API. They are not, and vendoring them is a deliberate
 * exception rather than something to route around quietly: that is what the
 * shape check in `extractWorkletSource` and the byte-count output are for.
 */
const MODULES = new URL("../node_modules/", import.meta.url);

/**
 * Pulls the worklet source back out of the SDK's generated module.
 *
 * The generated file wraps the source in a `createWorkletModuleLoader(name,
 * `…`)` call, so the source is the one template literal in it. Read as text
 * and sliced rather than imported: importing it would pull in
 * `createWorkletModuleLoader`, which reaches for `Blob` and `URL` — neither of
 * which exists in the Node process running this script.
 */
function extractWorkletSource(file: string): string {
  const raw = readFileSync(new URL(file, MODULES), "utf8");

  const start = raw.indexOf("`");
  const end = raw.lastIndexOf("`");
  if (start === -1 || end <= start) {
    throw new Error(
      `Could not find the worklet source in ${file}. The SDK's generated file has changed shape — check what it looks like now before trusting this script.`,
    );
  }

  // The template literal is plain JavaScript with no interpolation, so the
  // only escape the wrapper adds is for backticks in the source itself.
  return raw.slice(start + 1, end).replace(/\\`/g, "`").replace(/\\\$/g, "$");
}

async function main(): Promise<void> {
  mkdirSync(OUT_DIR, { recursive: true });

  const worklets = [
    {
      module: "@elevenlabs/client/dist/platform/web/rawAudioProcessor.generated.js",
      out: "raw-audio-processor.js",
    },
    {
      module: "@elevenlabs/client/dist/platform/web/audioConcatProcessor.generated.js",
      out: "audio-concat-processor.js",
    },
  ];

  for (const worklet of worklets) {
    const source = extractWorkletSource(worklet.module);
    // A worklet has to register a processor to be worth serving. An empty or
    // truncated extraction would otherwise load fine and fail later as
    // "unknown processor", which points nowhere near this script.
    if (!source.includes("registerProcessor")) {
      throw new Error(
        `Extracted ${worklet.out} but it registers no processor — the SDK's generated file has changed shape.`,
      );
    }
    writeFileSync(new URL(worklet.out, OUT_DIR), source, "utf8");
    console.log(`wrote public/worklets/${worklet.out} (${source.length} bytes)`);
  }

  copyFileSync(
    new URL("@alexanderolsen/libsamplerate-js/dist/libsamplerate.worklet.js", MODULES),
    new URL("libsamplerate.worklet.js", OUT_DIR),
  );
  console.log("wrote public/worklets/libsamplerate.worklet.js");
}

await main();
