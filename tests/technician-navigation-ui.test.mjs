import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const read=(path)=>readFileSync(new URL('../'+path,import.meta.url),'utf8')

test('technician bottom navigation contains My Jobs and All Jobs, not Lodging',()=>{
 const nav=read('app/technician/TechnicianNavigation.tsx')
 assert.match(nav,/label:'My Jobs'/)
 assert.match(nav,/label:'All Jobs'/)
 assert.doesNotMatch(nav,/label:'Lodging'/)
 assert.doesNotMatch(nav,/href:'\/technician\/lodging'/)
 assert.match(read('app/technician/technician-ui.css'),/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/)
})

test('technician pages keep original logo, navigation and job progress actions',()=>{
 const layout=read('app/technician/layout.tsx')
 assert.match(layout,/<BrandLogo\b/)
 assert.match(layout,/<TechnicianNavigation\s*\/>/)
 const progress=read('app/technician/jobs/TechnicianProgressForm.tsx')
 assert.match(progress,/value="start"/)
 assert.match(progress,/value="complete"/)
})
