'use server'

import {db} from '../../lib/supabase'
import {revalidatePath} from 'next/cache'
import {redirect} from 'next/navigation'

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

export async function updateJobStatus(form:FormData){
 const {supabase,role}=await actor()
 requireOffice(role)
 const jobId=read(form,'job_id',50)
 const status=read(form,'status',30)
 if(!isUuid(jobId)||!['pending','in_progress','completed','cancelled'].includes(status)){
  throw new Error('Invalid job or status')
 }
 const {data,error}=await supabase.from('jobs').update({status}).eq('id',jobId).select('id').maybeSingle()
 ensureSaved(error)
 if(!data)throw new Error('Job not found or insufficient permissions')
 revalidatePath('/dashboard')
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

export async function addUpdate(form:FormData){
 const {supabase,user}=await actor()
 const job_id=read(form,'job_id',50)
 const note=read(form,'note',1500)
 if(!isUuid(job_id)||!note)throw new Error('Job and note required')
 const {error}=await supabase.from('job_updates').insert({job_id,author_id:user.id,note})
 ensureSaved(error)
 revalidatePath('/dashboard')
}
