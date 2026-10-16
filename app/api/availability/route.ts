import { neon } from '@neondatabase/serverless';
import { json } from '@/lib/server';
import { initialContent, type SiteContent } from '@/lib/content';
import { emptySchedule,scheduleSchema,scheduleDate,VISIT_LENGTHS,availableSlots,type DiaryBooking } from '@/lib/scheduling';
export async function GET(request:Request) {
 const url=new URL(request.url);const date=url.searchParams.get('date')||'';const duration=url.searchParams.get('duration')||'';
 if(!scheduleDate.safeParse(date).success||!VISIT_LENGTHS.some(d=>d===duration))return json({error:'Choose a date and visit length.'},400);
 if(!process.env.DATABASE_URL)return json({error:'Availability is temporarily unavailable.'},503);
 try {
  const sql=neon(process.env.DATABASE_URL);
  const [content,bookings]=await sql.transaction([
   sql`SELECT id,value FROM content WHERE id IN ('site','schedule')`,
   sql`SELECT id,date,time,duration,status FROM bookings WHERE date=${date} AND status='approved'`
  ],{isolationLevel:'RepeatableRead',readOnly:true});
  const raw=content.find(r=>r.id==='schedule');const siteRaw=content.find(r=>r.id==='site');
  const schedule=raw?scheduleSchema.parse(JSON.parse(raw.value)):emptySchedule;
  const site:SiteContent=siteRaw?JSON.parse(siteRaw.value):initialContent;
  return json({date,duration,slots:availableSlots(date,duration,schedule,bookings as DiaryBooking[],site.appearances),timeZone:'America/Vancouver'});
 }catch{return json({error:'Availability could not be loaded. Please try again.'},503);}
}
