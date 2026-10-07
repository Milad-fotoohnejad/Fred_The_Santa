export const PLACEHOLDER = '/images/santa-placeholder.webp';
export type Appearance = { id: string; date: string; start: string; end: string; title: string; venue: string; address: string; sample: boolean };
export type Photo = { id: string; src: string; caption: string; category: string };
export type SiteContent = { heroImage: string; photos: Photo[]; appearances: Appearance[] };
export const initialContent: SiteContent = {
  heroImage: PLACEHOLDER,
  photos: ['A little Christmas magic','Stories by the Christmas tree','A moment to remember','The warmest welcome'].map((caption,i)=>({id:`sample-${i}`,src:PLACEHOLDER,caption,category:['Christmas magic','Story time','Christmas magic','Story time'][i]})),
  appearances: [
    {id:'sample-1',date:'2026-12-18',start:'16:00',end:'19:00',title:'Christmas market',venue:'Sample town square',address:'Venue to be confirmed',sample:true},
    {id:'sample-2',date:'2026-12-19',start:'11:00',end:'14:00',title:'Meet & greet with Santa',venue:'Sample community centre',address:'Venue to be confirmed',sample:true},
    {id:'sample-3',date:'2026-12-20',start:'13:00',end:'16:00',title:'Stories with Santa',venue:'Sample holiday village',address:'Venue to be confirmed',sample:true},
  ],
};
export const TIMEZONE = 'America/Vancouver';
export function dateKey(date: Date) { return date.toISOString().slice(0,10); }
export function monday(date: string) { const d=new Date(`${date}T12:00:00Z`);d.setUTCDate(d.getUTCDate()-((d.getUTCDay()+6)%7));return dateKey(d); }
export function shiftDay(date: string,offset:number) { const d=new Date(`${date}T12:00:00Z`);d.setUTCDate(d.getUTCDate()+offset);return dateKey(d); }
export function today() { return new Intl.DateTimeFormat('en-CA',{timeZone:TIMEZONE,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()); }
export function clock(time:string) { const [h,m]=time.split(':').map(Number);return `${h%12||12}:${String(m).padStart(2,'0')} ${h>=12?'pm':'am'}`; }
