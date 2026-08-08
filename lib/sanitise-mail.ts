import sanitizeHtml from "sanitize-html";

/**
 * Incoming mail is hostile input, and it is rendered inside the admin panel —
 * the one page on this site where a script would run with a live session
 * cookie in scope. So the HTML is cleaned once, on the server, *before it is
 * stored*, and the raw version is never written down.
 *
 * Cleaning at ingest rather than at render is the important part. Sanitising on
 * the way out means every future read path has to remember to do it; sanitising
 * on the way in means the collection contains nothing that needs remembering.
 *
 * An allow-list, not a block-list. A block-list is a list of the attacks
 * someone thought of.
 */
const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "p", "br", "div", "span",
    "b", "strong", "i", "em", "u", "s",
    "ul", "ol", "li",
    "blockquote", "pre", "code",
    "a",
    "h1", "h2", "h3", "h4", "h5", "h6",
    "table", "thead", "tbody", "tr", "th", "td",
    "hr",
  ],
  allowedAttributes: {
    // `target` and `rel` are here because the transform below adds them and
    // this list is applied *after* it — leaving them out silently stripped
    // both, which looked exactly like a working allow-list right up until you
    // checked the output.
    a: ["href", "title", "target", "rel"],
  },
  // No `data:` and no `javascript:`. `data:` is how an anchor smuggles a
  // document with its own script into the page.
  allowedSchemes: ["http", "https", "mailto", "tel"],
  allowedSchemesAppliedToAttributes: ["href"],
  // Everything the tag list already excludes, dropped *with its contents* —
  // otherwise the text of a <style> block is rendered as visible copy.
  nonTextTags: ["style", "script", "textarea", "option", "noscript"],
  transformTags: {
    a: sanitizeHtml.simpleTransform("a", {
      target: "_blank",
      // `noopener` denies the opened page a handle on this window;
      // `nofollow` because these are links from strangers.
      rel: "noopener noreferrer nofollow",
    }),
  },
  // Images are stripped rather than allowed. A remote <img> in an unsolicited
  // email is usually a tracking pixel, and loading it tells whoever sent it
  // that a real person read the message and roughly when — which is exactly
  // the signal that gets an address sold on. Legible mail loses a little;
  // the alternative leaks.
  disallowedTagsMode: "discard",
};

export function sanitiseMailHtml(html: string): string {
  if (!html) return "";
  return sanitizeHtml(html, OPTIONS);
}

/**
 * Flattens HTML to text, for the list snippet and as a body of last resort when
 * a message arrives with no text/plain part.
 */
export function htmlToText(html: string): string {
  if (!html) return "";
  const withBreaks = html
    .replace(/<\/(p|div|tr|h[1-6]|li)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n");
  return (
    sanitizeHtml(withBreaks, { allowedTags: [], allowedAttributes: {} })
      // Whitespace survives stripping exactly as the source had it, and mail
      // HTML is indented for the machine, not the reader. Edges first, then
      // the blank-line runs — collapsing runs before trimming the indentation
      // leaves lines that are "blank" apart from four spaces, so the collapse
      // does not see them and the result stays full of holes.
      .replace(/[ \t]*\n[ \t]*/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  );
}
