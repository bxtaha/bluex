"use client";

import { useEffect, useRef } from "react";

/**
 * The bars that move while somebody is talking.
 *
 * Driven by real audio in both directions — `getInputByteFrequencyData` and
 * `getOutputByteFrequencyData` off the SDK, which hand back the analyser's
 * spectrum focused on 100–8000Hz. Nothing here is a decorative loop pretending
 * to be a voice.
 *
 * **Nothing in this component causes a React render.** Those two getters are
 * pull functions rather than state, so the frame loop reads them and writes
 * `transform` straight onto the bars through refs. A sixty-times-a-second
 * animation that re-rendered a component tree would cost more than the whole
 * rest of the panel put together.
 *
 * `transform: scaleY()` and nothing else, so the work stays on the compositor:
 * no layout, no paint, seven style writes a frame. Height or flex-basis would
 * put a layout pass in the middle of every frame.
 *
 * Who has the floor is a colour change, handled in CSS off `data-speaker` —
 * electric blue when the agent is talking, signal cream when the visitor is.
 * The two are far enough apart in hue to read at a glance without a legend.
 */

const BAR_COUNT = 7;

/**
 * Fast up, slow down.
 *
 * A symmetric filter either lags the start of a word or strobes on every
 * consonant. Speech has a sharp attack and a soft tail, and matching that is
 * what makes the bars look like they belong to the voice rather than to a
 * random number generator.
 */
const ATTACK = 0.45;
const RELEASE = 0.12;

/** Never fully collapsed: a bar at zero height reads as broken, not as quiet. */
const FLOOR = 0.12;

type Levels = { current: number[] };

/**
 * One frequency spectrum into seven bar heights.
 *
 * The bands are cut logarithmically rather than evenly. Voice energy crowds
 * into the bottom of the range, so seven equal slices of a linear spectrum
 * would leave the top four bars permanently flat — technically correct and
 * visually dead.
 */
function readBands(data: Uint8Array, into: number[]): void {
  const usable = Math.max(1, Math.floor(data.length * 0.7));

  for (let bar = 0; bar < BAR_COUNT; bar += 1) {
    const start = Math.floor(usable * (bar / BAR_COUNT) ** 1.6);
    const end = Math.max(start + 1, Math.floor(usable * ((bar + 1) / BAR_COUNT) ** 1.6));

    let sum = 0;
    for (let i = start; i < end; i += 1) sum += data[i] ?? 0;

    into[bar] = sum / (end - start) / 255;
  }
}

export function SupportWaveform({
  active,
  speaker,
  reducedMotion,
  getInputData,
  getOutputData,
}: {
  /** Whether there is anything to read. The loop does not start otherwise. */
  active: boolean;
  speaker: "agent" | "visitor" | "idle";
  reducedMotion: boolean;
  getInputData: () => Uint8Array;
  getOutputData: () => Uint8Array;
}) {
  const bars = useRef<(HTMLSpanElement | null)[]>([]);
  const smoothed = useRef<number[]>(Array.from({ length: BAR_COUNT }, () => FLOOR));

  // Read through refs inside the loop so that changing either one does not
  // tear the animation down and start it again mid-word.
  //
  // Assigned in an effect rather than during render. Writing to a ref while
  // rendering is what this repo's `react-hooks/refs` rule blocks, and it is
  // right to: a render can be discarded, so a mutation made during one may or
  // may not have happened.
  const speakerRef = useRef(speaker);
  const getters = useRef({ getInputData, getOutputData });

  useEffect(() => {
    speakerRef.current = speaker;
  }, [speaker]);

  useEffect(() => {
    getters.current = { getInputData, getOutputData };
  }, [getInputData, getOutputData]);

  useEffect(() => {
    // The loop is the whole cost of this component, so it does not exist
    // unless it has something to show. Closing the panel unmounts this, which
    // is what guarantees nothing animates behind a closed panel.
    if (!active || reducedMotion) return;

    let frame = 0;
    const levels: Levels = { current: Array.from({ length: BAR_COUNT }, () => 0) };
    const start = performance.now();

    const tick = (now: number) => {
      const current = speakerRef.current;

      if (current === "idle") {
        // Alive, not frantic. A slow counter-phase drift so the panel reads as
        // listening rather than frozen — a still waveform during a silence is
        // indistinguishable from a crashed one.
        const t = (now - start) / 1000;
        for (let i = 0; i < BAR_COUNT; i += 1) {
          levels.current[i] = FLOOR + 0.06 * (1 + Math.sin(t * 1.6 + i * 0.7));
        }
      } else {
        try {
          const data =
            current === "agent"
              ? getters.current.getOutputData()
              : getters.current.getInputData();
          readBands(data, levels.current);
        } catch {
          // The analyser is torn down slightly before the status changes, so a
          // getter can throw on the last frame or two of a session. Holding
          // the previous levels lets them decay out rather than snapping to
          // zero, and there is nothing here worth reporting.
        }
      }

      for (let i = 0; i < BAR_COUNT; i += 1) {
        const target = Math.max(FLOOR, Math.min(1, levels.current[i] ?? 0));
        const previous = smoothed.current[i] ?? FLOOR;
        const rate = target > previous ? ATTACK : RELEASE;
        const next = previous + (target - previous) * rate;

        smoothed.current[i] = next;

        const bar = bars.current[i];
        if (bar) bar.style.transform = `scaleY(${next.toFixed(3)})`;
      }

      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active, reducedMotion]);

  /*
   * Reduced motion gets a state, not an animation.
   *
   * This is a rAF loop rather than a CSS animation, so the blanket
   * `animation-iteration-count: 1` rule in the motion-safety block does not
   * reach it — the gate has to be here. What replaces it still has to answer
   * "is anything happening", so it is a labelled dot rather than a blank space.
   */
  if (reducedMotion) {
    return (
      <div className="bx-support-wave bx-support-wave--static" data-speaker={speaker}>
        <span className="bx-support-wave__dot" aria-hidden />
      </div>
    );
  }

  return (
    <div className="bx-support-wave" data-speaker={speaker} aria-hidden>
      {Array.from({ length: BAR_COUNT }, (_, i) => (
        <span
          key={i}
          ref={(node) => {
            bars.current[i] = node;
          }}
          className="bx-support-wave__bar"
        />
      ))}
    </div>
  );
}
