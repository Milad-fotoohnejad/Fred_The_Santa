import { desc, eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { bookings, content } from '@/db/schema';
import { isAdmin, json, readContent, sameOrigin } from '@/lib/server';
import { contentSchema } from '@/lib/validation';

export async function GET() {
  if (!await isAdmin()) return json({ error: 'Access denied.' }, 403);
  if (!process.env.DATABASE_URL) return json({ error: 'Connect Neon and run the database migration before opening the workshop.' }, 503);
  try {
    const [requests, site] = await Promise.all([
      getDb().select().from(bookings).orderBy(desc(bookings.createdAt)), readContent(),
    ]);
    return json({ requests, site });
  } catch { return json({ error: 'The workshop database is unavailable. Check its connection and migrations.' }, 503); }
}

export async function PUT(request: Request) {
  if (!sameOrigin(request) || !await isAdmin()) return json({ error: 'Access denied.' }, 403);
  if (!process.env.DATABASE_URL) return json({ error: 'The database is not connected yet.' }, 503);
  const raw = await request.text();
  if (raw.length > 200000) return json({ error: 'Too much content.' }, 413);
  let body;
  try { body = JSON.parse(raw); } catch { return json({ error: 'Invalid request.' }, 400); }
  if (!body || typeof body !== 'object') return json({ error: 'Invalid request.' }, 400);
  try {
    if (body.action === 'status') {
      if (typeof body.id !== 'string' || !['pending', 'approved', 'declined'].includes(body.status)) return json({ error: 'Invalid status.' }, 400);
      const rows = await getDb().update(bookings).set({ status: body.status }).where(eq(bookings.id, body.id)).returning({ id: bookings.id });
      return rows.length ? json({ ok: true }) : json({ error: 'Request not found.' }, 404);
    }
    if (body.action === 'deleteRequest') {
      if (typeof body.id !== 'string') return json({ error: 'Invalid request.' }, 400);
      await getDb().delete(bookings).where(eq(bookings.id, body.id));
      return json({ ok: true });
    }
    const parsed = contentSchema.safeParse(body.site);
    if (!parsed.success) return json({ error: parsed.error.issues[0]?.message || 'Check the content fields.' }, 400);
    await getDb().insert(content).values({ id: 'site', value: JSON.stringify(parsed.data) }).onConflictDoUpdate({ target: content.id, set: { value: JSON.stringify(parsed.data) } });
    return json({ ok: true });
  } catch { return json({ error: 'Changes could not be saved. Check database connectivity and migrations.' }, 503); }
}
