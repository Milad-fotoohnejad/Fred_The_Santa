import test from 'node:test';
import assert from 'node:assert/strict';
import { MAX_PHOTO_BYTES, photoUploadError, readPhotoUploadResponse } from '../lib/photo-validation.ts';

test('photo selection rejects oversized, empty and unsupported files before upload', () => {
  assert.equal(photoUploadError({size: MAX_PHOTO_BYTES, type: 'image/png'}), null);
  assert.match(photoUploadError({size: MAX_PHOTO_BYTES + 1, type: 'image/png'}), /too large/);
  assert.match(photoUploadError({size: 0, type: 'image/jpeg'}), /empty/);
  assert.match(photoUploadError({size: 100, type: 'image/heic'}), /JPG, PNG, or WebP/);
});
test('plain-text platform 413 produces an actionable size message', async () => {
  await assert.rejects(readPhotoUploadResponse(new Response('Request Entity Too Large', {status: 413})), /under 3 MB/);
});
test('non-JSON errors are handled without exposing a JSON parser error', async () => {
  await assert.rejects(readPhotoUploadResponse(new Response('<html>Bad Gateway</html>', {status: 502})), /HTTP 502/);
});
test('upload responses preserve API errors and require a returned photo URL', async () => {
  await assert.rejects(readPhotoUploadResponse(Response.json({error: 'Access denied.'}, {status: 403})), /Access denied/);
  await assert.rejects(readPhotoUploadResponse(Response.json({})), /photo URL/);
  assert.deepEqual(await readPhotoUploadResponse(Response.json({src: '/images/example.jpg'})), {src: '/images/example.jpg'});
});
