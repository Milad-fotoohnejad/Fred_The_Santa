import { bookingsConfigured } from '@/lib/config';
import { bookingSchema } from '@/lib/validation';
import { today } from '@/lib/content';
import { json,sameOrigin } from '@/lib/server';
import { withDiary } from '@/lib/schedule-store';
import { availableSlots } from '@/lib/scheduling';
export async function POST(request:Request){
 if(!bookingsConfigured())return json({error:'Booking requests are not open yet.'},503);
 if(!sameOrigin(request))return json({error:'Please submit from this website.'},403);
 if(Number(request.headers.get('content-length')||0)>12000)return json({error:'Request is too large.'},413);
 let body;try{const raw=await request.text();if(raw.length>12000)return json({error:'Request is too large.'},413);body=JSON.parse(raw);}catch{return json({error:'Invalid request.'},400);}
 const result=bookingSchema.safeParse(body);if(!result.success)return json({error:'Please check all required fields and your contact details.'},400);
 const {consent,website,...data}=result.data;
 if(data.date<today())return json({error:'Please choose today or a future date.'},400);
 const id=crypto.randomUUID();
 try{return await withDiary(async(client,diary)=>{
  if(!availableSlots(data.date,data.duration,diary.schedule,diary.bookings,diary.site.appearances).includes(data.time))return json({error:'That time is no longer available. Please choose another time.'},409);
  await client.query('INSERT INTO bookings(id,name,email,phone,date,time,duration,event_type,location,notes,status,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)',[id,data.name,data.email,data.phone,data.date,data.time,data.duration,data.eventType,data.location,data.notes,'pending',new Date().toISOString()]);
  return json({id,status:'pending'},201);
 });}catch{return json({error:'Your request could not be saved. Please try again.'},503);}
}
