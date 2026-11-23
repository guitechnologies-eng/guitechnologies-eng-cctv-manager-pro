// Internal team-only WhatsApp messages. Nothing is sent automatically.
// Use plain-text labels to avoid unsupported emoji placeholders.
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
 assignedTechnician?:string|null
 jobId?:string|null
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

export function serviceShareText(data:ServiceShareData):string{
 const lines=[
  '*GUI TECHNOLOGIES*',
  '*CCTV SERVICE JOB - INTERNAL TEAM*',
  '--------------------------------',
  '*Job Reference:* '+safe(data.jobNumber),
  '*Category:* '+(sectionLabels[data.section||'']||safe(data.section)),
  '*Priority:* '+(priorityLabels[data.priority||'']||safe(data.priority)),
  '*Current Status:* '+(statusLabels[data.status]||safe(data.status)),
  '*Assigned Technician:* '+(data.assignedTechnician?.trim()||'Unassigned'),
  '',
  '*CUSTOMER DETAILS*',
  'Name: '+safe(data.customerName),
  'Phone: '+safe(data.customerPhone),
  'Place: '+safe(data.place),
  '',
  '*SERVICE DETAILS*',
  'Service Type: '+(kindLabels[data.kind||'']||safe(data.kind)),
  'Issue / Request: '+safe(data.reason)
 ]
 if(data.description?.trim())lines.push('Job Description: '+data.description.trim())
 const loggedAt=formatColomboDate(data.createdAt)
 if(loggedAt)lines.push('Recorded: '+loggedAt)
 if(data.previousNote?.trim())lines.push('Original Note: '+data.previousNote.trim())
 if(data.latestNote?.trim()){
  lines.push('','*LATEST PROGRESS UPDATE*',data.latestNote.trim())
  const updateAt=formatColomboDate(data.latestNoteAt)
  if(updateAt)lines.push('Updated: '+updateAt)
 }
 lines.push('',
  '*TEAM FOLLOW-UP*',
  'Please review this request and update its progress in CCTV Manager Pro.'
 )
 if(data.jobId&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.jobId)){
  lines.push('Open Job: https://cctv-manager-pro.vercel.app/jobs/'+data.jobId)
 }
 lines.push('','*INTERNAL STAFF ONLY - NOT FOR CUSTOMERS*')
 return lines.join('\n')
}

/** Concise one-tap internal team summary; recipient chooses the chat and presses Send.
 *  Keep user-controlled fields short so the wa.me URL stays readable on phones. */
const compact=(value:string|null|undefined,max=100):string=>{
 const normalized=value?.replace(/\s+/g,' ').trim()||'Not Provided'
 return normalized.length>max?normalized.slice(0,max-3)+'...':normalized
}

export function shortServiceShareText(data:ServiceShareData):string{
 const lines=[
  '*GUI TECHNOLOGIES | CCTV JOB*',
  'Job: '+compact(data.jobNumber,50),
  'Customer: '+compact(data.customerName,70),
  'Phone: '+compact(data.customerPhone,35),
  'Place: '+compact(data.place,95),
  'Work: '+compact(data.reason,110),
  'Tech: '+compact(data.assignedTechnician||'Unassigned',85),
  'Status: '+(statusLabels[data.status]||compact(data.status,30))
 ]
 if(data.priority==='urgent')lines.push('Priority: URGENT')
 if(data.jobId&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.jobId)){
  lines.push('Job details: https://cctv-manager-pro.vercel.app/jobs/'+data.jobId)
 }
 lines.push('*Internal team only*')
 return lines.join('\n')
}

export function whatsappShareLink(text:string):string{
 // Sinhala and other Unicode user data round-trip safely via URL encoding.
 // The team recipient must be selected by the human in WhatsApp.
 return 'https://wa.me/?text='+encodeURIComponent(text)
}
