/**
 * Reveal — scroll-triggered fade-up wrapper.
 * Uses IntersectionObserver. No Framer Motion required.
 * Emil principle: only animate what the user hasn't seen yet.
 */
import { useEffect, useRef, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface RevealProps {
  children: ReactNode;
  className?: string;
  delay?: 0 | 1 | 2 | 3 | 4 | 5;
  threshold?: number;
  as?: keyof JSX.IntrinsicElements;
}

export function Reveal({
  children,
  className,
  delay = 0,
  threshold = 0.12,
  as: Tag = "div",
}: RevealProps) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Respect prefers-reduced-motion
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      el.classList.add("reveal-visible");
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("reveal-visible");
          observer.unobserve(el); // Fire once
        }
      },
      { threshold, rootMargin: "0px 0px -40px 0px" },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  const delayClass = delay > 0 ? `reveal-delay-${delay}` : "";

  return (
    // @ts-expect-error -- dynamic tag
    <Tag ref={ref} className={cn("reveal", delayClass, className)}>
      {children}
    </Tag>
  );
}
