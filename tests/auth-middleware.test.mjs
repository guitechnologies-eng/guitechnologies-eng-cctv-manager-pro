import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {isProtectedAppPath} from '../lib/protected-routes.ts'

test('all authorized app subroutes are protected without matching lookalike paths',()=>{
 for(const path of ['/dashboard','/dashboard/','/staff','/staff/new',
  '/jobs/785d2fdc-2820-4424-bc12-9ec0886cbb76','/technician',
  '/technician/all','/technician/all?view=closed','/technician/jobs/123']){
  assert.equal(isProtectedAppPath(path),true,path)
 }
 for(const path of ['/login','/','/dashboard-fake','/staffing','/technician-evil','/api/assignment-push']){
  assert.equal(isProtectedAppPath(path),false,path)
 }
})

test('middleware keeps updated refresh cookies when redirecting stale sessions',()=>{
 const source=readFileSync(new URL('../middleware.ts',import.meta.url),'utf8')
 assert.match(source,/auth\.getClaims\(\)/)
 assert.match(source,/cookiesToSet\.forEach/)
 assert.match(source,/response\.cookies\.getAll\(\)\.forEach\(cookie=>login\.cookies\.set\(cookie\)\)/)
 assert.match(source,/headersToSet/)
 assert.match(source,/private, no-store/)
 assert.match(source,/if\(protectedPage&&!authorized\)/)
 assert.doesNotMatch(source,/getSession\(\)/)
})
