'use server'

import {db} from '../../lib/supabase'
import {revalidatePath} from 'next/cache'
import {redirect} from 'next/navigation'
import {fromColomboInput} from '../../lib/reminders'

const read=(form:FormData,key:string,max=500)=>String(form.get(key)||'').trim().slice(0,max)
const isUuid=(value:string)=>/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)

async function actor(){
 const supabase=await db()
 const {data:{user}}=await supabase.auth.getUser()
 if(!user)redirect('/login')
 const {data:profile}=await supabase.from('profiles').select('role,active').eq('id',user.id).single()
 if(!profile?.active)throw new Error('Account inactive')
 return {supabase,user,role:profile.role as string}
}
function requireOffice(role:string){
 if(role!=='admin'&&role!=='office')throw new Error('Not authorized')
}
function ensureSaved(error:unknown){
 if(error)throw new Error('Request could not be saved. Check your permissions and inputs.')
}

export async function addCustomer(form:FormData){
 const {supabase,role}=await actor()
 requireOffice(role)
 const name=read(form,'name',120)
 if(!name)throw new Error('Customer name required')
 const {error}=await supabase.from('customers').insert({
  name,phone:read(form,'phone',40)||null,address:read(form,'address',500)||null
 })
 ensureSaved(error)
 revalidatePath('/dashboard')
}

export async function addJob(form:FormData){
 const {supabase,user,role}=await actor()
 requireOffice(role)
 const title=read(form,'title',180)
 const customer_id=read(form,'customer_id',50)
 const kind=read(form,'kind',30)
 const priority=read(form,'priority',20)
 const request_section=read(form,'request_section',80)
 if(!title||!isUuid(customer_id)||
    !['breakdown','site_visit','installation'].includes(kind)||
    !['low','normal','high','urgent'].includes(priority)||
    !['CCTV NEW INSTALLATION REQUEST','REPAIR & WARRANTY SERVICE','OTHER'].includes(request_section)){
  throw new Error('Invalid job')
 }
 const job_number='CCTV-'+crypto.randomUUID().slice(0,8).toUpperCase()
 const {error}=await supabase.from('jobs').insert({
  job_number,title,customer_id,kind,priority,request_section,
  description:read(form,'description',2000)||null,created_by:user.id
 })
 ensureSaved(error)
 revalidatePath('/dashboard')
}


export type JobCreateState = {
 success:boolean
 message:string
 jobNumber?:string
 customerCreated?:boolean
}

export async function createJobWithCustomer(_state:JobCreateState,form:FormData):Promise<JobCreateState>{
 const {supabase,role}=await actor()
 requireOffice(role)
 const mode=read(form,'customer_mode',20)
 const customer_id=read(form,'customer_id',50)
 const customer_name=read(form,'customer_name',120)
 const customer_phone=read(form,'customer_phone',40)
 const customer_address=read(form,'customer_address',500)
 const title=read(form,'title',180)
 const kind=read(form,'kind',30)
 const priority=read(form,'priority',20)
 const request_section=read(form,'request_section',80)
 const description=read(form,'description',2000)
 const site_address=read(form,'site_address',500)

 if(!['existing','new'].includes(mode)) return {success:false,message:'Select an existing or new customer.'}
 if(mode==='existing'&&!isUuid(customer_id)) return {success:false,message:'Please select a saved customer.'}
 if(mode==='new'&&!customer_name) return {success:false,message:'Enter the new customer name.'}
 if(!title||!['breakdown','site_visit','installation'].includes(kind)||
  !['normal','low','high','urgent'].includes(priority)||
  !['CCTV NEW INSTALLATION REQUEST','REPAIR & WARRANTY SERVICE','OTHER'].includes(request_section)){
  return {success:false,message:'Please complete valid job details.'}
 }

 const {data,error}=await supabase.rpc('create_job_with_customer',{
  p_customer_id:mode==='existing'?customer_id:null,
  p_customer_name:mode==='new'?customer_name:null,
  p_customer_phone:mode==='new'?customer_phone:null,
  p_customer_address:mode==='new'?customer_address:null,
  p_title:title,
  p_kind:kind,
  p_priority:priority,
  p_request_section:request_section,
  p_description:description||null,
  p_site_address:site_address||null
 })
 if(error){
  const isDuplicate=error.message.includes('Customer with this phone already exists')
  const isAmbiguous=error.message.includes('Several customers match')
  const isMissing=error.message.includes('Selected customer not found')
  const message=isDuplicate
   ?'This phone belongs to a saved customer. Search and select that customer instead.'
   :isAmbiguous
   ?'More than one saved customer matches. Please select the correct customer.'
   :isMissing
   ?'Saved customer could not be found. Refresh the list and try again.'
   :'Job was not saved. Please check the details and try again.'
  return {success:false,message}
 }
 revalidatePath('/dashboard')
 return {
  success:true,
  message:data?.customer_created
   ?'New customer and job saved successfully.'
   :'Job saved successfully using an existing customer.',
  jobNumber:data?.job_number||undefined,
  customerCreated:Boolean(data?.customer_created)
 }
}

export async function updateJobDetails(form:FormData){
 const {supabase,role}=await actor()
 requireOffice(role)
 const jobId=read(form,'job_id',50)
 const title=read(form,'title',180)
 const kind=read(form,'kind',30)
 const priority=read(form,'priority',20)
 const request_section=read(form,'request_section',80)
 const description=read(form,'description',2000)
 const site_address=read(form,'site_address',500)
 if(!isUuid(jobId)||!title||
    !['breakdown','site_visit','installation'].includes(kind)||
    !['low','normal','high','urgent'].includes(priority)||
    !['CCTV NEW INSTALLATION REQUEST','REPAIR & WARRANTY SERVICE','OTHER'].includes(request_section)){
  throw new Error('Invalid job details')
 }
 const {data,error}=await supabase.from('jobs')
  .update({title,kind,priority,request_section,description:description||null,site_address:site_address||null})
  .eq('id',jobId).select('id').maybeSingle()
 ensureSaved(error)
 if(!data)throw new Error('Job not found or insufficient permissions')
 revalidatePath('/dashboard')
 revalidatePath('/jobs/'+jobId)
}

export async function updateJobStatus(form:FormData){
 const {supabase,role}=await actor()
 requireOffice(role)
 const jobId=read(form,'job_id',50)
 const status=read(form,'status',30)
 if(!isUuid(jobId)||!['pending','assigned','in_progress','completed','cancelled'].includes(status)){
  throw new Error('Invalid job or status')
 }
 const {data,error}=await supabase.from('jobs').update({status}).eq('id',jobId).select('id').maybeSingle()
 ensureSaved(error)
 if(!data)throw new Error('Job not found or insufficient permissions')
 revalidatePath('/dashboard')
 revalidatePath('/jobs/'+jobId)
}

export async function updateCustomer(form:FormData){
 const {supabase,role}=await actor()
 requireOffice(role)
 const customerId=read(form,'customer_id',50)
 const name=read(form,'name',120)
 const phone=read(form,'phone',40)
 const address=read(form,'address',500)
 if(!isUuid(customerId)||!name)throw new Error('Valid customer and name required')
 const {data,error}=await supabase.from('customers')
  .update({name,phone:phone||null,address:address||null})
  .eq('id',customerId).select('id').maybeSingle()
 ensureSaved(error)
 if(!data)throw new Error('Customer not found or insufficient permissions')
 revalidatePath('/dashboard')
}

export async function updateInternalReminder(form:FormData){
 const {supabase,role}=await actor()
 requireOffice(role)
 const jobId=read(form,'job_id',50)
 if(!isUuid(jobId))throw new Error('Invalid job reference')
 const scheduledInput=read(form,'scheduled_at',16)
 const followUpInput=read(form,'follow_up_at',16)
 const reminderNote=read(form,'reminder_note',501)
 if(reminderNote.length>500)throw new Error('Reminder note is too long')
 let scheduledAt:string|null
 let followUpAt:string|null
 try{
  scheduledAt=fromColomboInput(scheduledInput)
  followUpAt=fromColomboInput(followUpInput)
 }catch{
  throw new Error('Please enter a valid Sri Lanka date and time')
 }
 const {data,error}=await supabase.from('jobs')
  .update({scheduled_at:scheduledAt,follow_up_at:followUpAt,reminder_note:reminderNote||null})
  .eq('id',jobId).select('id').maybeSingle()
 ensureSaved(error)
 if(!data)throw new Error('Job not found or insufficient permissions')
 revalidatePath('/dashboard')
 revalidatePath('/jobs/'+jobId)
}

export async function addUpdate(form:FormData){
 const {supabase,user}=await actor()
 const job_id=read(form,'job_id',50)
 const note=read(form,'note',1500)
 if(!isUuid(job_id)||!note)throw new Error('Job and note required')
 const {error}=await supabase.from('job_updates').insert({job_id,author_id:user.id,note})
 ensureSaved(error)
 revalidatePath('/dashboard')
}
