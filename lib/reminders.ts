export type ReminderJob={
 id:string
 job_number:string
 title:string
 status:string
 scheduled_at:string|null
 follow_up_at:string|null
 reminder_note?:string|null
}

export type ReminderBucket='overdue'|'today'|'upcoming'|'unscheduled'
export type ReminderKind='visit'|'follow_up'|'none'
export type ReminderItem<T extends ReminderJob>={job:T;bucket:ReminderBucket;kind:ReminderKind;dueAt:string|null}
export type ReminderGroups<T extends ReminderJob>=Record<ReminderBucket,ReminderItem<T>[]>

const SL_TZ='Asia/Colombo'
const partsFormatter=new Intl.DateTimeFormat('en-GB',{
 timeZone:SL_TZ,year:'numeric',month:'2-digit',day:'2-digit',
 hour:'2-digit',minute:'2-digit',hourCycle:'h23'
})
function dateParts(value:Date){
 const parts=partsFormatter.formatToParts(value)
 const part=(name:string)=>parts.find(x=>x.type===name)?.value||'00'
 return {year:part('year'),month:part('month'),day:part('day'),hour:part('hour'),minute:part('minute')}
}
export function colomboInputValue(iso:string|null|undefined):string{
 if(!iso)return ''
 const d=new Date(iso)
 if(!Number.isFinite(d.getTime()))return ''
 const p=dateParts(d)
 return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`
}
export function fromColomboInput(value:string):string|null{
 if(!value)return null
 if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value))throw new Error('Invalid date/time format')
 const year=Number(value.slice(0,4))
 if(year<2000||year>2100)throw new Error('Date is outside supported range')
 const d=new Date(value+':00+05:30')
 if(!Number.isFinite(d.getTime())||colomboInputValue(d.toISOString())!==value){
  throw new Error('Invalid calendar date/time')
 }
 return d.toISOString()
}
export function colomboDateLabel(iso:string|null|undefined):string{
 if(!iso)return 'Not scheduled'
 const d=new Date(iso)
 if(!Number.isFinite(d.getTime()))return 'Invalid date'
 return new Intl.DateTimeFormat('en-GB',{timeZone:SL_TZ,day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',hour12:true}).format(d)+' SL'
}
function colomboDayNumber(d:Date):number{
 const p=dateParts(d)
 return Math.floor(Date.UTC(Number(p.year),Number(p.month)-1,Number(p.day))/86400000)
}
export function getReminderGroups<T extends ReminderJob>(jobs:T[],now=new Date()):ReminderGroups<T>{
 const groups:ReminderGroups<T>={overdue:[],today:[],upcoming:[],unscheduled:[]}
 const dayNow=colomboDayNumber(now)
 for(const job of jobs){
  if(job.status==='completed'||job.status==='cancelled')continue
  const dates:{kind:'visit'|'follow_up';time:number;iso:string}[]=[]
  for(const [kind,iso] of [['visit',job.scheduled_at],['follow_up',job.follow_up_at]] as const){
   if(!iso)continue
   const time=new Date(iso).getTime()
   if(Number.isFinite(time))dates.push({kind,time,iso})
  }
  dates.sort((a,b)=>a.time-b.time)
  let chosen:ReminderItem<T>|null=null
  if(dates.length){
   const priorities:Record<'overdue'|'today'|'upcoming',number>={overdue:0,today:1,upcoming:2}
   for(const d of dates){
    const diff=colomboDayNumber(new Date(d.time))-dayNow
    const bucket=diff<0?'overdue':diff===0?'today':diff<=7?'upcoming':null
    if(!bucket)continue
    if(!chosen||priorities[bucket]<priorities[chosen.bucket as keyof typeof priorities]){
     chosen={job,bucket,kind:d.kind,dueAt:d.iso}
    }
   }
  }else if(job.status==='pending'){
   chosen={job,bucket:'unscheduled',kind:'none',dueAt:null}
  }
  if(chosen)groups[chosen.bucket].push(chosen)
 }
 for(const key of ['overdue','today','upcoming','unscheduled'] as const){
  groups[key].sort((a,b)=>(a.dueAt?new Date(a.dueAt).getTime():0)-(b.dueAt?new Date(b.dueAt).getTime():0))
 }
 return groups
}
