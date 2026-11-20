import test from 'node:test'
import assert from 'node:assert/strict'
import {validateStaffProfileUpdate} from '../supabase/functions/_shared/staff-edit-rules.ts'

test('Admin may update staff full name, Shop Staff/Technician/Admin role and active status',()=>{
 for(const role of ['office','technician','admin']){
  assert.deepEqual(validateStaffProfileUpdate('  Kasun Perera ',role,true),{
   full_name:'Kasun Perera',role,active:true
  })
 }
 assert.equal(validateStaffProfileUpdate('Nimal','technician',false)?.active,false)
})
test('invalid names, unauthorized roles and malformed status fail validation',()=>{
 for(const name of ['', 'x',' '.repeat(10),'a'.repeat(121),null]){
  assert.equal(validateStaffProfileUpdate(name,'office',true),null)
 }
 for(const role of ['superadmin','user','technician;DROP','',null]){
  assert.equal(validateStaffProfileUpdate('Kasun',role,true),null)
 }
 for(const active of ['false',1,null,undefined]){
  assert.equal(validateStaffProfileUpdate('Kasun','technician',active),null)
 }
})
