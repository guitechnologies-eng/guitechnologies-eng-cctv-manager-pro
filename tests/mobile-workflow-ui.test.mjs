import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {filterMobileJobs} from '../lib/mobile-jobs.ts'
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
const jobs=[
 {jobNumber:'CCTV-100',customerName:'Kasun',title:'Outdoor repair',address:'Nugegoda',status:'in_progress',priority:'urgent',phone:'0771234567'},
 {jobNumber:'CCTV-200',customerName:'නිමල්',title:'Camera installation',address:'Colombo',status:'completed',priority:'normal',phone:'0777777777'}
]
test('mobile search handles case, Sinhala, phone and empty queries without data changes',()=>{
 assert.equal(filterMobileJobs(jobs,'kAsUn').length,1)
 assert.equal(filterMobileJobs(jobs,'NUgEGoDA').length,1)
 assert.equal(filterMobileJobs(jobs,'0777777777').length,1)
 assert.equal(filterMobileJobs(jobs,'නිමල්')[0].jobNumber,'CCTV-200')
 assert.equal(filterMobileJobs(jobs,'  ').length,2)
 assert.equal(filterMobileJobs(jobs,'not found').length,0)
 assert.equal(jobs.length,2)
})
test('All Jobs opens inside technician mobile shell, with read-only unassigned cards',()=>{
 const nav=read('app/technician/TechnicianNavigation.tsx')
 const all=read('app/technician/all/page.tsx')
 const list=read('app/technician/TechnicianJobList.tsx')
 assert.match(nav,/href:'\/technician\/all'/)
 assert.doesNotMatch(nav,/dashboard\?tech=all/)
 assert.match(all,/profile\.role!=='technician'/)
 assert.match(all,/supabase\.from\('job_assignments'\)/)
 assert.match(all,/assignedToMe/)
 assert.match(list,/job\.assignedToMe\?</)
 assert.match(list,/Only assigned technicians can update progress/)
 assert.match(list,/href=\{'\/technician\/jobs\/'\+job\.id\}/)
})
test('My Jobs and All Jobs retain active/closed history with search and refresh',()=>{
 const my=read('app/technician/page.tsx')
 const all=read('app/technician/all/page.tsx')
 const list=read('app/technician/TechnicianJobList.tsx')
 assert.match(my,/const list=showClosed\?closed:work/)
 assert.match(all,/const list=showClosed\?closed:active/)
 assert.match(my,/href="\/technician\?view=closed"/)
 assert.match(all,/href="\/technician\/all\?view=closed"/)
 assert.match(list,/router\.refresh\(\)/)
 assert.match(list,/filterMobileJobs\(jobs,query\)/)
 assert.match(list,/aria-busy=\{refreshing\}/)
})
test('mobile sign-out stays accessible on small phones and update actions remain',()=>{
 const shell=read('app/technician/layout.tsx')
 const button=read('app/components/PendingButton.tsx')
 const progress=read('app/technician/jobs/TechnicianProgressForm.tsx')
 const css=read('app/technician/technician-ui.css')
 assert.match(shell,/ariaLabel="Sign out"/)
 assert.match(button,/aria-label=\{ariaLabel\}/)
 assert.match(progress,/value="complete"/)
 assert.match(progress,/value="start"/)
 assert.match(css,/@media\(max-width:360px\)/)
 assert.match(css,/technician-search-controls/)
 assert.match(read('app/style.css'),/\.login input\{font-size:16px/)
})
