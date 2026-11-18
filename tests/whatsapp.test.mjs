import test from 'node:test'
import assert from 'node:assert/strict'
import {serviceShareText,whatsappShareLink} from '../lib/whatsapp.ts'

const sample={
 customerName:'D.M.S. DASANAYAKA',
 customerPhone:'0777474161',
 jobNumber:'CCTV-TEST-001',
 place:'Embuldeniya',
 reason:'WiFi & Solar Camera Installation',
 status:'pending',
 kind:'installation',
 priority:'high',
 section:'CCTV NEW INSTALLATION REQUEST',
 jobId:'785d2fdc-2820-4424-bc12-9ec0886cbb76'
}

test('plain-format staff WhatsApp message uses ASCII labels',()=>{
 const message=serviceShareText(sample)
 assert.match(message,/\*GUI TECHNOLOGIES\*/)
 assert.match(message,/\*CCTV SERVICE JOB - INTERNAL TEAM\*/)
 assert.match(message,/\*Job Reference:\* CCTV-TEST-001/)
 assert.match(message,/\*Priority:\* HIGH/)
 assert.match(message,/\*Current Status:\* Pending/)
 assert.match(message,/\*CUSTOMER DETAILS\*/)
 assert.match(message,/\*INTERNAL STAFF ONLY - NOT FOR CUSTOMERS\*/)
 assert.doesNotMatch(message,/[^\x09\x0A\x0D\x20-\x7E]/)
 assert.doesNotMatch(message,/�/)
})

test('team sharing preserves Unicode customer names and sends to no automatic recipient',()=>{
 const message=serviceShareText({...sample,customerName:'පාරිභෝගිකයා',latestNote:'Checked camera'})
 const url=whatsappShareLink(message)
 assert.equal(new URL(url).hostname,'wa.me')
 assert.equal(new URL(url).pathname,'/')
 assert.equal(new URL(url).searchParams.get('text'),message)
 assert.match(message,/පාරිභෝගිකයා/)
 assert.match(message,/Checked camera/)
})

test('unavailable optional values remain readable and invalid job IDs are excluded',()=>{
 const message=serviceShareText({...sample,customerPhone:null,place:'',jobId:'not-a-job-id'})
 assert.match(message,/Phone: Not Provided/)
 assert.match(message,/Place: Not Provided/)
 assert.doesNotMatch(message,/Open Job:/)
})
