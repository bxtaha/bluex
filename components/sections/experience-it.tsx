"use client";

import { useEffect, useRef, useState } from "react";
import { gsap, MOTION_QUERIES } from "@/lib/gsap";
import { RevealText } from "@/components/ui/reveal-text";
import { validateLead, type LeadErrors } from "@/lib/lead";

type Status = "idle" | "sending" | "done" | "error";

const STAGES = [
  "Request received",
  "Handing off to the agent",
  "Queued to dial",
];

/**
 * The proof section. The widget is inline rather than another button that
 * opens the dialog — the whole point is that a sceptic can try it without a
 * detour, so it asks for the two fields the agent actually needs to call.
 */
export function ExperienceIt() {
  const ref = useRef<HTMLElement>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [errors, setErrors] = useState<LeadErrors>({});
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const [dispatched, setDispatched] = useState(false);
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ctx = gsap.matchMedia();

    ctx.add(MOTION_QUERIES.motion, () => {
      const tween = gsap.from(el.querySelector("[data-widget]"), {
        opacity: 0,
        y: 30,
        duration: 0.8,
        ease: "power3.out",
        scrollTrigger: { trigger: el, start: "top 75%", once: true },
      });
      return () => {
        tween.scrollTrigger?.kill();
        tween.kill();
      };
    });

    return () => ctx.revert();
  }, []);

  // Steps the visible stage list while the request is in flight. These describe
  // our own handoff, not the state of a live phone call — we get no callback
  // from Hermes, so claiming "ringing now" would be invented.
  useEffect(() => {
    if (status !== "sending") return;
    // Stage 0 is set by the submit handler, not here — setting it synchronously
    // in the effect body would trigger a cascading render.
    const timers = [
      window.setTimeout(() => setStage(1), 700),
      window.setTimeout(() => setStage(2), 1500),
    ];
    return () => timers.forEach(window.clearTimeout);
  }, [status]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const found = validateLead({ name, phone }, "inline");
    if (Object.keys(found).length > 0) {
      setErrors(found);
      return;
    }

    setStage(0);
    setStatus("sending");
    setMessage("");

    try {
      const response = await fetch("/api/lead", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, phone, source: "inline" }),
      });
      const data = await response.json();

      if (!response.ok) {
        if (data.errors) setErrors(data.errors);
        setStatus("error");
        setMessage(data.message ?? "Please check your details and try again.");
        return;
      }

      setDispatched(data.dispatched === true);
      setStatus("done");
    } catch {
      setStatus("error");
      setMessage("Network problem — please try again.");
    }
  };

  return (
    <section
      ref={ref}
      id="experience"
      className="relative border-y border-white/8 bg-white/[0.015]"
    >
      <div className="mx-auto max-w-[100rem] px-6 py-24 sm:px-10 md:py-32 lg:px-16">
        <div className="mx-auto max-w-2xl text-center">
          <p className="bx-eyebrow">Experience it</p>
          <RevealText
            as="h2"
            className="bx-display mt-3 text-[clamp(2rem,5vw,3.75rem)] text-ink"
          >
            Don&rsquo;t take our word for it.
          </RevealText>
          <p className="mt-5 text-base leading-relaxed text-ink-muted">
            This is the same agent your leads would get. Put your number in and
            it will call you — the demo and the product are the same thing.
          </p>
        </div>

        <div
          data-widget
          className="bx-card bx-hairline mx-auto mt-12 max-w-2xl p-7 sm:p-9"
        >
          {status === "done" ? (
            <div className="py-4 text-center" role="status">
              <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-full bg-electric/15 text-electric">
                <svg viewBox="0 0 24 24" fill="none" className="size-7" aria-hidden>
                  <path
                    d="m5 13 4 4L19 7"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <p className="bx-display text-2xl text-ink">
                {dispatched ? "Your phone is about to ring" : "Got your number"}
              </p>
              <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-ink-muted">
                {dispatched ? (
                  <>
                    The agent is dialling{" "}
                    <span className="text-ink">{phone}</span> now. That is
                    exactly what your own leads would experience.
                  </>
                ) : (
                  <>
                    We have <span className="text-ink">{phone}</span> on file and
                    will be in touch shortly.
                  </>
                )}
              </p>
            </div>
          ) : (
            <form onSubmit={submit} noValidate>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="demo-name"
                    className="mb-1.5 block text-xs font-medium text-ink-muted"
                  >
                    First name
                  </label>
                  <input
                    id="demo-name"
                    type="text"
                    autoComplete="given-name"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      setErrors((p) => ({ ...p, name: undefined }));
                    }}
                    aria-invalid={!!errors.name}
                    aria-describedby={errors.name ? "demo-name-error" : undefined}
                    className={`w-full rounded-lg border bg-white/[0.03] px-3.5 py-3 text-sm text-ink outline-none transition focus:border-electric focus:bg-white/[0.06] ${
                      errors.name ? "border-red-500/70" : "border-white/12"
                    }`}
                  />
                  {errors.name && (
                    <p id="demo-name-error" className="mt-1.5 text-xs text-red-400">
                      {errors.name}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="demo-phone"
                    className="mb-1.5 block text-xs font-medium text-ink-muted"
                  >
                    Phone (with country code)
                  </label>
                  <input
                    id="demo-phone"
                    type="tel"
                    autoComplete="tel"
                    placeholder="+971 ..."
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      setErrors((p) => ({ ...p, phone: undefined }));
                    }}
                    aria-invalid={!!errors.phone}
                    aria-describedby={errors.phone ? "demo-phone-error" : undefined}
                    className={`w-full rounded-lg border bg-white/[0.03] px-3.5 py-3 text-sm text-ink outline-none transition placeholder:text-ink-muted/60 focus:border-electric focus:bg-white/[0.06] ${
                      errors.phone ? "border-red-500/70" : "border-white/12"
                    }`}
                  />
                  {errors.phone && (
                    <p id="demo-phone-error" className="mt-1.5 text-xs text-red-400">
                      {errors.phone}
                    </p>
                  )}
                </div>
              </div>

              {status === "error" && message && (
                <p role="alert" className="mt-4 text-sm text-red-400">
                  {message}
                </p>
              )}

              <div className="mt-6 flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
                <p className="order-2 text-xs text-ink-muted sm:order-1">
                  One call. No sequence, no newsletter.
                </p>
                <button
                  type="submit"
                  disabled={status === "sending"}
                  className="bx-btn bx-btn--signal order-1 w-full sm:order-2 sm:w-auto disabled:opacity-60"
                >
                  {status === "sending" ? "Connecting…" : "Call me now"}
                </button>
              </div>

              {status === "sending" && (
                <ol className="mt-6 space-y-2 border-t border-white/8 pt-5" aria-live="polite">
                  {STAGES.map((label, i) => (
                    <li
                      key={label}
                      className={`flex items-center gap-2.5 text-sm transition-colors ${
                        i <= stage ? "text-ink" : "text-ink-muted/50"
                      }`}
                    >
                      <span
                        className={`size-1.5 shrink-0 rounded-full ${
                          i <= stage ? "bg-electric" : "bg-white/20"
                        }`}
                        aria-hidden
                      />
                      {label}
                    </li>
                  ))}
                </ol>
              )}
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
