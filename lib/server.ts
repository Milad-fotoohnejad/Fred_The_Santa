import { env } from 'cloudflare:workers';
import { eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { content } from '@/db/schema';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { initialContent, type SiteContent } from './content';
export async function readContent():Promise<SiteContent> {const rows=await getDb().select().from(content).where(eq(content.id,'site'));return rows[0]?JSON.parse(rows[0].value):initialContent;}
export async function isAdmin() {
 const user=await getChatGPTUser(); if(!user)return false;
 const ids=(env.ADMIN_USER_IDS||'').split(',').map(s=>s.trim()).filter(Boolean);
 // The preview switch is ONLY for an owner-private Site. Disable before changing audience.
 return ids.includes(user.userId)||(env.ALLOW_PRIVATE_PREVIEW_ADMIN==='true');
}
export function sameOrigin(request:Request) {return request.headers.get('origin')===new URL(request.url).origin;}
export function json(data:unknown,status=200) {return Response.json(data,{status,headers:{'Cache-Control':'no-store'}});}
