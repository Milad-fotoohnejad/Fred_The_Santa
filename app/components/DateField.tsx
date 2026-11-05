'use client';
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { dateKey, shiftDay, today } from '@/lib/content';

const weekdays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const monthTitle = new Intl.DateTimeFormat('en-CA', {month:'long', year:'numeric', timeZone:'UTC'});
const fullDate = new Intl.DateTimeFormat('en-CA', {dateStyle:'full', timeZone:'UTC'});
const instant = (key:string) => new Date(key + 'T12:00:00Z');

export default function DateField({label, value, onChange, min, name}:{
  label:string; value:string; onChange:(day:string)=>void; min?:string; name?:string;
}) {
  const id = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [cursor, setCursor] = useState('');
  const first = cursor.slice(0,7) + '-01';
  const month = cursor ? instant(first) : null;
  const count = month ? new Date(Date.UTC(month.getUTCFullYear(),month.getUTCMonth()+1,0)).getUTCDate() : 0;
  useEffect(() => {
    if (cursor && dialog.current?.open) dialog.current.querySelector<HTMLButtonElement>('[data-day="' + cursor + '"]')?.focus();
  }, [cursor]);
  function open() {
    const initial = value || today();
    setCursor(min && initial < min ? min : initial);
    dialog.current?.showModal();
  }
  function move(day:string) { setCursor(min && day < min ? min : day); }
  function moveMonth(offset:number) {
    if (month) move(dateKey(new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth()+offset, 1, 12))));
  }
  function navigate(e:KeyboardEvent<HTMLButtonElement>) {
    const steps:Record<string,number> = {ArrowLeft:-1,ArrowRight:1,ArrowUp:-7,ArrowDown:7};
    if (e.key in steps) {e.preventDefault(); move(shiftDay(cursor,steps[e.key]));}
  }
  return <div className="date-field">
    <label htmlFor={id}>{label}</label>
    <button id={id} ref={trigger} className="date-trigger" type="button" aria-haspopup="dialog" aria-expanded={!!cursor}
      aria-label={label + ': ' + (value || 'Choose a date')} onClick={open}>
      {value || 'Choose a date'}<CalendarDays size={16} aria-hidden="true"/>
    </button>
    {name && <input type="hidden" name={name} value={value}/>}
    <dialog ref={dialog} className="date-dialog" aria-label={label} onClose={()=>{setCursor('');trigger.current?.focus();}}
      onClick={e=>{if(e.target===dialog.current) dialog.current.close();}}>
      {month && <div className="date-panel">
        <div className="date-nav"><button type="button" aria-label="Previous month" disabled={!!min && first<=min} onClick={()=>moveMonth(-1)}><ChevronLeft size={18}/></button>
          <strong aria-live="polite">{monthTitle.format(month)}</strong>
          <button type="button" aria-label="Next month" onClick={()=>moveMonth(1)}><ChevronRight size={18}/></button></div>
        <div className="date-days">{weekdays.map(d=><span aria-hidden="true" key={d}>{d}</span>)}
          {Array.from({length:month.getUTCDay()},(_,i)=><span key={'empty'+i}/>)}
          {Array.from({length:count},(_,i)=>{
            const day=first.slice(0,8)+String(i+1).padStart(2,'0');
            return <button key={day} type="button" data-day={day} disabled={!!min && day<min} tabIndex={day===cursor?0:-1}
              aria-label={fullDate.format(instant(day))} aria-pressed={day===value} onKeyDown={navigate}
              onClick={()=>{onChange(day);dialog.current?.close();}}>{i+1}</button>;
          })}
        </div><button className="date-cancel" type="button" onClick={()=>dialog.current?.close()}>Cancel</button>
      </div>}
    </dialog>
  </div>;
}
