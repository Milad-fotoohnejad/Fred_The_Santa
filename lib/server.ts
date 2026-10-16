import { createHash } from 'node:crypto';
import { auth } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { content } from '@/db/schema';
import { initialContent, type SiteContent } from './content';
import { contentSchema } from './validation';
import { authConfigured, isAllowedAdmin } from './config';
export async function readContent(): Promise<SiteContent> {
  const rows = await getDb().select().from(content).where(eq(content.id, 'site'));
  return rows[0] ? contentSchema.parse(JSON.parse(rows[0].value)) : initialContent;
}
export async function loadPublicContent() {
  if (!process.env.DATABASE_URL) return { site: initialContent, storageReady: false };
  try { return { site: await readContent(), storageReady: true }; }
  catch {
    console.error('Website content could not be loaded. Check database connectivity and migrations.');
    return { site: initialContent, storageReady: false };
  }
}
export async function isAdmin() {
  if (!authConfigured()) return false;
  const { userId } = await auth();
  return isAllowedAdmin(userId);
}
export function sameOrigin(request: Request) {
  return request.headers.get('origin') === new URL(request.url).origin;
}
export function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
}

export function contentRevision(site: SiteContent) { return createHash('sha256').update(JSON.stringify(site)).digest('hex'); }
