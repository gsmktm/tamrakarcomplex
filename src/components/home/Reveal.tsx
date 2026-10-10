/**
 * Reveal — scroll-triggered entrance wrapper.
 * Uses IntersectionObserver. No external animation library required.
 * Respects prefers-reduced-motion.
 */
import { useEffect, useRef, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface RevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  threshold?: number;
  as?: keyof JSX.IntrinsicElements;
  direction?: "up" | "left" | "right" | "scale";
}

const directionMap: Record<string, { hidden: string; visible: string }> = {
  up:    { hidden: "opacity-0 translate-y-6",  visible: "opacity-100 translate-y-0" },
  left:  { hidden: "opacity-0 -translate-x-6", visible: "opacity-100 translate-x-0" },
  right: { hidden: "opacity-0 translate-x-6",  visible: "opacity-100 translate-x-0" },
  scale: { hidden: "opacity-0 scale-95",      visible: "opacity-100 scale-10" },
};

export function Reveal({
  children,
  className,
  delay = 0,
  threshold = 0.1,
  as: Tag = "div",
  direction = "up",
}: RevealProps) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      el.classList.remove(directionMap[direction].hidden);
      el.classList.add(directionMap[direction].visible);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.remove(directionMap[direction].hidden);
          el.classList.add(directionMap[direction].visible);
          observer.unobserve(el);
        }
      },
      { threshold, rootMargin: "0px 0px -30px 0px" },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, direction]);

  return (
    // @ts-expect-error -- dynamic tag
    <Tag
      ref={ref}
      className={cn(
        "transition-all duration-700 ease-out",
        directionMap[direction].hidden,
        className,
      )}
      style={{ transitionDelay: `${delay}ms` }}
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
  children,
  className = "",
  childClassName = "",
  baseDelay = 0,
  staggerMs = 80,
  direction = "up",
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
