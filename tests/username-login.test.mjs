import test from 'node:test'
import assert from 'node:assert/strict'
import {normalizeLoginUsername,resolveLoginEmail} from '../lib/username-login.ts'

const aliases=JSON.stringify({guiadmin:'staff@example.com',office_staff:'office@example.com'})

test('username sign-in supports trimmed and case-insensitive staff usernames',()=>{
 assert.equal(normalizeLoginUsername(' GUIADMIN '),'guiadmin')
 assert.equal(resolveLoginEmail(' GUIADMIN ',aliases),'staff@example.com')
 assert.equal(resolveLoginEmail('office_staff',aliases),'office@example.com')
})

test('invalid and unknown usernames are rejected without exposing any email',()=>{
 for(const username of ['', 'ab','x@y.com','admin staff','../admin','සිංහල','noaccount','constructor','__proto__']){
  assert.equal(resolveLoginEmail(username,aliases),null,username)
 }
})

test('broken, missing or unsafe server mapping cannot produce an email',()=>{
 assert.equal(resolveLoginEmail('guiadmin',undefined),null)
 assert.equal(resolveLoginEmail('guiadmin','{'),null)
 assert.equal(resolveLoginEmail('guiadmin','[]'),null)
 assert.equal(resolveLoginEmail('guiadmin','{"guiadmin":42}'),null)
 assert.equal(resolveLoginEmail('guiadmin','{"guiadmin":"not-an-email"}'),null)
})

test('an alias is resolved only from an explicitly listed server-side account',()=>{
 const mapped=resolveLoginEmail('guiadmin',aliases)
 assert.equal(mapped,'staff@example.com')
 assert.equal(resolveLoginEmail('staff@example.com',aliases),null)
 assert.equal(resolveLoginEmail('admin',aliases),null)
})

test('mapped email normalization does not change username uniqueness rules',()=>{
 assert.equal(resolveLoginEmail('GUIADMIN','{"guiadmin":"  STAFF@EXAMPLE.COM  "}'),'staff@example.com')
 assert.equal(resolveLoginEmail('guiadmin','{"GuiAdmin":"staff@example.com"}'),null)
})

test('new staff usernames map to deterministic internal auth identities',async()=>{
 const {staffUsernameEmail}=await import('../lib/username-login.ts')
 assert.equal(staffUsernameEmail('Kasun'),'kasun@staff.cctv-manager-pro.invalid')
 assert.equal(staffUsernameEmail(' staff.user_1 '),'staff.user_1@staff.cctv-manager-pro.invalid')
 assert.equal(staffUsernameEmail('kasun@example.com'),null)
 assert.equal(staffUsernameEmail(''),null)
 assert.equal(staffUsernameEmail('constructor'),'constructor@staff.cctv-manager-pro.invalid')
})
test('existing guiadmin alias keeps its original email instead of synthetic identity',async()=>{
 const {staffUsernameEmail}=await import('../lib/username-login.ts')
 const config=JSON.stringify({guiadmin:'admin@example.com'})
 assert.equal(resolveLoginEmail('guiadmin',config),'admin@example.com')
 assert.equal(staffUsernameEmail('guiadmin'),'guiadmin@staff.cctv-manager-pro.invalid')
})
