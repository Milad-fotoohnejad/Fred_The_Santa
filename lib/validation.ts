import { z } from 'zod';
export const dateSchema=z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v=>{const d=new Date(`${v}T12:00:00Z`);return !isNaN(d.getTime())&&d.toISOString().slice(0,10)===v;},'Choose a valid date.');
const timeSchema=z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
export const bookingSchema=z.object({
 name:z.string().trim().min(2).max(100),email:z.string().trim().email().max(200),phone:z.string().trim().min(7).max(40),
 date:dateSchema,time:timeSchema,duration:z.enum(['30 minutes','1 hour','90 minutes','2 hours','Let’s discuss']),
 eventType:z.enum(['Home visit','Holiday party','Community event','Photo session']),location:z.string().trim().min(3).max(300),notes:z.string().trim().max(2000).default(''),consent:z.literal(true),website:z.string().max(0).optional(),
});
const imagePath=z.string().refine(value => {
 if (/^\/images\/[a-zA-Z0-9_.-]+$/.test(value)) return true;
 try { const url=new URL(value); return url.protocol==='https:' && /^[a-z0-9-]+\.public\.blob\.vercel-storage\.com$/.test(url.hostname) && !url.username && !url.password && !url.port; } catch { return false; }
}, 'Use a local sample image or a public Vercel Blob image.');
export const contentSchema=z.object({heroImage:imagePath,photos:z.array(z.object({id:z.string().max(100),src:imagePath,caption:z.string().trim().min(1).max(120),category:z.string().trim().min(1).max(50)})).max(40),appearances:z.array(z.object({id:z.string().max(100),date:dateSchema,start:timeSchema,end:timeSchema,title:z.string().trim().min(1).max(100),venue:z.string().trim().min(1).max(100),address:z.string().max(300),sample:z.boolean()}).refine(a=>a.end>a.start,'End time must follow start time.')).max(300)});
