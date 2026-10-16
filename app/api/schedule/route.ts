import { isAdmin, sameOrigin, json } from '@/lib/server';
import { withDiary, saveContent } from '@/lib/schedule-store';
import { scheduleSchema, validateSchedule, ScheduleError } from '@/lib/scheduling';
export const runtime='nodejs';
export async function GET() {
 if(!await isAdmin())return json({error:'Access denied.'},403);
 try{return await withDiary(async(_client,diary)=>json(diary));}
 catch{return json({error:'The schedule could not be loaded. Please try again.'},503);}
}
export async function PUT(request:Request) {
 if(!sameOrigin(request)||!await isAdmin())return json({error:'Access denied.'},403);
 let body;try{const raw=await request.text();if(raw.length>500000)return json({error:'Too many schedule entries.'},413);body=JSON.parse(raw);}catch{return json({error:'Invalid request.'},400);}
 const parsed=scheduleSchema.safeParse(body);if(!parsed.success)return json({error:parsed.error.issues[0]?.message||'Check the times.'},400);
 try{return await withDiary(async(client,diary)=>{
  if(parsed.data.revision!==diary.schedule.revision)return json({error:'Another admin changed availability. Reload the schedule before saving.'},409);
  validateSchedule(parsed.data,diary.bookings,diary.site.appearances);
  const schedule={...parsed.data,revision:crypto.randomUUID()};await saveContent(client,'schedule',schedule);return json({schedule});
 });}catch(e){return json({error:e instanceof ScheduleError?e.message:'Availability could not be saved. Please try again.'},e instanceof ScheduleError?e.status:503);}
}
