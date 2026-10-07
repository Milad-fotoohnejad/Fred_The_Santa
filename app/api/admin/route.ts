import { desc,eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { bookings,content } from '@/db/schema';
import { isAdmin,json,readContent,sameOrigin } from '@/lib/server';
import { contentSchema } from '@/lib/validation';
export async function GET(){if(!await isAdmin())return json({error:'Access denied.'},403);const [requests,site]=await Promise.all([getDb().select().from(bookings).orderBy(desc(bookings.createdAt)),readContent()]);return json({requests,site});}
export async function PUT(request:Request){
 if(!sameOrigin(request)||!await isAdmin())return json({error:'Access denied.'},403);
 const raw=await request.text();if(raw.length>200000)return json({error:'Too much content.'},413);
 let body;try{body=JSON.parse(raw);}catch{return json({error:'Invalid request.'},400);}
 if(body.action==='status'){
 if(typeof body.id!=='string'||!['pending','approved','declined'].includes(body.status))return json({error:'Invalid status.'},400);
 await getDb().update(bookings).set({status:body.status}).where(eq(bookings.id,body.id));return json({ok:true});
 }
 if(body.action==='deleteRequest') {if(typeof body.id!=='string')return json({error:'Invalid request.'},400);await getDb().delete(bookings).where(eq(bookings.id,body.id));return json({ok:true});}
 const parsed=contentSchema.safeParse(body.site);if(!parsed.success)return json({error:parsed.error.issues[0]?.message||'Check the content fields.'},400);
 await getDb().insert(content).values({id:'site',value:JSON.stringify(parsed.data)}).onConflictDoUpdate({target:content.id,set:{value:JSON.stringify(parsed.data)}});return json({ok:true});
}
