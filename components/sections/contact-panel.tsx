"use client";

import { Mail, MessageCircle, Phone, PhoneCall } from "lucide-react";
import { Reveal } from "@/components/motion/reveal";
import { SplitText } from "@/components/motion/split-text";
import { useLeadForm } from "@/components/providers/lead-form-provider";
import { ContactForm } from "@/components/ui/contact-form";
import { telHref, whatsappHref } from "@/lib/contact-fields";
import type { ContactSettings } from "@/lib/contact-store";

/**
 * The contact section.
 *
 * Two columns on desktop, stacked on a phone, and the order matters in that
 * stack: the copy and the direct methods come first, so someone who would
 * rather just call is not scrolled past a form to find the number.
 *
 * Client-side because of the secondary CTA, which opens the same shared lead
 * dialog every other "call me" on the page opens — one dialog instance, from
 * `LeadFormProvider`.
 */
/**
 * The flag beside the phone label.
 *
 * Drawn, not typed. A 🇺🇸 emoji is two regional-indicator codepoints that the
 * font is asked to fuse into one glyph, and Chrome and Edge on Windows refuse —
 * they render the letters "US" instead. That is not an edge case for this site:
 * the audience is deliberately international and Windows is most of it.
 *
 * Stars are omitted on purpose. The canton is about six pixels wide at this
 * size, so fifty of anything inside it is noise that costs bytes and renders as
 * a smudge; stripes and a blue canton are already unmistakable.
 */
function UnitedStatesFlag() {
  return (
    <svg
      className="bx-contact__row-flag"
      viewBox="0 0 19 10"
      // Decorative. The label already says Phone and the number already carries
      // its +1 — a screen reader announcing "United States flag" here would be
      // reading out the decoration and not the fact.
      aria-hidden
      focusable="false"
    >
      <rect width="19" height="10" fill="#fff" />
      <g fill="#b31942">
        <rect width="19" height="0.77" y="0" />
        <rect width="19" height="0.77" y="1.54" />
        <rect width="19" height="0.77" y="3.08" />
        <rect width="19" height="0.77" y="4.62" />
        <rect width="19" height="0.77" y="6.15" />
        <rect width="19" height="0.77" y="7.69" />
        <rect width="19" height="0.77" y="9.23" />
      </g>
      <rect width="7.6" height="5.38" fill="#0a3161" />
    </svg>
  );
}

export function ContactPanel({ settings }: { settings: ContactSettings }) {
  const { open } = useLeadForm();
  const whatsapp = whatsappHref(settings.whatsapp);
  const phone = telHref(settings.phone);

  return (
    <section
      id="contact"
      className="relative mx-auto max-w-[100rem] px-6 py-24 sm:px-10 md:py-32 lg:px-16"
    >
      {/* The heading sits inside the left column rather than above the grid, so
          the form card starts level with "Get in touch" instead of below the
          whole title block. `items-start` so the left column keeps its natural
          height instead of stretching to match a form card that is taller. */}
      <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)] lg:gap-16">
        <div>
          <div className="max-w-2xl">
            <Reveal as="p" className="bx-eyebrow">
              Get in touch
            </Reveal>
            <SplitText
              as="h2"
              className="bx-display mt-3 text-[clamp(2rem,5vw,3.75rem)] text-ink"
            >
              Start with a call, or just send a note.
            </SplitText>
          </div>

          <Reveal
            as="p"
            className="mt-14 max-w-md text-base leading-relaxed text-ink-muted sm:text-lg"
          >
            {settings.intro}
          </Reveal>

          <div className="mt-10 space-y-3">
            <Reveal index={1}>
              <a className="bx-contact__row" href={`mailto:${settings.email}`}>
                <span className="bx-contact__row-icon" aria-hidden>
                  <Mail className="size-4" strokeWidth={1.8} />
                </span>
                <span className="bx-contact__row-text">
                  <span className="bx-contact__row-label">Email</span>
                  <span className="bx-contact__row-value">{settings.email}</span>
                </span>
              </a>
            </Reveal>

            {/* Absent, not empty. An unset number renders no row at all rather
                than a dead link labelled Phone. */}
            {phone && (
              <Reveal index={2}>
                <a className="bx-contact__row" href={phone}>
                  <span className="bx-contact__row-icon" aria-hidden>
                    <Phone className="size-4" strokeWidth={1.8} />
                  </span>
                  <span className="bx-contact__row-text">
                    <span className="bx-contact__row-label">
                      Phone
                      <UnitedStatesFlag />
                    </span>
                    <span className="bx-contact__row-value">
                      {settings.phone}
                    </span>
                  </span>
                </a>
              </Reveal>
            )}

            {whatsapp && (
              <Reveal index={3}>
                <a
                  className="bx-contact__row"
                  href={whatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span className="bx-contact__row-icon" aria-hidden>
                    <MessageCircle className="size-4" strokeWidth={1.8} />
                  </span>
                  <span className="bx-contact__row-text">
                    <span className="bx-contact__row-label">WhatsApp</span>
                    <span className="bx-contact__row-value">
                      {settings.whatsapp}
                    </span>
                  </span>
                  <span className="sr-only">(opens in a new tab)</span>
                </a>
              </Reveal>
            )}
          </div>

          <Reveal index={4} className="mt-8">
            <button type="button" onClick={open} className="bx-btn bx-btn--ghost">
              <PhoneCall className="size-4" strokeWidth={1.8} aria-hidden />
              Get a call within 5 minutes
            </button>
          </Reveal>
        </div>

        <Reveal index={1} className="bx-card bx-hairline p-6 sm:p-8">
          <ContactForm />
        </Reveal>
      </div>
    </section>
  );
}
