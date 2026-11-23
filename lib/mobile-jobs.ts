/** Pure mobile search. Never changes server data or assignment permissions. */
export type MobileSearchJob={jobNumber:string;customerName:string;title:string;address:string;status:string;priority:string;phone?:string|null}
export function filterMobileJobs<T extends MobileSearchJob>(jobs:readonly T[],search:string):T[]{
 const term=search.trim().toLocaleLowerCase()
 return !term?[...jobs]:jobs.filter(job=>[
  job.jobNumber,job.customerName,job.title,job.address,
  job.status.replaceAll('_',' '),job.priority,job.phone||''
 ].some(value=>value.toLocaleLowerCase().includes(term)))
}
