import { Pool, type PoolClient } from '@neondatabase/serverless';
import { initialContent, type SiteContent } from './content';
import { contentSchema } from './validation';
import { emptySchedule, scheduleSchema, type Schedule, type DiaryBooking } from './scheduling';

export type StoredBooking=DiaryBooking & {name:string;email:string;phone:string;eventType:string;location:string;notes:string;createdAt:string};
export type Diary={schedule:Schedule;site:SiteContent;bookings:StoredBooking[]};
// Every scheduling mutation (including public appearances and approval) uses the
// same transaction-scoped lock. Reads AFTER acquiring it see the latest commit
// under READ COMMITTED, including a competing admin's approval.
export async function withDiary<T>(run:(client:PoolClient,diary:Diary)=>Promise<T>):Promise<T> {
 if(!process.env.DATABASE_URL)throw new Error('Database unavailable');
 const pool=new Pool({connectionString:process.env.DATABASE_URL,connectionTimeoutMillis:10000,max:1});
 let client:PoolClient|undefined;
 try {
  client=await pool.connect();await client.query('BEGIN ISOLATION LEVEL READ COMMITTED');
  await client.query("SET LOCAL lock_timeout = '8s'");
  await client.query("SET LOCAL statement_timeout = '15s'");
  await client.query('SELECT pg_advisory_xact_lock(68410327)');
  const {rows}=await client.query<{id:string;value:string}>("SELECT id,value FROM content WHERE id IN ('site','schedule')");
  const siteRow=rows.find(r=>r.id==='site');const scheduleRow=rows.find(r=>r.id==='schedule');
  const site=siteRow?contentSchema.parse(JSON.parse(siteRow.value)):initialContent;
  const schedule=scheduleRow?scheduleSchema.parse(JSON.parse(scheduleRow.value)):emptySchedule;
  const bookings=(await client.query<StoredBooking>('SELECT id,name,email,phone,date,time,duration,event_type AS "eventType",location,notes,status,created_at AS "createdAt" FROM bookings ORDER BY date,time')).rows;
  const result=await run(client,{site,schedule,bookings});await client.query('COMMIT');return result;
 } catch(error) { if(client)await client.query('ROLLBACK').catch(()=>{});throw error; }
 finally { client?.release();await pool.end(); }
}
export async function saveContent(client:PoolClient,id:string,value:unknown) {
 await client.query('INSERT INTO content(id,value) VALUES($1,$2) ON CONFLICT(id) DO UPDATE SET value=EXCLUDED.value',[id,JSON.stringify(value)]);
}
