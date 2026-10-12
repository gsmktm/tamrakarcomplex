/** Gateway redirects carry payment data and must use encrypted HTTPS. */
export function secureGatewayUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || !!url.username || !!url.password) return null;
    return url.href;
  } catch {
    return null;
  }
}
