"use client";

import { useLeadForm } from "@/components/providers/lead-form-provider";

/**
 * The block that closes every post.
 *
 * The only client component on a post page. It opens the same shared lead
 * dialog the marketing site opens — one instance, from `LeadFormProvider` in
 * the blog layout — rather than a second form that would have to be kept in
 * step with the first.
 */
export function PostCta() {
  const { open } = useLeadForm();

  return (
    <aside className="bx-card bx-hairline bx-post-cta">
      <p className="bx-eyebrow">The pitch, briefly</p>
      <p className="bx-display mt-3 text-[clamp(1.5rem,3.5vw,2.25rem)] text-ink">
        Want every lead called back in five minutes?
      </p>
      <p className="mt-4 max-w-lg text-sm leading-relaxed text-ink-muted sm:text-base">
        Leave your number and our agent rings you back. That is the pitch and
        the demonstration at the same time.
      </p>
      <button
        type="button"
        onClick={open}
        className="bx-btn bx-btn--signal bx-btn--sm mt-7"
      >
        Get a call within 5 minutes
      </button>
    </aside>
  );
}
