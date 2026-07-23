"use client";

import { useRef, useEffect, ReactNode } from "react";

interface Props {
  children: ReactNode;
  className?: string;
  delay?: number;
  direction?: "up" | "left" | "right" | "scale";
}

const directionClass: Record<NonNullable<Props["direction"]>, string> = {
  up:    "ka-reveal",
  left:  "ka-reveal-left",
  right: "ka-reveal-right",
  scale: "ka-reveal-scale",
};

const sectionRevealCallbacks = new Map<Element, () => void>();
let sectionRevealObserver: IntersectionObserver | null = null;

function observeSectionReveal(element: HTMLElement) {
  if (!("IntersectionObserver" in window)) {
    element.classList.add("ka-visible");
    return () => undefined;
  }

  if (!sectionRevealObserver) {
    sectionRevealObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          sectionRevealCallbacks.get(entry.target)?.();
          sectionRevealCallbacks.delete(entry.target);
          sectionRevealObserver?.unobserve(entry.target);
        }

        if (sectionRevealCallbacks.size === 0) {
          sectionRevealObserver?.disconnect();
          sectionRevealObserver = null;
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
    );
  }

  sectionRevealCallbacks.set(element, () => element.classList.add("ka-visible"));
  sectionRevealObserver.observe(element);

  return () => {
    sectionRevealCallbacks.delete(element);
    sectionRevealObserver?.unobserve(element);
    if (sectionRevealCallbacks.size === 0) {
      sectionRevealObserver?.disconnect();
      sectionRevealObserver = null;
    }
  };
}

export default function AnimatedSection({
  children,
  className = "",
  delay = 0,
  direction = "up",
}: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (delay > 0) {
      el.style.transitionDelay = `${delay}ms`;
    }

    return observeSectionReveal(el);
  }, [delay]);

  return (
    <div ref={ref} className={`${directionClass[direction]} ${className}`}>
      {children}
    </div>
  );
}
