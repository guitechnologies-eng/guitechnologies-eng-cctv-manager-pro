import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
const dashboard=read('app/dashboard/page.tsx')
const technician=read('app/technician/page.tsx')

test('desktop dashboard defaults to active and exposes completed cancelled filters',()=>{
 assert.match(dashboard,/parseJobStatusFilter\(params\.status\)/)
 assert.match(dashboard,/matchesJobStatus\(j\.status,statusFilter\)/)
 assert.match(dashboard,/value="active">Active Jobs \(default\)/)
 assert.match(dashboard,/value="all">All Jobs \(including closed\)/)
 assert.match(dashboard,/value="completed">Completed/)
 assert.match(dashboard,/value="cancelled">Cancelled/)
 assert.match(dashboard,/job-status-shortcuts/)
})

test('mobile technician work list hides closed jobs unless history view selected',()=>{
 assert.match(technician,/showClosed=view==='closed'/)
 assert.match(technician,/const closed=ordered\.filter\(job=>isClosedJob\(job\.status\)\)/)
 assert.match(technician,/const list=showClosed\?closed:work/)
 assert.ok(technician.includes('href="/technician?view=closed"'))
 assert.ok(technician.includes('href="/technician"'))
})

test('closed jobs keep separate history and details routes; no data deletion',()=>{
 assert.ok(dashboard.includes("href={'/jobs/'+j.id}"))
 assert.ok(read('app/technician/TechnicianJobList.tsx').includes("href={'/technician/jobs/'+job.id}"))
 assert.doesNotMatch(technician,/\.delete\(/)
 assert.doesNotMatch(dashboard,/\.delete\(/)
})
