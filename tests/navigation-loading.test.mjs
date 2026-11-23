import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {shouldShowNavigationFeedback} from '../lib/navigation-feedback.ts'

const current='https://cctv-manager-pro.vercel.app/dashboard?status=pending'
test('navigation loader appears for pages and query filters, not same-page anchors',()=>{
 assert.equal(shouldShowNavigationFeedback(current,'/staff'),true)
 assert.equal(shouldShowNavigationFeedback(current,'/technician/jobs/123'),true)
 assert.equal(shouldShowNavigationFeedback(current,'?status=completed'),true)
 assert.equal(shouldShowNavigationFeedback(current,'#service-requests'),false)
 assert.equal(shouldShowNavigationFeedback(current,'/dashboard?status=pending#service-requests'),false)
 assert.equal(shouldShowNavigationFeedback(current,'https://example.com/'),false)
 assert.equal(shouldShowNavigationFeedback(current,'mailto:hello@example.com'),false)
 assert.equal(shouldShowNavigationFeedback('not-valid','/jobs'),false)
})

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
test('navigation indicator is mounted globally with a safe fallback',()=>{
 const layout=read('app/layout.tsx')
 assert.match(layout,/<NavigationFeedback\s*\/>/)
 assert.match(layout,/<Suspense fallback=\{null\}>/)
 const feedback=read('app/components/NavigationFeedback.tsx')
 assert.match(feedback,/shouldShowNavigationFeedback/)
 assert.match(feedback,/Opening page\.\.\./)
 assert.match(feedback,/clearTimeout/)
})

test('busy buttons and loading routes exist for staff, login and job pages',()=>{
 for(const path of ['app/loading.tsx','app/staff/loading.tsx','app/jobs/[id]/loading.tsx']){
  assert.match(read(path),/PageLoading/)
 }
 assert.match(read('app/login/page.tsx'),/Signing in\.\.\./)
 assert.match(read('app/technician/jobs/TechnicianProgressForm.tsx'),/aria-busy=\{pending\}/)
 assert.match(read('app/dashboard/NewJobForm.tsx'),/aria-busy=\{pending\}/)
})
