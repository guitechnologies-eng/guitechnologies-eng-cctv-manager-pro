import test from 'node:test'
import assert from 'node:assert/strict'
import {paginateJobs,parseDashboardPage,dashboardPageHref,reminderJobHref,JOBS_PER_PAGE} from '../lib/dashboard-pagination.ts'

const jobs=Array.from({length:17},(_,i)=>({job_number:'CCTV-'+String(i+1),id:i+1}))

test('dashboard renders only 12 of 17 jobs on first page',()=>{
 const result=paginateJobs(jobs,undefined)
 assert.equal(JOBS_PER_PAGE,12)
 assert.equal(result.page,1)
 assert.equal(result.totalPages,2)
 assert.equal(result.from,1)
 assert.equal(result.to,12)
 assert.equal(result.items.length,12)
 assert.equal(result.items[0].id,1)
})

test('next page contains remaining jobs without duplicates or missing data',()=>{
 const first=paginateJobs(jobs,'1')
 const second=paginateJobs(jobs,'2')
 assert.deepEqual([...first.items,...second.items],jobs)
 assert.equal(second.items.length,5)
 assert.deepEqual([second.from,second.to],[13,17])
})

test('requested page is safely clamped and invalid query falls back to page one',()=>{
 for(const bad of ['0','-1','abc','1.3','0001','999999999999',null,undefined]){
  assert.equal(parseDashboardPage(bad),1,String(bad))
 }
 assert.equal(paginateJobs(jobs,'99999').page,2)
 assert.equal(paginateJobs([],999).page,1)
 assert.deepEqual([paginateJobs([],2).from,paginateJobs([],2).to],[0,0])
})

test('pagination links preserve search/status/section filter values',()=>{
 const href=dashboardPageHref(2,{
  q:'Kasun / Camera',status:'pending',section:'REPAIR & WARRANTY SERVICE'
 })
 const u=new URL(href,'https://example.test')
 assert.equal(u.pathname,'/dashboard')
 assert.equal(u.searchParams.get('q'),'Kasun / Camera')
 assert.equal(u.searchParams.get('status'),'pending')
 assert.equal(u.searchParams.get('section'),'REPAIR & WARRANTY SERVICE')
 assert.equal(u.searchParams.get('page'),'2')
 assert.equal(u.hash,'#service-requests')
})

test('reminder links target the correct job through unique job reference search',()=>{
 const href=reminderJobHref('CCTV-IMPORT-20261118-01')
 assert.equal(new URL(href,'https://example.test').searchParams.get('q'),'CCTV-IMPORT-20261118-01')
})
