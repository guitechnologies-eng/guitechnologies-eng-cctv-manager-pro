import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
const dash=read('app/dashboard/page.tsx')
const css=read('app/style.css')

test('desktop dashboard keeps original service and admin work areas',()=>{
 for(const id of ['overview','reminder-list','new-job','service-requests']){
  assert.match(dash,new RegExp('id="'+id+'"'))
 }
 assert.match(dash,/className="pc-workspace-grid"/)
 assert.match(dash,/className="desktop-command-bar"/)
 assert.match(dash,/TechnicianAssignmentForm/)
 assert.match(dash,/TeamWhatsAppShare/)
 assert.match(dash,/className="job-progress-form"/)
})

test('job stats open the matching filtered service queue without data changes',()=>{
 for(const href of ['/dashboard#service-requests','/dashboard?status=pending#service-requests',
   '/dashboard?status=in_progress#service-requests','/dashboard?status=completed#service-requests']){
  assert.ok(dash.includes("href:'"+href+"'"),href)
 }
 assert.match(dash,/<Link key=\{stat.label\} href=\{stat.href\}/)
})

test('reminder groups can be expanded and maintain their section anchors',()=>{
 assert.match(dash,/map\(\(\[key,label\]\)=><details key=\{key\}/)
 assert.match(dash,/id=\{'reminder-'\+key\}/)
 assert.match(dash,/<summary>\{label\}/)
 assert.match(dash,/No jobs in this category/)
})

test('desktop job creation and staff management retain their existing actions',()=>{
 const newJob=read('app/dashboard/NewJobForm.tsx')
 const staff=read('app/staff/page.tsx')
 assert.match(newJob,/action=\{submitJob\}/)
 assert.match(newJob,/name="customer_mode"/)
 assert.match(newJob,/pc-form-step/)
 assert.match(staff,/StaffManager\s*\/>/)
 assert.match(staff,/StaffEditor /)
 assert.match(staff,/staff-pc-stats/)
})

test('desktop overrides are responsive and do not override technician job behavior',()=>{
 assert.match(css,/@media\(min-width:1360px\)/)
 assert.match(css,/\.app-frame \.pc-workspace-grid/)
 assert.match(css,/\.app-frame \.job-section \.job/)
 assert.match(css,/@media\(max-width:790px\)/)
 assert.doesNotMatch(dash,/await\s+.*assign_job_technicians/)
})
