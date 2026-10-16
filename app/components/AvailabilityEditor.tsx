'use client';
import { useEffect,useState } from 'react';
import { Plus,ChevronLeft,ChevronRight } from 'lucide-react';
import { today,shiftDay,clock,type SiteContent } from '@/lib/content';
import { type Schedule,type DiaryBooking,durationMinutes,timeLabel,minutes } from '@/lib/scheduling';
type Diary={schedule:Schedule;bookings:(DiaryBooking & {name:string;location:string})[];site:SiteContent};
export default function AvailabilityEditor({onDirty}:{onDirty:(dirty:boolean)=>void}) {
 const [diary,setDiary]=useState<Diary|null>(null);const [date,setDate]=useState(today);const [copyDate,setCopyDate]=useState('');
 const [dirty,setDirty]=useState(false);const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [message,setMessage]=useState('');
 async function load(){setBusy(true);setError('');try{const r=await fetch('/api/schedule');const d=await r.json();if(!r.ok)throw new Error(d.error);setDiary(d);setDirty(false);onDirty(false);}catch(e){setError(e instanceof Error?e.message:'Could not load availability.');}finally{setBusy(false);}}
 useEffect(()=>{void load();},[]);
 useEffect(()=>{if(!dirty)return;const warn=(e:BeforeUnloadEvent)=>e.preventDefault();window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[dirty]);
 function update(schedule:Schedule){if(diary)setDiary({...diary,schedule});setDirty(true);onDirty(true);setMessage('');}
 async function save(){if(!diary)return;setBusy(true);setError('');setMessage('');try{const r=await fetch('/api/schedule',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(diary.schedule)});const d=await r.json();if(!r.ok)throw new Error(d.error);setDiary({...diary,schedule:d.schedule});setDirty(false);onDirty(false);setMessage('Availability saved. Customers will see the updated times.');}catch(e){setError(e instanceof Error?e.message:'Could not save availability.');}finally{setBusy(false);}}
 function copy(){if(!diary||!copyDate)return;setError('');const s=diary.schedule;
  if(copyDate===date||[...s.windows,...s.blocks].some(w=>w.date===copyDate)){setError('Choose a different date with no existing availability or blocks.');return;}
  const windows=s.windows.filter(w=>w.date===date).map(w=>({...w,id:crypto.randomUUID(),date:copyDate}));
  const blocks=s.blocks.filter(w=>w.date===date).map(w=>({...w,id:crypto.randomUUID(),date:copyDate}));
  if(!windows.length&&!blocks.length){setError('Add hours or blocked time to this day before copying.');return;}
  update({...s,windows:[...s.windows,...windows],blocks:[...s.blocks,...blocks]});setDate(copyDate);setCopyDate('');
 }
 const commitments=diary?[...diary.bookings.filter(b=>b.date===date&&(b.status==='approved'||b.status==='pending')).map(b=>({id:b.id,start:b.time,end:durationMinutes(b.duration)?timeLabel(minutes(b.time)+durationMinutes(b.duration)):null,title:b.name,detail:b.location,status:b.status==='approved'?'Confirmed visit':'Pending request — time is not reserved'})),...diary.site.appearances.filter(a=>a.date===date&&!a.sample).map(a=>({id:a.id,start:a.start,end:a.end,title:a.title,detail:a.venue,status:'Public appearance'}))].sort((a,b)=>a.start.localeCompare(b.start)):[];
 return <section className="availability-panel" aria-label="Manage availability">
 <p>Open the hours you want to offer, then block travel, breaks, or personal time. Dates without available hours stay closed. All times are Pacific.</p>
 <div className="availability-toolbar"><button className="icon-button" aria-label="Previous day" onClick={()=>setDate(shiftDay(date,-1))}><ChevronLeft size={18}/></button><label>Selected date<input type="date" value={date} required onChange={e=>{if(e.target.value)setDate(e.target.value);}}/></label><button className="icon-button" aria-label="Next day" onClick={()=>setDate(shiftDay(date,1))}><ChevronRight size={18}/></button><button className="button secondary" disabled={busy} onClick={()=>{if(!dirty||confirm('Discard unsaved availability changes and reload?'))void load();}}>Reload schedule</button></div>
 {error?<p className="admin-message admin-error" role="alert">{error}</p>:null}{message?<p className="admin-message" role="status">{message}</p>:null}
 {!diary?<p>{busy?'Loading availability…':'Reload the schedule to try again.'}</p>:<>
 <fieldset disabled={busy} className="schedule-fieldset"><div className="availability-columns">
 <article className="editor-card"><h3>Available hours</h3><p className="quiet-note">A whole visit must fit inside one window. Customers can request starts every 30 minutes from the window’s start.</p>
 {diary.schedule.windows.filter(w=>w.date===date).map(w=><div className="schedule-row" key={w.id}><label>From<input type="time" value={w.start} onChange={e=>update({...diary.schedule,windows:diary.schedule.windows.map(v=>v.id===w.id?{...v,start:e.target.value}:v)})}/></label><label>Until<input type="time" value={w.end} onChange={e=>update({...diary.schedule,windows:diary.schedule.windows.map(v=>v.id===w.id?{...v,end:e.target.value}:v)})}/></label><button className="text-link" aria-label={`Remove available hours ${w.start} to ${w.end}`} onClick={()=>update({...diary.schedule,windows:diary.schedule.windows.filter(v=>v.id!==w.id)})}>Remove</button></div>)}
 {!diary.schedule.windows.some(w=>w.date===date)?<p>No hours open on this date.</p>:null}<button className="button secondary" onClick={()=>update({...diary.schedule,windows:[...diary.schedule.windows,{id:crypto.randomUUID(),date,start:'10:00',end:'17:00'}]})}><Plus size={16}/>Add available hours</button>
 </article>
 <article className="editor-card"><h3>Blocked time</h3><p className="quiet-note">Private notes are visible only to admins. Travel time is yours to set.</p>
 {diary.schedule.blocks.filter(w=>w.date===date).map(w=><div className="schedule-block" key={w.id}><div className="schedule-row"><label>From<input type="time" value={w.start} onChange={e=>update({...diary.schedule,blocks:diary.schedule.blocks.map(v=>v.id===w.id?{...v,start:e.target.value}:v)})}/></label><label>Until<input type="time" value={w.end} onChange={e=>update({...diary.schedule,blocks:diary.schedule.blocks.map(v=>v.id===w.id?{...v,end:e.target.value}:v)})}/></label><button className="text-link" aria-label={`Remove blocked time ${w.start} to ${w.end}`} onClick={()=>update({...diary.schedule,blocks:diary.schedule.blocks.filter(v=>v.id!==w.id)})}>Remove</button></div><label>Private note<input value={w.note} maxLength={160} placeholder="Travel, lunch, personal plans…" onChange={e=>update({...diary.schedule,blocks:diary.schedule.blocks.map(v=>v.id===w.id?{...v,note:e.target.value}:v)})}/></label></div>)}
 {!diary.schedule.blocks.some(w=>w.date===date)?<p>No manual blocks on this date.</p>:null}<button className="button secondary" onClick={()=>update({...diary.schedule,blocks:[...diary.schedule.blocks,{id:crypto.randomUUID(),date,start:'12:00',end:'13:00',note:''}]})}><Plus size={16}/>Block time</button>
 </article></div>
 <div className="editor-card schedule-copy"><label>Copy this day’s hours and blocks to<input type="date" value={copyDate} min={today()} onChange={e=>setCopyDate(e.target.value)}/></label><button className="button secondary" disabled={!copyDate} onClick={copy}>Copy day</button><p className="quiet-note">Bookings and public appearances are not copied. Confirmed visits remain reserved when available hours change.</p></div>
 </fieldset>
 <div className="manage-footer"><p className="quiet-note">{dirty?'You have unsaved availability changes.':'Availability is saved.'}</p><button className="button primary" disabled={busy||!dirty} onClick={()=>void save()}>{busy?'Saving…':'Save availability'}</button></div>
 <article className="editor-card"><h3>Visits & appearances on this day</h3>{commitments.length?commitments.map(c=><div className="schedule-commitment" key={c.id}><strong>{clock(c.start)}{c.end?` – ${clock(c.end)}`:''} · {c.title}</strong><span>{c.status}</span><p>{c.detail}</p></div>):<p>No visits or public appearances on this date.</p>}<p className="quiet-note">Review, reschedule, or cancel visits in Requests. Pending requests do not reserve time. Contact guests directly; automated emails are not enabled.</p></article>
 </>}
 </section>;
}
