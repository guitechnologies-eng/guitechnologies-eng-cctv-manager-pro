import test from 'node:test'
import assert from 'node:assert/strict'
import {normalizeStaffPin,normalizeStaffUsername,derivePinAuthPassword} from '../supabase/functions/_shared/pin-auth.ts'

const pepper='a8'.repeat(32)

test('4 to 8 digit staff PINs accepted including leading zeros',()=>{
 for(const pin of ['1234','0012','482917','12345678'])assert.equal(normalizeStaffPin(pin),pin)
})
test('PIN rejects weak format, letters and out of range length',()=>{
 for(const pin of ['', '123','123456789','12 34','123a','१२३४',null])assert.equal(normalizeStaffPin(pin),null)
})
test('PIN credentials are keyed, deterministic, 64-char Supabase-compatible hashes',async()=>{
 const first=await derivePinAuthPassword('kasun','1234',pepper)
 assert.match(first,/^[a-f0-9]{64}$/)
 assert.equal(first,await derivePinAuthPassword('kasun','1234',pepper))
 assert.notEqual(first,await derivePinAuthPassword('kasun','4321',pepper))
 assert.notEqual(first,await derivePinAuthPassword('nimal','1234',pepper))
 assert.notEqual(first,await derivePinAuthPassword('kasun','1234','b1'.repeat(32)))
 assert.notEqual(first,'1234')
})
test('PIN derivation rejects bad users, values and invalid secrets',async()=>{
 assert.equal(normalizeStaffUsername(' KASUN '),'kasun')
 assert.equal(normalizeStaffUsername('kasun@example.com'),null)
 await assert.rejects(()=>derivePinAuthPassword('kasun','hello',pepper))
 await assert.rejects(()=>derivePinAuthPassword('kasun','1234','short'))
 await assert.rejects(()=>derivePinAuthPassword('bad username','1234',pepper))
})
