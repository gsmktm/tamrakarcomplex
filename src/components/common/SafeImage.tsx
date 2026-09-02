import { useEffect, useMemo, useState } from "react";

type Props = {
  src: string | null | undefined;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  aspect?: "square" | "video" | "free";
  /** Defaults to "lazy". Set "eager" for above-the-fold hero images. */
  loading?: "lazy" | "eager";
  width?: number;
  height?: number;
};

// List of proxies to try for gsmarena images
const PROXIES = [
  (url: string) => `https://images.weserv.nl/?url=${encodeURIComponent(url)}`,
  (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
];

function getFallbackProxy(url: string, attempt: number): string {
  const proxyFn = PROXIES[attempt % PROXIES.length];
  return proxyFn(url);
}

function isGsmArenaUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    return new URL(url).hostname.includes("gsmarena.com");
  } catch {
    return false;
  }
}

function toProxy(url: string): string {
  if (!url) return "/default-product.svg";
  
  // Handle relative paths
  if (url.startsWith("/")) return url;

  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("gsmarena.com")) return getFallbackProxy(url, 0);
    return url;
  } catch {
    // If it's not a valid URL and not a relative path, might be a broken path
    return "/default-product.svg";
  }
}

export function SafeImage({ src, alt, className, style, aspect = "free", loading = "lazy", width, height }: Props) {
  const initial = useMemo(() => (src ? toProxy(src) : "/default-product.svg"), [src]);
  const [current, setCurrent] = useState<string>(initial);
  const [attempt, setAttempt] = useState<number>(isGsmArenaUrl(src) ? 0 : -1);

  useEffect(() => {
    setCurrent(initial);
    setAttempt(isGsmArenaUrl(src) ? 0 : -1);
  }, [initial, src]);

  const onError = () => {
    if (!src) {
      setCurrent("/default-product.svg");
      return;
    }

    // Check if we need to try another proxy (for gsmarena images)
    try {
      const u = new URL(src);
      if (u.hostname.includes("gsmarena.com")) {
        const nextAttempt = attempt + 1;
        if (nextAttempt < PROXIES.length) {
          setAttempt(nextAttempt);
          setCurrent(getFallbackProxy(src, nextAttempt));
          return;
        }
      }
    } catch {
      // do nothing
    }

    // If all else fails, use the default
    setCurrent("/default-product.svg");
  };

  const aspectClass =
    aspect === "square" ? "aspect-square" : aspect === "video" ? "aspect-video" : "";

  return (
    <img
      src={current}
      alt={alt}
      className={`${aspectClass} ${className || ""}`}
      style={style}
      onError={onError}
      loading={loading}
      decoding="async"
      {...(width ? { width } : {})}
      {...(height ? { height } : {})}
      referrerPolicy="no-referrer"
    />
  );
}
