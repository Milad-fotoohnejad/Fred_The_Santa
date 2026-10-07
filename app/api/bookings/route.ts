import { bookingSchema } from '@/lib/validation';
import { today } from '@/lib/content';
import { json,sameOrigin } from '@/lib/server';
import { getDb } from '@/db';
import { bookings } from '@/db/schema';
export async function POST(request:Request){
 if(!sameOrigin(request))return json({error:'Please submit from this website.'},403);
 if(Number(request.headers.get('content-length')||0)>12000)return json({error:'Request is too large.'},413);
 let body;try{const raw=await request.text();if(raw.length>12000)return json({error:'Request is too large.'},413);body=JSON.parse(raw);}catch{return json({error:'Invalid request.'},400);}
 const result=bookingSchema.safeParse(body);if(!result.success)return json({error:'Please check all required fields and your contact details.'},400);
 const {consent,website,...data}=result.data;
 if(data.date<today())return json({error:'Please choose today or a future date.'},400);
 const id=crypto.randomUUID();
 try{await getDb().insert(bookings).values({...data,id,status:'pending',createdAt:new Date().toISOString()});return json({id,status:'pending'},201);}catch{return json({error:'Your request could not be saved. Please try again.'},503);}
}
