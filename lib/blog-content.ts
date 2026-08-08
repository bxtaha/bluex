import sanitizeHtml from "sanitize-html";
import {
  createHighlighter,
  createJavaScriptRegexEngine,
  type Highlighter,
} from "shiki";

/**
 * Turning stored post HTML into something safe to put on the page.
 *
 * The brief says to treat stored rich text as untrusted, and it is right to.
 * The obvious objection — "an admin wrote it, an admin is trusted" — is exactly
 * backwards: the admin panel is the highest-value target on this site, and a
 * stored payload there executes with a live session cookie in scope for
 * whoever opens the post next. So content is cleaned **twice**: once on save,
 * so nothing dangerous is ever written down, and again on render, so a document
 * that predates this code or arrived some other way is still safe. Sanitising
 * is cheap and idempotent; being wrong about it once is not.
 */

const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "p", "br", "hr",
    "h2", "h3", "h4",
    "strong", "b", "em", "i", "u", "s", "sup", "sub",
    "ul", "ol", "li",
    "blockquote",
    "pre", "code",
    "a", "img",
    "figure", "figcaption",
    "table", "thead", "tbody", "tr", "th", "td",
  ],
  allowedAttributes: {
    a: ["href", "title", "target", "rel"],
    img: ["src", "alt", "title", "width", "height", "loading"],
    // The language marker on a fence. It is the only thing the highlighter
    // below has to go on, and it is matched against a fixed list, so a class
    // of `language-anything` cannot become an arbitrary CSS hook.
    code: ["class"],
    pre: ["class"],
  },
  // No `data:` and no `javascript:`. `data:` is how an anchor smuggles a
  // document with its own script into the page.
  allowedSchemes: ["http", "https", "mailto", "tel"],
  allowedSchemesAppliedToAttributes: ["href", "src"],
  nonTextTags: ["style", "script", "textarea", "option", "noscript"],
  transformTags: {
    a: sanitizeHtml.simpleTransform("a", {
      target: "_blank",
      rel: "noopener noreferrer",
    }),
    // Every in-body image is lazy and async by default. These are below the
    // fold by definition — the cover image is rendered separately, outside this
    // string — so nothing here belongs on the critical path.
    img: sanitizeHtml.simpleTransform("img", { loading: "lazy" }),
  },
  // `target` and `rel` are in the attribute list above because it is applied
  // *after* the transform, and leaving them out silently strips both.
};

/** Cleans editor output. Called on save and again on render. */
export function sanitisePostHtml(html: string): string {
  if (!html) return "";
  return sanitizeHtml(html, OPTIONS);
}

/* ── Syntax highlighting ─────────────────────────────────────────────────── */

/**
 * Languages the highlighter knows.
 *
 * A fixed list rather than loading on demand: this runs during static
 * generation, and a lazily-loaded grammar means a build that reaches out to
 * disk per post and a page that fails to render because a fence said `elvish`.
 * Anything unlisted falls through to plain text, which still gets the frame and
 * the monospace face — it simply is not coloured.
 */
const LANGUAGES = [
  "typescript", "tsx", "javascript", "jsx", "json", "html", "css",
  "bash", "shell", "python", "sql", "yaml", "markdown", "diff", "php",
] as const;

const ALIASES: Record<string, string> = {
  ts: "typescript",
  js: "javascript",
  sh: "bash",
  zsh: "bash",
  console: "shell",
  yml: "yaml",
  md: "markdown",
  py: "python",
};

declare global {
  var __bxHighlighter: Promise<Highlighter> | undefined;
}

/**
 * One highlighter for the process.
 *
 * Building it parses every grammar in the list, which is far too expensive to
 * repeat per code block, let alone per post. Cached on `globalThis` for the
 * same reason the Mongo client is — module scope does not survive a hot reload.
 *
 * The JavaScript regex engine rather than the default WebAssembly one: the WASM
 * build has to be located and instantiated at runtime, which is exactly the
 * kind of thing a bundler resolves differently between `next dev` and a
 * standalone production output. The JS engine is a little slower and has no
 * such failure mode.
 */
function highlighter(): Promise<Highlighter> {
  globalThis.__bxHighlighter ??= createHighlighter({
    themes: ["github-dark-default"],
    langs: [...LANGUAGES],
    engine: createJavaScriptRegexEngine(),
  });
  return globalThis.__bxHighlighter;
}

/**
 * Undoes the escaping sanitize-html applied to the *text* inside a fence.
 *
 * The highlighter wants source, not markup. `&amp;` is decoded last, or a
 * literal `&amp;lt;` in someone's code sample decodes twice and comes out as
 * `<` — which is how an escaped example turns back into a tag.
 */
function decodeEntities(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#(?:39|x27);/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");
}

const CODE_BLOCK =
  /<pre[^>]*>\s*<code(?:\s+class="([^"]*)")?[^>]*>([\s\S]*?)<\/code>\s*<\/pre>/gi;

function languageFor(className: string | undefined): string | null {
  const raw = className?.match(/language-([\w+-]+)/i)?.[1]?.toLowerCase();
  if (!raw) return null;
  const resolved = ALIASES[raw] ?? raw;
  return (LANGUAGES as readonly string[]).includes(resolved) ? resolved : null;
}

/**
 * Sanitises, then colours the code fences.
 *
 * The order is load-bearing. Sanitising first means the highlighter only ever
 * sees text that has already had its markup stripped and escaped; what it
 * returns is markup *we* generated from that text, not anything the author
 * wrote, which is why it can be inserted without a second cleaning that would
 * strip the colours right back off again.
 *
 * All of it happens on the server during static generation, so a reader
 * downloads coloured HTML and no highlighter at all.
 */
export async function renderPostContent(html: string): Promise<string> {
  const clean = sanitisePostHtml(html);
  if (!clean.includes("<pre")) return clean;

  const blocks = [...clean.matchAll(CODE_BLOCK)];
  if (blocks.length === 0) return clean;

  let shiki: Highlighter;
  try {
    shiki = await highlighter();
  } catch (error) {
    // A page of uncoloured but readable code beats no page.
    console.error("[blog] highlighter unavailable:", error);
    return clean;
  }

  const rendered = await Promise.all(
    blocks.map(async (match) => {
      const language = languageFor(match[1]);
      const code = decodeEntities(match[2]);
      try {
        return shiki.codeToHtml(code, {
          lang: language ?? "text",
          theme: "github-dark-default",
        });
      } catch (error) {
        console.error("[blog] could not highlight a block:", error);
        return match[0];
      }
    }),
  );

  let index = 0;
  return clean.replace(CODE_BLOCK, () => rendered[index++]);
}
