import { loadPublicContent, json } from '@/lib/server';
export async function GET() { return json((await loadPublicContent()).site); }
