import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {serviceShareText,shortServiceShareText,whatsappShareLink} from '../lib/whatsapp.ts'

const sample={
 customerName:'Kumara Perera',
 customerPhone:'0771234567',
 jobNumber:'CCTV-2026-045',
 place:'Nugegoda',
 reason:'Outdoor CCTV camera service',
 status:'assigned',
 kind:'breakdown',
 priority:'high',
 assignedTechnician:'Kasun, Nimal',
 description:'Long technician instructions that should not appear in the quick message',
 latestNote:'Private internal notes that should not be in the quick message',
 jobId:'785d2fdc-2820-4424-bc12-9ec0886cbb76'
}

test('one tap message is concise but keeps essential service and technician details',()=>{
 const short=shortServiceShareText(sample)
 const full=serviceShareText(sample)
 assert.ok(short.length<full.length)
 assert.match(short,/\*GUI TECHNOLOGIES \| CCTV JOB\*/)
 assert.match(short,/Job: CCTV-2026-045/)
 assert.match(short,/Customer: Kumara Perera/)
 assert.match(short,/Phone: 0771234567/)
 assert.match(short,/Place: Nugegoda/)
 assert.match(short,/Work: Outdoor CCTV camera service/)
 assert.match(short,/Tech: Kasun, Nimal/)
 assert.match(short,/Status: Assigned/)
 assert.match(short,/Job details: https:\/\/cctv-manager-pro\.vercel\.app\/jobs\/785d2fdc/)
 assert.match(short,/\*Internal team only\*/)
 assert.doesNotMatch(short,/Long technician instructions|Private internal notes/)
})

test('one tap opens WhatsApp with text encoded but no preselected customer recipient',()=>{
 const short=shortServiceShareText({...sample,customerName:'සිංහල නම',reason:'කැමරා පරීක්ෂාව'})
 const url=new URL(whatsappShareLink(short))
 assert.equal(url.origin,'https://wa.me')
 assert.equal(url.pathname,'/')
 assert.equal(url.searchParams.get('text'),short)
 assert.match(short,/සිංහල නම/)
 assert.match(short,/කැමරා පරීක්ෂාව/)
})

test('short summary has bounded length even with long customer input',()=>{
 const big='Long value '.repeat(300)
 const short=shortServiceShareText({...sample,customerName:big,place:big,reason:big,assignedTechnician:big,jobId:'invalid'})
 assert.ok(short.length<650,short.length.toString())
 assert.doesNotMatch(short,/Job details:/)
 assert.doesNotMatch(short,/[\r]/)
 assert.match(short,/\.\.\./)
 assert.match(short,/Status: Assigned/)
})

test('the action is a visible shortcut, the editor remains optional, and customer WhatsApp is not automatic',()=>{
 const dash=readFileSync(new URL('../app/dashboard/page.tsx',import.meta.url),'utf8')
 const editor=readFileSync(new URL('../app/dashboard/TeamWhatsAppShare.tsx',import.meta.url),'utf8')
 assert.match(dash,/className="action-link whatsapp-quick-action"/)
 assert.match(dash,/whatsappShareLink\(shortMessage\)/)
 assert.match(dash,/target="_blank" rel="noopener noreferrer"/)
 assert.match(dash,/initialMessage=\{shortMessage\} detailMessage=\{message\}/)
 assert.match(editor,/Edit WhatsApp Message \(optional\)/)
 assert.match(editor,/Full Details/)
 assert.match(editor,/Short Version/)
 assert.match(editor,/Nothing is sent automatically/)
})
