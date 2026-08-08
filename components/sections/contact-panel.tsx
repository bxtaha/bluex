"use client";

import { Mail, MessageCircle, PhoneCall } from "lucide-react";
import { Reveal } from "@/components/motion/reveal";
import { SplitText } from "@/components/motion/split-text";
import { useLeadForm } from "@/components/providers/lead-form-provider";
import { ContactForm } from "@/components/ui/contact-form";
import { whatsappHref } from "@/lib/contact-fields";
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
export function ContactPanel({ settings }: { settings: ContactSettings }) {
  const { open } = useLeadForm();
  const whatsapp = whatsappHref(settings.whatsapp);

  return (
    <section
      id="contact"
      className="relative mx-auto max-w-[100rem] px-6 py-24 sm:px-10 md:py-32 lg:px-16"
    >
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

      {/* `items-start` so the left column keeps its natural height instead of
          stretching to match a form card that is much taller. */}
      <div className="mt-14 grid items-start gap-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)] lg:gap-16">
        <div>
          <Reveal
            as="p"
            className="max-w-md text-base leading-relaxed text-ink-muted sm:text-lg"
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
                than a dead link labelled WhatsApp. */}
            {whatsapp && (
              <Reveal index={2}>
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

          <Reveal index={3} className="mt-8">
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
