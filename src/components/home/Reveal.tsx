/**
 * Progressive enhancement: content is always visible without observers or animations.
 * Scroll entrance effects must never block a page from being read.
 */
import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface RevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  threshold?: number;
  as?: keyof JSX.IntrinsicElements;
  direction?: "up" | "left" | "right" | "scale";
}

export function Reveal({
  children, className, delay = 0, threshold = 0.1,
  as: Tag = "div", direction = "up",
}: RevealProps) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !("IntersectionObserver" in window)) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        el.classList.add("tc-reveal-entered");
        observer.unobserve(el);
      }
    }, { threshold: Math.min(threshold, 0.08), rootMargin: "0px 0px 40px 0px" });

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return (
    // @ts-expect-error -- dynamic React element tag has a compatible ref at runtime
    <Tag
      ref={ref}
      className={cn("tc-reveal-ready", className)}
      data-reveal-direction={direction}
      style={{ "--tc-reveal-delay": Math.min(delay, 700) + "ms" } as React.CSSProperties}
    >
      {children}
    </Tag>
  );
}

interface StaggerProps {
  children: ReactNode;
  className?: string;
  childClassName?: string;
  baseDelay?: number;
  staggerMs?: number;
  direction?: "up" | "left" | "right" | "scale";
}

export function Stagger({
  children, className = "", childClassName = "",
  baseDelay = 0, staggerMs = 80, direction = "up",
}: StaggerProps) {
  return (
    <div className={className}>
      {(Array.isArray(children) ? children : [children]).map((child, i) => (
        <Reveal key={i} delay={baseDelay + i * staggerMs} direction={direction} className={childClassName}>
          {child}
        </Reveal>
      ))}
    </div>
  );
}
