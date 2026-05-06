import DOMPurify from "dompurify";

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
export const NEPAL_PHONE_REGEX = /^(?:\+?977[-\s]?)?(?:97|98)\d{8}$/;
export const IMEI_REGEX = /^\d{15}$/;

export function sanitizeText(value: string, maxLength = 1000) {
  return DOMPurify.sanitize(value, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] })
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

export function sanitizeOptionalText(value: string | null | undefined, maxLength = 1000) {
  const sanitized = sanitizeText(value ?? "", maxLength);
  return sanitized || null;
}

export function normalizeEmail(value: string) {
  return sanitizeText(value, 320).toLowerCase();
}

export function normalizePhone(value: string) {
  return sanitizeText(value, 32).replace(/[\s-]/g, "");
}

export function isValidEmail(value: string) {
  return EMAIL_REGEX.test(normalizeEmail(value));
}

export function isValidNepalPhone(value: string) {
  return NEPAL_PHONE_REGEX.test(normalizePhone(value));
}

export function isValidImei(value: string) {
  const imei = sanitizeText(value, 15);
  if (!IMEI_REGEX.test(imei)) return false;

  let sum = 0;
  for (let i = 0; i < imei.length; i += 1) {
    let digit = Number(imei[i]);
    if (i % 2 === 1) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  return sum % 10 === 0;
}
