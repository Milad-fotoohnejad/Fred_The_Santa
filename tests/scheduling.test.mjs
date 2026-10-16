import test from 'node:test';
import assert from 'node:assert/strict';
import {availableSlots,canRequest,validateSchedule,emptySchedule,localInstant,scheduleSchema,visitInterval} from '../lib/scheduling.ts';
const date='2026-12-20';const now=Date.parse('2026-12-01T12:00:00Z');
const window={id:'w',date,start:'10:00',end:'14:00'};
const schedule={revision:'initial',windows:[window],blocks:[]};
const booking={id:'b',date,time:'11:00',duration:'1 hour',status:'approved'};
const appearance={id:'a',date,start:'13:00',end:'14:00',sample:false};
test('all dates start closed; visit must fit wholly inside an open window',()=>{
 assert.deepEqual(availableSlots(date,'1 hour',emptySchedule,[],[],now),[]);
 assert.deepEqual(availableSlots(date,'2 hours',schedule,[],[],now),['10:00','10:30','11:00','11:30','12:00']);
 assert.equal(canRequest(date,'13:30','1 hour',schedule,[],[],now),false);
 assert.equal(canRequest('2026-12-21','10:00','1 hour',schedule,[],[],now),false);
});
test('confirmed bookings, public appearances and private travel blocks remove slots',()=>{
 const s={...schedule,blocks:[{id:'travel',date,start:'12:00',end:'12:30',note:'Private address'}]};
 assert.deepEqual(availableSlots(date,'30 minutes',s,[booking],[appearance],now),['10:00','10:30','12:30']);
 assert.deepEqual(availableSlots(date,'1 hour',s,[booking],[appearance],now),['10:00']);
});
test('pending, declined, cancelled and sample events do not reserve time',()=>{
 const all=availableSlots(date,'1 hour',schedule,[],[],now);
 for(const status of ['pending','declined','cancelled'])assert.deepEqual(availableSlots(date,'1 hour',schedule,[{...booking,status}],[{...appearance,sample:true}],now),all);
});
test('adjacent commitments are valid; any partial overlap fails',()=>{
 assert.doesNotThrow(()=>validateSchedule({...schedule,blocks:[{id:'t',date,start:'12:00',end:'13:00',note:''}]},[booking],[appearance]));
 assert.throws(()=>validateSchedule({...schedule,blocks:[{id:'t',date,start:'11:59',end:'13:00',note:''}]},[booking],[appearance]),/conflict/);
 assert.throws(()=>validateSchedule(schedule,[booking,{...booking,id:'second',time:'11:30'}],[]),/conflict/);
 assert.throws(()=>validateSchedule(schedule,[booking],[{...appearance,start:'11:30'}]),/conflict/);
});
test('editing available hours cannot cancel or uncover an existing reservation',()=>{
 assert.doesNotThrow(()=>validateSchedule(emptySchedule,[booking],[]));
 assert.deepEqual(availableSlots(date,'30 minutes',emptySchedule,[booking],[],now),[]);
});
test('overlapping windows, invalid dates, reversed intervals, duplicate IDs rejected',()=>{
 assert.throws(()=>validateSchedule({...schedule,windows:[window,{...window,id:'w2',start:'13:00',end:'16:00'}]},[],[]),/overlap/);
 assert.throws(()=>validateSchedule({...schedule,blocks:[{...window,note:''}]},[],[]),/unique/);
 for(const change of [{date:'2026-02-30'},{start:'15:00'},{end:'10:00'},{start:'25:00'}])assert.equal(scheduleSchema.safeParse({...schedule,windows:[{...window,...change}]}).success,false);
});
test('reject elapsed starts, unknown visit lengths, and midnight-crossing visits',()=>{
 assert.equal(canRequest(date,'10:00','1 hour',schedule,[],[],localInstant(date,'10:00')),false);
 assert.equal(canRequest(date,'10:00','Let’s discuss',schedule,[],[],now),false);
 assert.throws(()=>visitInterval({...booking,time:'23:30'}),/same day/);
});
test('Pacific time conversion is independent of server timezone; ambiguous DST is closed',()=>{
 // Historic transition dates exercise the runtime timezone database without
 // assuming future provincial daylight-saving policy.
 assert.equal(new Date(localInstant('2025-12-20','10:00')).toISOString(),'2025-12-20T18:00:00.000Z');
 assert.equal(new Date(localInstant('2025-07-20','10:00')).toISOString(),'2025-07-20T17:00:00.000Z');
 assert.equal(localInstant('2025-03-09','02:30'),null);
 assert.equal(localInstant('2025-11-02','01:30'),null);
});
test('30-minute choices are anchored to Fred’s window, not UTC or browser time',()=>{
 assert.deepEqual(availableSlots(date,'30 minutes',{...schedule,windows:[{...window,start:'10:15',end:'11:15'}]},[],[],now),['10:15','10:45']);
});
