import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { authConfigured, isAllowedAdmin, bookingsConfigured, blobConfigured } from '../lib/config.ts';
import { bookingSchema, contentSchema } from '../lib/validation.ts';
import { initialContent, monday, shiftDay } from '../lib/content.ts';
import { photoType } from '../lib/photo-validation.ts';

function withEnv(values, run) {
  const old = { ...process.env };
  for (const key of ['DATABASE_URL','ADMIN_USER_IDS','NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY','CLERK_SECRET_KEY','BOOKINGS_ENABLED','ALLOW_PRIVATE_PREVIEW_ADMIN','BLOB_READ_WRITE_TOKEN','BLOB_STORE_ID','VERCEL_OIDC_TOKEN']) delete process.env[key];
  Object.assign(process.env, values);
  try { run(); } finally { process.env = old; }
}

test('unconfigured deployments deny admin and booking access; old Sites bypass has no effect', () => {
  withEnv({ ALLOW_PRIVATE_PREVIEW_ADMIN: 'true' }, () => {
    assert.equal(authConfigured(), false);
    assert.equal(isAllowedAdmin('user_guest'), false);
    assert.equal(bookingsConfigured(), false);
  });
});
test('admin access uses exact Clerk user IDs and rejects anonymous / partial matches', () => {
  withEnv({ ADMIN_USER_IDS: 'user_fred, user_milad' }, () => {
    assert.equal(isAllowedAdmin('user_fred'), true);
    for (const id of [null, '', 'fred', 'user_guest', 'user_fred_extra']) assert.equal(isAllowedAdmin(id), false);
  });
});
test('booking launch requires database, Clerk, administrator, and an explicit flag', () => {
  const ready = { DATABASE_URL: 'postgresql://example.invalid/test', ADMIN_USER_IDS: 'user_fred', NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: 'test', CLERK_SECRET_KEY: 'test', BOOKINGS_ENABLED: 'true' };
  withEnv(ready, () => assert.equal(bookingsConfigured(), true));
  for (const key of Object.keys(ready)) {
    const missing = { ...ready }; delete missing[key];
    withEnv(missing, () => assert.equal(bookingsConfigured(), false));
  }
});
test('connected Blob stores reach SDK authentication without an environment OIDC token', () => {
  withEnv({ BLOB_STORE_ID: 'store_test' }, () => {
    assert.equal(process.env.VERCEL_OIDC_TOKEN, undefined);
    assert.equal(blobConfigured(), true);
    assert.equal(isAllowedAdmin(null), false);
  });
  withEnv({ BLOB_READ_WRITE_TOKEN: 'test-token' }, () => assert.equal(blobConfigured(), true));
  withEnv({}, () => assert.equal(blobConfigured(), false));
  withEnv({ VERCEL_OIDC_TOKEN: 'test-token' }, () => assert.equal(blobConfigured(), false));
});
test('photo sources accept Blob HTTPS URLs and reject unsafe / obsolete sources', () => {
  assert(contentSchema.safeParse(initialContent).success);
  assert(contentSchema.safeParse({ ...initialContent, heroImage: 'https://example.public.blob.vercel-storage.com/santa/photo.jpg' }).success);
  for (const src of ['javascript:alert(1)','http://example.public.blob.vercel-storage.com/a','https://example.public.blob.vercel-storage.com.evil.test/a','https://evil.test/a','/api/photos/old-r2-id']) {
    assert.equal(contentSchema.safeParse({ ...initialContent, heroImage: src }).success, false);
  }
});
test('booking input validates consent, email, calendar dates, and bot trap', () => {
  const valid={name:'Test Guest',email:'guest@example.com',phone:'6045550100',date:'2026-12-20',time:'15:30',duration:'1 hour',eventType:'Home visit',location:'Test venue',notes:'',consent:true};
  assert(bookingSchema.safeParse(valid).success);
  for (const change of [{email:'invalid'},{consent:false},{date:'2026-02-30'},{time:'25:00'},{website:'bot'}]) assert.equal(bookingSchema.safeParse({...valid,...change}).success,false);
});
test('upload identifies supported signatures and rejects SVG and random data', () => {
  assert.equal(photoType(new Uint8Array([255,216,255,0]))?.extension, 'jpg');
  assert.equal(photoType(new Uint8Array([137,80,78,71,13,10,26,10]))?.extension, 'png');
  assert.equal(photoType(new TextEncoder().encode('RIFF1234WEBP1234'))?.extension, 'webp');
  assert.equal(photoType(new TextEncoder().encode('<svg onload="alert(1)"></svg>')), null);
  assert.equal(photoType(new Uint8Array()), null);
});
test('calendar weeks span years correctly', () => {
  assert.equal(monday('2027-01-01'), '2026-12-28');
  assert.equal(shiftDay('2026-12-28', 6), '2027-01-03');
});
test('generated migration targets Postgres with pending default and both records', () => {
  const sql=readFileSync(new URL('../drizzle/0000_dusty_whirlwind.sql', import.meta.url), 'utf8');
  assert.match(sql, /CREATE TABLE "bookings"/);
  assert.match(sql, /CREATE TABLE "content"/);
  assert.match(sql, /DEFAULT 'pending'/);
});
