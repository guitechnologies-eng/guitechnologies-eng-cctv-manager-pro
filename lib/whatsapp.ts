// Internal team-only WhatsApp messages. Nothing is sent automatically.
// Common Unicode emoji (code-point escapes) are encoded using encodeURIComponent.
export type ServiceShareData={
 customerName:string
 customerPhone?:string|null
 jobNumber:string
 place:string
 reason:string
 status:string
 kind?:string|null
 priority?:string|null
 section?:string|null
 description?:string|null
 previousNote?:string|null
 createdAt?:string|null
 latestNote?:string|null
 latestNoteAt?:string|null
 jobId?:string|null
}
export type WhatsAppMessageStyle='emoji'|'plain'

// Simple, widely supported emoji. Unicode escapes keep the source portable.
const emoji={
 heading:'\u{1F4F9}', // video camera
 reference:'\u{1F4CB}',
 category:'\u{1F4C1}',
 priority:'\u{1F6A8}',
 status:'\u{1F4CC}',
 customer:'\u{1F464}',
 phone:'\u{1F4DE}',
 place:'\u{1F4CD}',
 service:'\u{1F527}',
 note:'\u{1F4DD}',
 time:'\u{1F4C5}',
 action:'\u{2705}',
 link:'\u{1F517}',
 private:'\u{1F512}'
}
const statusLabels:Record<string,string>={
 pending:'Pending',assigned:'Assigned',in_progress:'In Progress',
 completed:'Completed',cancelled:'Cancelled'
}
const priorityLabels:Record<string,string>={
 low:'Low',normal:'Normal',high:'HIGH',urgent:'URGENT'
}
const kindLabels:Record<string,string>={
 breakdown:'Repair / Breakdown',site_visit:'Site Visit',installation:'New Installation'
}
const sectionLabels:Record<string,string>={
 'CCTV NEW INSTALLATION REQUEST':'New Installation Request',
 'REPAIR & WARRANTY SERVICE':'Repair & Warranty Service','OTHER':'Other'
}
function formatColomboDate(iso?:string|null):string|null{
 if(!iso)return null
 const d=new Date(iso)
 if(Number.isNaN(d.getTime()))return null
 return new Intl.DateTimeFormat('en-GB',{
  timeZone:'Asia/Colombo',day:'2-digit',month:'short',year:'numeric',
  hour:'2-digit',minute:'2-digit',hour12:true
 }).format(d)+' (SL)'
}
const safe=(v:string|null|undefined)=>v?.trim()||'Not Provided'

export function serviceShareText(data:ServiceShareData,style:WhatsAppMessageStyle='emoji'):string{
 const icon=(key:keyof typeof emoji)=>style==='emoji'?emoji[key]+' ':''
 const lines=[
  icon('heading')+'*GUI TECHNOLOGIES*',
  '*CCTV SERVICE JOB - INTERNAL TEAM*',
  '--------------------------------',
  icon('reference')+'*Job Reference:* '+safe(data.jobNumber),
  icon('category')+'*Category:* '+(sectionLabels[data.section||'']||safe(data.section)),
  icon('priority')+'*Priority:* '+(priorityLabels[data.priority||'']||safe(data.priority)),
  icon('status')+'*Current Status:* '+(statusLabels[data.status]||safe(data.status)),
  '',
  icon('customer')+'*CUSTOMER DETAILS*',
  'Name: '+safe(data.customerName),
  icon('phone')+'Phone: '+safe(data.customerPhone),
  icon('place')+'Place: '+safe(data.place),
  '',
  icon('service')+'*SERVICE DETAILS*',
  'Service Type: '+(kindLabels[data.kind||'']||safe(data.kind)),
  'Issue / Request: '+safe(data.reason)
 ]
 if(data.description?.trim())lines.push('Job Description: '+data.description.trim())
 const loggedAt=formatColomboDate(data.createdAt)
 if(loggedAt)lines.push(icon('time')+'Recorded: '+loggedAt)
 if(data.previousNote?.trim())lines.push(icon('note')+'Original Note: '+data.previousNote.trim())
 if(data.latestNote?.trim()){
  lines.push('',icon('note')+'*LATEST PROGRESS UPDATE*',data.latestNote.trim())
  const updateAt=formatColomboDate(data.latestNoteAt)
  if(updateAt)lines.push('Updated: '+updateAt)
 }
 lines.push('',
  icon('action')+'*TEAM FOLLOW-UP*',
  'Please review this request and update its progress in CCTV Manager Pro.'
 )
 if(data.jobId&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.jobId)){
  lines.push(icon('link')+'Open Job: https://cctv-manager-pro.vercel.app/jobs/'+data.jobId)
 }
 lines.push('',icon('private')+'*INTERNAL STAFF ONLY - NOT FOR CUSTOMERS*')
 return lines.join('\n')
}

export function whatsappShareLink(text:string):string{
 // Emoji + Sinhala text round-trip safely as UTF-8 URL encoding.
 // The team recipient must be selected by the human in WhatsApp.
 return 'https://wa.me/?text='+encodeURIComponent(text)
}
