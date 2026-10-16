export const MAX_PHOTO_BYTES = 3 * 1024 * 1024;
export function photoUploadError(file: { size: number; type: string }) {
  if (!file.size) return 'Choose a photo that is not empty.';
  if (file.size > MAX_PHOTO_BYTES) return 'This photo is too large. Export it as a JPG, PNG, or WebP under 3 MB and try again.';
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return 'Use a JPG, PNG, or WebP image.';
  return null;
}
export async function readPhotoUploadResponse(response: Response): Promise<{ src: string }> {
  if (response.status === 413) throw new Error('This photo is too large. Export it as a JPG, PNG, or WebP under 3 MB and try again.');
  let data: unknown;
  try { data = await response.json(); } catch {
    throw new Error(`The upload server returned an unexpected response (HTTP ${response.status}). Refresh the page and try again.`);
  }
  const result = data && typeof data === 'object' ? data as { error?: unknown; src?: unknown } : null;
  if (!response.ok) throw new Error(typeof result?.error === 'string' ? result.error : `Photo upload failed (HTTP ${response.status}). Try again.`);
  if (typeof result?.src !== 'string' || !result.src) throw new Error('The upload did not return a photo URL. Try again.');
  return { src: result.src };
}
export function photoType(bytes: Uint8Array) {
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return { type: 'image/jpeg', extension: 'jpg' };
  if ([137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => bytes[i] === v)) return { type: 'image/png', extension: 'png' };
  if (String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP') return { type: 'image/webp', extension: 'webp' };
  return null;
}
