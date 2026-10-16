import { z } from 'zod';

export const VISIT_LENGTHS = ['30 minutes', '1 hour', '90 minutes', '2 hours'] as const;
export const durationMinutes = (duration: string): number => ({'30 minutes':30,'1 hour':60,'90 minutes':90,'2 hours':120}[duration] || 0);
export const minutes = (time: string) => Number(time.slice(0,2))*60+Number(time.slice(3,5));
export const timeLabel = (value: number) => `${String(Math.floor(value/60)).padStart(2,'0')}:${String(value%60).padStart(2,'0')}`;
export const scheduleDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v=>{const d=new Date(`${v}T12:00:00Z`);return !Number.isNaN(d.getTime())&&d.toISOString().slice(0,10)===v;});
export const scheduleTime = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const intervalSchema = z.object({id:z.string().min(1).max(100),date:scheduleDate,start:scheduleTime,end:scheduleTime}).refine(v=>v.end>v.start,'End time must be after start time.');
const blockSchema = z.object({id:z.string().min(1).max(100),date:scheduleDate,start:scheduleTime,end:scheduleTime,note:z.string().trim().max(160).default('')}).refine(v=>v.end>v.start,'End time must be after start time.');
export const scheduleSchema = z.object({revision:z.string().max(100),windows:z.array(intervalSchema).max(2000),blocks:z.array(blockSchema).max(2000)});
export type Schedule = z.infer<typeof scheduleSchema>;
export type Interval = {id:string;date:string;start:string;end:string};
export type DiaryBooking = {id:string;date:string;time:string;duration:string;status:string};
export type DiaryAppearance = Interval & {sample:boolean};
export const emptySchedule: Schedule = {revision:'initial',windows:[],blocks:[]};
export class ScheduleError extends Error { status=409; }
export const overlaps = (a:Interval,b:Interval) => a.date===b.date&&a.start<b.end&&b.start<a.end;
const formatter = new Intl.DateTimeFormat('en-CA',{timeZone:'America/Vancouver',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
function wallStamp(ms:number) { const p=Object.fromEntries(formatter.formatToParts(ms).map(p=>[p.type,p.value]));return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`; }
// Find the unique real instant for a Vancouver wall-clock time. Missing/repeated
// DST times are not bookable, avoiding an ambiguous confirmation.
export function localInstant(date:string,time:string):number|null {
 const wall=`${date}T${time}`;const nominal=Date.parse(`${wall}:00Z`);if(!Number.isFinite(nominal))return null;
 const offsets=new Set([-86400000,0,86400000].map(delta=>Date.parse(`${wallStamp(nominal+delta)}:00Z`)-(nominal+delta)));
 const matches=[...offsets].map(offset=>nominal-offset).filter(value=>wallStamp(value)===wall);
 return matches.length===1?matches[0]:null;
}
export function visitInterval(booking:DiaryBooking):Interval {
 const length=durationMinutes(booking.duration);const end=minutes(booking.time)+length;
 if(!length||end>=1440)throw new ScheduleError('Choose a fixed visit length that finishes on the same day.');
 return {id:booking.id,date:booking.date,start:booking.time,end:timeLabel(end)};
}
export function busyIntervals(schedule:Schedule,bookings:DiaryBooking[],appearances:DiaryAppearance[]):Interval[] {
 return [...schedule.blocks,...bookings.filter(b=>b.status==='approved').map(visitInterval),...appearances.filter(a=>!a.sample)];
}
export function validateSchedule(schedule:Schedule,bookings:DiaryBooking[],appearances:DiaryAppearance[]) {
 const ids=new Set<string>();
 for(const item of [...schedule.windows,...schedule.blocks]) {
  if(ids.has(item.id))throw new ScheduleError('Each availability entry must have a unique ID.');ids.add(item.id);
  if(localInstant(item.date,item.start)===null||localInstant(item.date,item.end)===null)throw new ScheduleError('Choose unambiguous Pacific times outside the daylight-saving clock change.');
 }
 for(let i=0;i<schedule.windows.length;i++)for(let j=i+1;j<schedule.windows.length;j++)if(overlaps(schedule.windows[i],schedule.windows[j]))throw new ScheduleError('Available windows overlap. Combine them or adjust their times.');
 const busy=busyIntervals(schedule,bookings,appearances);
 for(let i=0;i<busy.length;i++)for(let j=i+1;j<busy.length;j++)if(overlaps(busy[i],busy[j]))throw new ScheduleError(`There is a scheduling conflict on ${busy[i].date}. Adjust the booking, appearance, or blocked time first.`);
}
export function canRequest(date:string,time:string,duration:string,schedule:Schedule,bookings:DiaryBooking[],appearances:DiaryAppearance[],now=Date.now()) {
 let visit:Interval;try{visit=visitInterval({id:'request',date,time,duration,status:'pending'});}catch{return false;}
 const instant=localInstant(date,time);const end=localInstant(date,visit.end);
 if(instant===null||end===null||instant<=now||end-instant!==durationMinutes(duration)*60000)return false;
 if(!schedule.windows.some(w=>w.date===date&&w.start<=time&&visit.end<=w.end))return false;
 try{return !busyIntervals(schedule,bookings.filter(b=>b.date===date),appearances.filter(a=>a.date===date)).some(b=>overlaps(visit,b));}catch{return false;}
}
export function availableSlots(date:string,duration:string,schedule:Schedule,bookings:DiaryBooking[],appearances:DiaryAppearance[],now=Date.now()) {
 const values=new Set<string>();
 for(const window of schedule.windows.filter(w=>w.date===date))for(let t=minutes(window.start);t<minutes(window.end);t+=30){const time=timeLabel(t);if(canRequest(date,time,duration,schedule,bookings,appearances,now))values.add(time);}
 return [...values].sort();
}
