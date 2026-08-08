import sanitizeHtml from "sanitize-html";

/**
 * HTML to readable plain text.
 *
 * Shared, because three unrelated things need it and they must agree: mail
 * snippets in the inbox, a blog post's auto-generated excerpt, and the word
 * count behind its read time. A regex that strips tags gets all three subtly
 * wrong — it runs `<p>one</p><p>two</p>` together as "onetwo", which inflates
 * nothing but reads as one word where there are two, and it happily leaves the
 * contents of a `<style>` block in the output as visible prose.
 *
 * Running the parser twice is the point: the tag list is emptied, so every
 * element is discarded and only text nodes survive, decoded properly.
 */
export function htmlToText(html: string): string {
  if (!html) return "";

  const withBreaks = html
    .replace(/<\/(p|div|tr|h[1-6]|li|blockquote|pre)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n");

  return (
    sanitizeHtml(withBreaks, { allowedTags: [], allowedAttributes: {} })
      // Whitespace survives stripping exactly as the source had it, and both
      // mail HTML and editor output are indented for the machine. Edges first,
      // then the blank-line runs — collapsing runs before trimming the
      // indentation leaves lines that are "blank" apart from four spaces, so
      // the collapse never sees them and the result stays full of holes.
      .replace(/[ \t]*\n[ \t]*/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  );
}

/** Words, for a read time. Punctuation-only tokens do not count. */
export function countWords(text: string): number {
  const matches = text.match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu);
  return matches?.length ?? 0;
}
