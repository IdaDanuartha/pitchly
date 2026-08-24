"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

type FadeVariant = "up" | "left" | "right" | "fade";

interface ScrollRevealProps {
  children: React.ReactNode;
  className?: string;
  variant?: FadeVariant;
  /** Delay in seconds */
  delay?: number;
  /** Stagger children instead of animating the wrapper */
  stagger?: boolean;
  staggerDelay?: number;
}

const variantConfig: Record<FadeVariant, { y?: number; x?: number; opacity: number }> = {
  up:    { y: 40, opacity: 0 },
  left:  { x: -40, opacity: 0 },
  right: { x: 40, opacity: 0 },
  fade:  { opacity: 0 },
};

export function ScrollReveal({
  children,
  className,
  variant = "up",
  delay = 0,
  stagger = false,
  staggerDelay = 0.1,
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const from = variantConfig[variant];
    const targets = stagger ? Array.from(el.children) : el;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        targets,
        { ...from },
        {
          y: 0,
          x: 0,
          opacity: 1,
          duration: 0.75,
          delay,
          ease: "power3.out",
          stagger: stagger ? staggerDelay : 0,
          scrollTrigger: {
            trigger: el,
            start: "top 88%",
            toggleActions: "play none none none",
          },
        },
      );
    }, el);

    return () => ctx.revert();
  }, [variant, delay, stagger, staggerDelay]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
