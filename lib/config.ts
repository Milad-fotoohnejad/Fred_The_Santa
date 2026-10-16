export function authConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY);
}
export function allowedAdminIds() {
  return (process.env.ADMIN_USER_IDS || '').split(',').map(id => id.trim()).filter(Boolean);
}
export function isAllowedAdmin(userId: string | null) {
  return Boolean(userId && allowedAdminIds().includes(userId));
}
export function bookingsConfigured() {
  return process.env.BOOKINGS_ENABLED === 'true' && Boolean(process.env.DATABASE_URL) &&
    authConfigured() && allowedAdminIds().length > 0;
}
export function blobConfigured() {
  // The SDK resolves OIDC from Vercel's request context at runtime. The token
  // need not exist in process.env; this is a configuration check, not auth.
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);
}
