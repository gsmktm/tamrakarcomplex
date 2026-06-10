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

const BLOCKED_HOSTS = ["fdn2.gsmarena.com", "fdn.gsmarena.com"];

function toProxy(url: string): string {
  if (!url) return "/default-product.svg";
  
  // Handle relative paths
  if (url.startsWith("/")) return url;

  try {
    const u = new URL(url);
    if (BLOCKED_HOSTS.includes(u.hostname)) {
      return `https://images.weserv.nl/?url=${encodeURIComponent(u.hostname + u.pathname)}`;
    }
    return url;
  } catch {
    // If it's not a valid URL and not a relative path, might be a broken path
    return "/default-product.svg";
  }
}

export function SafeImage({ src, alt, className, style, aspect = "free", loading = "lazy", width, height }: Props) {
  const initial = useMemo(() => (src ? toProxy(src) : "/default-product.svg"), [src]);
  const [current, setCurrent] = useState<string>(initial);

  useEffect(() => {
    setCurrent(initial);
  }, [initial]);

  const onError = () => {
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
      crossOrigin="anonymous"
    />
  );
}
