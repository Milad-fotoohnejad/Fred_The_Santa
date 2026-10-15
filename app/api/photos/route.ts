import { put } from '@vercel/blob';
import { isAdmin, json, sameOrigin } from '@/lib/server';
import { blobConfigured } from '@/lib/config';
import { MAX_PHOTO_BYTES, photoType } from '@/lib/photo-validation';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  if (!sameOrigin(request) || !await isAdmin()) return json({ error: 'Access denied.' }, 403);
  if (!blobConfigured()) return json({ error: 'Connect a public Vercel Blob store to upload photos.' }, 503);
  if (Number(request.headers.get('content-length') || 0) > MAX_PHOTO_BYTES + 65536) return json({ error: 'Choose an image under 3 MB.' }, 413);
  let form: FormData;
  try { form = await request.formData(); } catch { return json({ error: 'Invalid upload.' }, 400); }
  const file = form.get('photo');
  if (!(file instanceof File) || !file.size || file.size > MAX_PHOTO_BYTES) return json({ error: 'Choose an image under 3 MB.' }, 400);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const detected = photoType(bytes);
  if (!detected) return json({ error: 'Use a JPG, PNG, or WebP image.' }, 400);
  try {
    const blob = await put(`santa/${crypto.randomUUID()}.${detected.extension}`, Buffer.from(bytes), { access: 'public', contentType: detected.type, addRandomSuffix: true });
    return json({ src: blob.url });
  } catch { return json({ error: 'Photo upload failed. Check the Blob store connection.' }, 503); }
}
