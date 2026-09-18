/**
 * Single-admin gate for the /admin surface. Andreas is the only admin,
 * so this is deliberately just an email allowlist of one via a
 * server-only env var — not a roles system. `email` must come from a
 * verified Firebase ID token (adminAuth().verifyIdToken()), never a
 * client-supplied header or body field.
 */
export function isAdminEmail(email: string | null | undefined): boolean {
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (!adminEmail || !email) return false;
  return email.trim().toLowerCase() === adminEmail;
}
