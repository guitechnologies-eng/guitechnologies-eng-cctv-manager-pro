import test from 'node:test'
import assert from 'node:assert/strict'
import {dashboardPageHref,filterJobByTechnician} from '../lib/dashboard-pagination.ts'
const me='11111111-1111-4111-8111-111111111111',another='22222222-2222-4222-8222-222222222222'
test('technician own jobs filter',()=>{assert.equal(filterJobByTechnician('one',me,'mine',me,true),true);assert.equal(filterJobByTechnician('two',another,'mine',me,true),false);assert.equal(filterJobByTechnician('three',undefined,'mine',me,true),false)})
test('technician shared jobs remain available',()=>{assert.equal(filterJobByTechnician('two',another,'all',me,true),true);assert.equal(filterJobByTechnician('three',undefined,'all',me,true),true)})
test('shop staff can find unassigned jobs or search by technician',()=>{assert.equal(filterJobByTechnician('one',undefined,'unassigned',me,false),true);assert.equal(filterJobByTechnician('two',me,'unassigned',me,false),false);assert.equal(filterJobByTechnician('three',another,another,me,false),true);assert.equal(filterJobByTechnician('four',me,another,me,false),false)})
test('pagination preserves technician filter and search',()=>{const u=new URL(dashboardPageHref(2,{q:'CCTV-20261118-001',status:'pending',tech:another}),'https://example.test');assert.equal(u.searchParams.get('tech'),another);assert.equal(u.searchParams.get('page'),'2');assert.equal(u.searchParams.get('q'),'CCTV-20261118-001')})
