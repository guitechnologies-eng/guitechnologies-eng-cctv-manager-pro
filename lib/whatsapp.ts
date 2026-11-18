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

export function whatsappShareLink(text:string):string{
 // Sinhala and other Unicode user data round-trip safely via URL encoding.
 // The team recipient must be selected by the human in WhatsApp.
 return 'https://wa.me/?text='+encodeURIComponent(text)
}
