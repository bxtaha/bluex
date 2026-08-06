"use client";

import * as React from "react";
import { useEffect, useRef } from "react";
import { observeOnce } from "@/lib/reveal";
import { cn } from "@/lib/utils";

type RevealProps = {
  children: React.ReactNode;
  /** Position in a stagger sequence. Drives transition-delay via a CSS var. */
  index?: number;
  as?: "div" | "section" | "p" | "li" | "span" | "h2" | "h3" | "dl" | "ul" | "ol";
  className?: string;
};

/**
 * Fades and lifts its children into place once, when scrolled into view.
 *
 * The reveal itself is a CSS transition — no animation library and no timer per
 * element. JS does exactly one thing: set `data-revealed` when the shared
 * observer fires. The stagger comes from a `--reveal-i` custom property, so a
 * group of siblings needs no JS coordination at all.
 *
 * The attribute is set directly on the node rather than through React state,
 * which keeps a hundred reveals from queueing a hundred re-renders.
 */
export function Reveal({
  children,
  index = 0,
  as: Tag = "div",
  className,
}: RevealProps) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    return observeOnce(el, () => el.setAttribute("data-revealed", "true"));
  }, []);

  return React.createElement(
    Tag,
    {
      ref,
      "data-reveal": "",
      style: { "--reveal-i": index } as React.CSSProperties,
      className: cn(className),
    },
    children,
  );
}

/**
 * Numbers its children for you, so a section body or card grid staggers in
 * reading order without hand-written indices that drift when content changes.
 *
 * `start` offsets the sequence when a group follows earlier revealed elements
 * and should continue their rhythm rather than restarting it.
 */
export function RevealGroup({
  children,
  start = 0,
  as: Tag = "div",
  className,
}: {
  children: React.ReactNode;
  start?: number;
  as?: "div" | "ul" | "ol" | "section";
  className?: string;
}) {
  let cursor = start;

  const numbered = React.Children.map(children, (child) => {
    if (!React.isValidElement(child)) return child;
    if (child.type !== Reveal) return child;
    const props = child.props as RevealProps;
    return React.cloneElement(child as React.ReactElement<RevealProps>, {
      index: props.index ?? cursor++,
    });
  });

  return React.createElement(Tag, { className: cn(className) }, numbered);
}
