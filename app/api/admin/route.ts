import { desc } from 'drizzle-orm';
import { z } from 'zod';
import { getDb } from '@/db';
import { bookings } from '@/db/schema';
import { isAdmin, json, readContent, sameOrigin } from '@/lib/server';
import { contentSchema } from '@/lib/validation';
import { withDiary, saveContent } from '@/lib/schedule-store';
import { canRequest, validateSchedule, ScheduleError, scheduleDate, scheduleTime, VISIT_LENGTHS } from '@/lib/scheduling';
export const runtime='nodejs';
export async function GET() {
 if(!await isAdmin())return json({error:'Access denied.'},403);
 if(!process.env.DATABASE_URL)return json({error:'Connect Neon and run the database migration before opening the workshop.'},503);
 try{const [requests,site]=await Promise.all([getDb().select().from(bookings).orderBy(desc(bookings.createdAt)),readContent()]);return json({requests,site});}
 catch{return json({error:'The workshop database is unavailable. Check its connection and migrations.'},503);}
}
const changeSchema=z.object({date:scheduleDate,time:scheduleTime,duration:z.enum(VISIT_LENGTHS)});
export async function PUT(request:Request) {
 if(!sameOrigin(request)||!await isAdmin())return json({error:'Access denied.'},403);
 let body;try{const raw=await request.text();if(raw.length>200000)return json({error:'Too much content.'},413);body=JSON.parse(raw);}catch{return json({error:'Invalid request.'},400);}
 if(!body||typeof body!=='object')return json({error:'Invalid request.'},400);
 try{return await withDiary(async(client,diary)=>{
  if(body.action){
   if(!['status','deleteRequest','reschedule'].includes(body.action)||typeof body.id!=='string')return json({error:'Invalid action.'},400);
   const booking=diary.bookings.find(b=>b.id===body.id);if(!booking)return json({error:'Request not found.'},404);
   const version=JSON.stringify([booking.date,booking.time,booking.duration,booking.status]);
   if(body.version!==version)return json({error:'This request changed in another session. Refresh before trying again.'},409);
   if(body.action==='deleteRequest'){await client.query('DELETE FROM bookings WHERE id=$1',[booking.id]);return json({ok:true});}
   if(body.action==='reschedule'){
    const parsed=changeSchema.safeParse(body);if(!parsed.success)return json({error:'Choose a valid date, time, and fixed visit length.'},400);
    if(booking.status!=='approved'&&booking.status!=='pending')return json({error:'Return this request to pending before rescheduling.'},409);
    const next={...booking,...parsed.data};
    if(!canRequest(next.date,next.time,next.duration,diary.schedule,diary.bookings.filter(b=>b.id!==booking.id),diary.site.appearances))throw new ScheduleError('This visit does not fit the available hours, or overlaps another commitment.');
    await client.query('UPDATE bookings SET date=$1,time=$2,duration=$3 WHERE id=$4',[next.date,next.time,next.duration,next.id]);return json({ok:true});
   }
   if(!['pending','approved','declined','cancelled'].includes(body.status))return json({error:'Invalid status.'},400);
   if(body.status==='approved'&&booking.status!=='approved'&&!canRequest(booking.date,booking.time,booking.duration,diary.schedule,diary.bookings.filter(b=>b.id!==booking.id),diary.site.appearances))throw new ScheduleError('This request is outside available hours, in the past, or overlaps a commitment. Set availability or reschedule it before approving.');
   await client.query('UPDATE bookings SET status=$1 WHERE id=$2',[body.status,booking.id]);return json({ok:true});
  }
  const parsed=contentSchema.safeParse(body.site);if(!parsed.success)return json({error:parsed.error.issues[0]?.message||'Check the content fields.'},400);
  // Even public-appearance edits use the booking lock, so a calendar edit
  // cannot race with an approval and leave Fred double booked.
  if(JSON.stringify(parsed.data.appearances)!==JSON.stringify(diary.site.appearances))validateSchedule(diary.schedule,diary.bookings,parsed.data.appearances);
  await saveContent(client,'site',parsed.data);return json({ok:true});
 });}catch(e){return json({error:e instanceof ScheduleError?e.message:'Changes could not be saved. Please refresh and try again.'},e instanceof ScheduleError?e.status:503);}
}
