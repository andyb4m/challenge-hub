export const DEFAULT_AFTER_AUTH = "/challenges";

/**
 * Sanitizes the ?next= redirect target used by the login/register pages.
 * Only same-site absolute paths are allowed — anything else (full URLs,
 * protocol-relative //host, empty) falls back to the default, so the
 * param can't be abused as an open redirect.
 */
export function safeNextPath(raw: string | null | undefined): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) {
    return DEFAULT_AFTER_AUTH;
  }
  return raw;
}
