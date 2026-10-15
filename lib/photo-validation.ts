export const MAX_PHOTO_BYTES = 3 * 1024 * 1024;
export function photoType(bytes: Uint8Array) {
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return { type: 'image/jpeg', extension: 'jpg' };
  if ([137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => bytes[i] === v)) return { type: 'image/png', extension: 'png' };
  if (String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP') return { type: 'image/webp', extension: 'webp' };
  return null;
}
