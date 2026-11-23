import test from 'node:test'
import assert from 'node:assert/strict'
import {dashboardPageHref,filterJobByTechnician} from '../lib/dashboard-pagination.ts'
import {normalizeTechnicianSelection,groupJobTechnicians} from '../lib/technician-assignment.ts'

const me='11111111-1111-4111-8111-111111111111'
const another='22222222-2222-4222-8222-222222222222'
const third='33333333-3333-4333-8333-333333333333'

test('form allows zero, one or two different technicians only',()=>{
 assert.deepEqual(normalizeTechnicianSelection('',''),[])
 assert.deepEqual(normalizeTechnicianSelection(me,''),[me])
 assert.deepEqual(normalizeTechnicianSelection(me,another),[me,another])
 assert.deepEqual(normalizeTechnicianSelection('',another),[another])
 assert.throws(()=>normalizeTechnicianSelection(me,me),/different/)
 assert.throws(()=>normalizeTechnicianSelection(me,me.toUpperCase()),/different/)
 assert.throws(()=>normalizeTechnicianSelection('broken',another),/valid/)
 assert.throws(()=>normalizeTechnicianSelection(me,null),/Invalid/)
})

test('each job can have two distinct technician assignments without overwriting',()=>{
 const byJob=groupJobTechnicians([
  {job_id:'one',technician_id:me},
  {job_id:'one',technician_id:another},
  {job_id:'two',technician_id:third},
  {job_id:'one',technician_id:me}
 ])
 assert.deepEqual(byJob.get('one'),[me,another])
 assert.deepEqual(byJob.get('two'),[third])
 assert.equal(byJob.has('three'),false)
})

test('both technicians see their shared job in their own filter',()=>{
 assert.equal(filterJobByTechnician('job',[me,another],'mine',me,true),true)
 assert.equal(filterJobByTechnician('job',[me,another],'mine',another,true),true)
 assert.equal(filterJobByTechnician('job',[me,another],'mine',third,true),false)
 assert.equal(filterJobByTechnician('job',[],'mine',me,true),false)
})

test('technician all-jobs filter still shows the shared queue',()=>{
 assert.equal(filterJobByTechnician('two',[another],'all',me,true),true)
 assert.equal(filterJobByTechnician('three',undefined,'all',me,true),true)
})

test('shop staff can filter jobs by either technician or unassigned status',()=>{
 assert.equal(filterJobByTechnician('one',undefined,'unassigned',me,false),true)
 assert.equal(filterJobByTechnician('two',[], 'unassigned',me,false),true)
 assert.equal(filterJobByTechnician('three',[me,another],'unassigned',me,false),false)
 assert.equal(filterJobByTechnician('four',[me,another],another,me,false),true)
 assert.equal(filterJobByTechnician('five',[me,another],third,me,false),false)
})

test('pagination preserves technician filter and search',()=>{
 const u=new URL(dashboardPageHref(2,{q:'CCTV-20261118-001',status:'pending',tech:another}),'https://example.test')
 assert.equal(u.searchParams.get('tech'),another)
 assert.equal(u.searchParams.get('page'),'2')
 assert.equal(u.searchParams.get('q'),'CCTV-20261118-001')
})
