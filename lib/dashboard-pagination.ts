export const JOBS_PER_PAGE=12

export function parseDashboardPage(value:unknown):number{
 if(typeof value!=='string'||!/^[1-9][0-9]{0,4}$/.test(value))return 1
 const page=Number(value)
 return Number.isSafeInteger(page)?page:1
}

export function paginateJobs<T>(items:readonly T[],requested:unknown,pageSize=JOBS_PER_PAGE){
 const perPage=Number.isInteger(pageSize)&&pageSize>0?pageSize:JOBS_PER_PAGE
 const totalPages=Math.max(1,Math.ceil(items.length/perPage))
 const page=Math.min(parseDashboardPage(requested),totalPages)
 const start=(page-1)*perPage
 return {
  page,totalPages,total:items.length,
  from:items.length?start+1:0,
  to:Math.min(start+perPage,items.length),
  items:items.slice(start,start+perPage)
 }
}

export function dashboardPageHref(
 page:number,filters:{q?:string;status?:string;section?:string;tech?:string}
):string{
 const params=new URLSearchParams()
 if(filters.q?.trim())params.set('q',filters.q.trim())
 if(filters.status)params.set('status',filters.status)
 if(filters.section)params.set('section',filters.section)
 if(filters.tech)params.set('tech',filters.tech)
 params.set('page',String(page))
 return '/dashboard?'+params.toString()+'#service-requests'
}

export function reminderJobHref(jobNumber:string):string{
 return '/dashboard?q='+encodeURIComponent(jobNumber)+'#service-requests'
}

/** Shared job queue stays visible while staff can filter by technician ownership. */
export function filterJobByTechnician(
 jobId:string,
 assignedTechnicianId:string|undefined,
 selected:string,
 currentUserId:string,
 isTechnician:boolean
):boolean{
 const filter=selected||(isTechnician?'mine':'all')
 if(filter==='all')return true
 if(filter==='mine')return assignedTechnicianId===currentUserId
 if(filter==='unassigned')return !assignedTechnicianId
 return assignedTechnicianId===filter
}
