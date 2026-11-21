// Pure input validation reused by Technician Server Actions and tests.
export const technicianJobIdPattern=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i

export function validTechnicianAction(value:unknown):value is 'start'|'complete'{
 return value==='start'||value==='complete'
}

export function validTechnicianStayDate(value:string):boolean{
 if(!/^20[2-9][0-9]-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/.test(value))return false
 const date=new Date(value+'T00:00:00Z')
 return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===value
}

/** null = omitted, undefined = invalid, number = LKR amount */
export function parseLodgingExpense(raw:string):number|null|undefined{
 if(raw==='')return null
 if(!/^\d{1,7}(?:\.\d{1,2})?$/.test(raw))return undefined
 const cost=Number(raw)
 return Number.isFinite(cost)&&cost>=0&&cost<=9999999
  ?Number(cost.toFixed(2)):undefined
}
