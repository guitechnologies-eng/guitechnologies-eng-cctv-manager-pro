import test from 'node:test'
import assert from 'node:assert/strict'
import {
 technicianJobIdPattern,validTechnicianAction,validTechnicianStayDate,parseLodgingExpense
} from '../lib/technician-validation.ts'

test('technician progress accepts only start and complete actions',()=>{
 assert.equal(validTechnicianAction('start'),true)
 assert.equal(validTechnicianAction('complete'),true)
 for(const value of ['cancel','approve','assigned','pending','',null]){
  assert.equal(validTechnicianAction(value),false)
 }
})

test('service job ID validation rejects user-controlled paths and malformed IDs',()=>{
 assert.equal(technicianJobIdPattern.test('cf1c8a3c-003a-4dae-88d7-c69aed83fd05'),true)
 for(const value of ['../../admin','any','', 'cf1c8a3c-003a-4dae-88d7-c69aed83fd05/extra']){
  assert.equal(technicianJobIdPattern.test(value),false)
 }
})

test('lodging dates accept valid calendar days but reject invalid leap days',()=>{
 assert.equal(validTechnicianStayDate('2026-11-21'),true)
 assert.equal(validTechnicianStayDate('2028-02-29'),true)
 for(const value of ['2026-02-29','2026-13-01','2026-11-31','2026-1-01','1999-12-01','not-date']){
  assert.equal(validTechnicianStayDate(value),false,value)
 }
})

test('lodging expense safely accepts optional LKR values with two decimals',()=>{
 assert.equal(parseLodgingExpense(''),null)
 assert.equal(parseLodgingExpense('0'),0)
 assert.equal(parseLodgingExpense('2450.50'),2450.5)
 assert.equal(parseLodgingExpense('9999999'),9999999)
 for(const value of ['-1','99999999','1.999','Infinity','NaN','1e2','12 abc','999999999999']){
  assert.equal(parseLodgingExpense(value),undefined,value)
 }
})
