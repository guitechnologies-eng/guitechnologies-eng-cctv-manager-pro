/** Two optional, ordered technician slots. The database rechecks authorization and activity. */
export function normalizeTechnicianSelection(first:unknown,second:unknown):string[]{
 const fields=[first,second]
 if(fields.some(v=>typeof v!=='string'))throw new Error('Invalid technician selection')
 const selected=(fields as string[]).map(v=>v.trim()).filter(Boolean)
 const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
 if(selected.some(id=>!uuid.test(id)))throw new Error('Choose a valid Technician')
 if(new Set(selected.map(id=>id.toLowerCase())).size!==selected.length){
  throw new Error('Choose two different Technicians')
 }
 return selected
}

export function groupJobTechnicians(
 assignments:readonly {job_id:string;technician_id:string}[]
):Map<string,string[]>{
 const byJob=new Map<string,string[]>()
 for(const {job_id,technician_id} of assignments){
  const current=byJob.get(job_id)||[]
  if(!current.includes(technician_id))current.push(technician_id)
  byJob.set(job_id,current)
 }
 return byJob
}
