'use client';
import { useId, useRef } from 'react';
import { BookOpen, ChevronDown, X } from 'lucide-react';

const chapters=[
  {name:'Availability',title:'Open your diary',intro:'Start here: dates without available hours are closed to booking requests.',steps:[
    'Choose a date, then Add available hours. Set the start and end of each window. You can add more than one window in a day.',
    'Use Block time for travel, breaks, or personal plans. Add your own travel buffers before and after visits; they are not calculated automatically. Block notes are private.',
    'Click Save availability to publish the changes. A complete visit must fit inside one window without overlapping a block, approved visit, or public appearance.',
    'Copy day duplicates the selected day’s hours and blocks to a different date with no existing hours or blocks. It does not copy bookings or public appearances. Review the target date, then Save availability.',
    'Use the daily agenda to see approved visits, pending requests, and public appearances. Reload schedule fetches the latest saved diary; it asks before discarding unsaved edits.'
  ]},
  {name:'Requests',title:'From a wish to a confirmed visit',intro:'A pending request does not hold a time. Approval reserves it, but you still need to contact the guest yourself.',steps:[
    'Open Requests and review the guest’s contact details, date, duration, location, and message. Use the refresh button to check for new requests.',
    'Agree on pricing, travel, location, and timing with the guest. Add available hours and any travel blocks before approving.',
    'Click Mark approved and confirm. The system checks for conflicts and removes the reserved time from the public booking choices.',
    'Use Decline when a request will not go ahead. Return to pending reopens review and releases an approved reservation. Cancel visit releases its time while keeping the record. Contact the guest about every decision.',
    'Reschedule / set length lets you change a pending or approved visit’s date, start time, and duration. Save new time applies it immediately; an approved visit keeps its approved status. Contact the guest to agree on the change.',
    'Delete request permanently removes the record and any reservation it held. Use Cancel visit when you want to retain the history.'
  ]},
  {name:'Appearances',title:'Let everyone know where Santa will be',intro:'These are public events where visitors are welcome. Private bookings stay private.',steps:[
    'Click Add appearance and enter the event name, venue, date, start and end times, and address for directions.',
    'Click Save changes to publish the event on the website’s public calendar. Saved public appearances also block private booking requests during that time.',
    'Edit the event and save again when plans change. To take an event down, choose Remove appearance, confirm, and then Save changes.',
    'If a time conflicts with a confirmed visit or another commitment, resolve the conflict before saving. All times are Pacific.'
  ]},
  {name:'Photos',title:'Keep the Christmas memories fresh',intro:'Upload photos you have permission to share. Use JPG, PNG, or WebP files under 3 MB.',steps:[
    'Replace the Main portrait to update the introduction and Meet Fred images.',
    'Use Add gallery photo or Replace photo for gallery pictures. Add a useful caption and category; categories become the public gallery filters.',
    'Use as main portrait selects an existing gallery photo for the main images. Remove from gallery takes a photo out of the gallery.',
    'An upload alone does not publish the photo. Click Save changes after uploads, caption edits, category changes, or removals.'
  ]},
  {name:'Website',title:'What your guests can do',intro:'Use View website to check the public pages after saving.',steps:[
    'Book a visit and Invite Santa over take guests to the request form. Plan this visit also selects the type of visit.',
    'Guests choose a date and duration, then an available start time. Starts are offered every 30 minutes from the start of an available window. They enter contact and location details, agree to the privacy notice, and submit.',
    'A successful submission shows a reference number to save. It is a request, not a confirmed reservation. No payment is collected and automatic emails are not enabled.',
    'The public calendar shows appearances only. Week arrows browse dates; This week returns to the current week. Directions opens a map when an address is supplied.',
    'Gallery categories filter the photos. Selecting a photo opens a larger view; the close button or Escape returns to the gallery. The small i buttons offer tips on hover, focus, or tap.'
  ]},
  {name:'Saving',title:'A few helpful habits',intro:'Keep your changes safe and your guests informed.',steps:[
    'Availability has its own Save availability button. Appearances and Photos share Save changes. Request status changes, rescheduling, and deletion save immediately when successful.',
    'Wait for the saved or success message before leaving. If you see an error, your change may not have saved; read the message and reload the latest data before trying again.',
    'If another admin changed the same content, reload and reapply your edits rather than overwriting their work. Save before switching sections or opening View website.',
    'An empty public calendar does not mean private bookings are available. The request form uses the available hours, blocks, approved bookings, and public appearances together.',
    'Only authorized admin accounts can use the workshop. Ask Milad to add or update admin access.'
  ]}
];
export default function WorkshopGuide({section}:{section:string}){
  const dialog=useRef<HTMLDialogElement>(null),trigger=useRef<HTMLButtonElement>(null);
  const titleId=useId();
  return <>
    <button ref={trigger} type="button" className="button workshop-guide-button" onClick={()=>dialog.current?.showModal()}><BookOpen size={17} aria-hidden="true"/>how to do it!</button>
    <dialog ref={dialog} className="workshop-guide" aria-labelledby={titleId} onClose={()=>trigger.current?.focus()}
      onClick={e=>{if(e.target===e.currentTarget)dialog.current?.close();}}>
      <div className="guide-paper">
        <header className="guide-header"><div><p className="eyebrow">A LITTLE HELP FROM THE WORKSHOP</p><h2 id={titleId}>Your guide to the merry details.</h2><p>Choose a chapter. Follow the steps. Make a little magic.</p></div><button type="button" className="icon-button guide-close" aria-label="Close dashboard guide" onClick={()=>dialog.current?.close()}><X size={20}/></button></header>
        <div className="guide-content"><div className="guide-reminder"><BookOpen size={20} aria-hidden="true"/><p><strong>Pacific time, personal service.</strong> All diary times are Pacific. Automatic emails are not enabled yet, so contact guests directly to confirm, decline, reschedule, or cancel.</p></div>
        {chapters.map((chapter,i)=><details key={chapter.name} className="guide-chapter" open={chapter.name===section}>
          <summary><span className="guide-number">0{i+1}</span><span><small>{chapter.name}</small><strong>{chapter.title}</strong></span><ChevronDown size={18} className="guide-chevron" aria-hidden="true"/></summary>
          <div className="guide-chapter-body"><p>{chapter.intro}</p><ol>{chapter.steps.map(step=><li key={step}>{step}</li>)}</ol></div>
        </details>)}
        <p className="guide-end">Read at your own pace. Opening this guide does not change your work.</p></div>
      </div>
    </dialog>
  </>;
}
