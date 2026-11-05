export function normalizeApiOrigin(value) {
  const input = (value ?? '').trim();
  if (!input) return '';
  if (/^https?:\/\/[^/?#@\\\s]+\/*$/i.test(input)) return new URL(input).origin;
  throw new Error('VITE_API_BASE_URL must be empty or an HTTP(S) origin without a path.');
}

export const API_ORIGIN = normalizeApiOrigin(import.meta.env.VITE_API_BASE_URL);
