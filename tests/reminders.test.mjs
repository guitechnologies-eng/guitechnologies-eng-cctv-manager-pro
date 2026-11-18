import test from 'node:test'
import assert from 'node:assert/strict'
import {getReminderGroups,fromColomboInput,colomboInputValue,colomboDateLabel} from '../lib/reminders.ts'

const now=new Date('2026-11-18T06:00:00Z') // 11:30 AM Sri Lanka
let next=0
const job=(changes={})=>({
 id:String(++next),job_number:'CCTV-TEST-'+next,title:'Test job',
 status:'pending',scheduled_at:null,follow_up_at:null,reminder_note:null,...changes
})

test('Sri Lanka date inputs round-trip without changing the local clock time',()=>{
 assert.equal(fromColomboInput('2026-11-18T10:30'),'2026-11-18T05:00:00.000Z')
 assert.equal(colomboInputValue('2026-11-18T05:00:00.000Z'),'2026-11-18T10:30')
 assert.equal(fromColomboInput(''),null)
 assert.match(colomboDateLabel('2026-11-18T05:00:00.000Z'),/18 Nov 2026/)
})
test('rejects invalid or out-of-range local dates',()=>{
 for(const bad of ['2026-02-30T09:00','2026-11-18T24:00','2026-11-18','not a date','1900-01-01T09:00']){
  assert.throws(()=>fromColomboInput(bad),bad)
 }
})
test('groups overdue, due-today and next-7-days by Sri Lankan calendar day',()=>{
 const overdue=job({scheduled_at:'2026-11-17T23:00:00+05:30'})
 const today=job({scheduled_at:'2026-11-18T18:00:00+05:30'})
 const week=job({follow_up_at:'2026-11-25T08:00:00+05:30'})
 const outside=job({follow_up_at:'2026-11-26T08:00:00+05:30'})
 const r=getReminderGroups([overdue,today,week,outside],now)
 assert.deepEqual(r.overdue.map(x=>x.job.id),[overdue.id])
 assert.deepEqual(r.today.map(x=>x.job.id),[today.id])
 assert.deepEqual(r.upcoming.map(x=>x.job.id),[week.id])
 assert.equal(r.unscheduled.length,0)
 assert.equal(r.upcoming[0].kind,'follow_up')
})
test('pending jobs without dates get a schedule-needed reminder',()=>{
 const pending=job()
 const inProgress=job({status:'in_progress'})
 const r=getReminderGroups([pending,inProgress],now)
 assert.deepEqual(r.unscheduled.map(x=>x.job.id),[pending.id])
})
test('completed and cancelled jobs never produce active reminders',()=>{
 const r=getReminderGroups([
  job({status:'completed',follow_up_at:'2026-11-17T07:00:00+05:30'}),
  job({status:'cancelled',scheduled_at:'2026-11-18T09:00:00+05:30'})
 ],now)
 assert.equal(Object.values(r).flat().length,0)
})
test('the more urgent overdue date wins when visit and follow-up dates coexist',()=>{
 const both=job({scheduled_at:'2026-11-23T09:00:00+05:30',follow_up_at:'2026-11-16T09:00:00+05:30'})
 const r=getReminderGroups([both],now)
 assert.equal(r.overdue.length,1)
 assert.equal(r.overdue[0].kind,'follow_up')
 assert.equal(r.upcoming.length,0)
})
test('a second active reminder is only shown once per job',()=>{
 const both=job({scheduled_at:'2026-11-18T10:00:00+05:30',follow_up_at:'2026-11-18T18:00:00+05:30'})
 const r=getReminderGroups([both],now)
 assert.equal(Object.values(r).flat().length,1)
})
