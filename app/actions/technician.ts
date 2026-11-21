'use server'

import {db} from '../../lib/supabase'
import {revalidatePath} from 'next/cache'
import {technicianJobIdPattern,validTechnicianAction,validTechnicianStayDate,parseLodgingExpense} from '../../lib/technician-validation'

export type TechnicianActionState={success:boolean;message:string;status?:'in_progress'|'completed'}
export type LodgingActionState={success:boolean;message:string}

async function technicianActor(){
 const supabase=await db()
 const {data:{user},error}=await supabase.auth.getUser()
 if(error||!user)return null
 const {data:profile}=await supabase.from('profiles')
  .select('role,active').eq('id',user.id).maybeSingle()
 if(!profile?.active||profile.role!=='technician')return null
 return {supabase,user}
}

export async function technicianProgress(
 _previous:TechnicianActionState,
 form:FormData
):Promise<TechnicianActionState>{
 const actor=await technicianActor()
 if(!actor)return {success:false,message:'Please sign in with an active Technician account.'}

 const jobId=String(form.get('job_id')||'').trim()
 const action=String(form.get('action')||'')
 const note=String(form.get('note')||'').trim()
 if(!technicianJobIdPattern.test(jobId)||!validTechnicianAction(action)){
  return {success:false,message:'Invalid job or action. Please refresh and try again.'}
 }
 if(note.length>1200)return {success:false,message:'Progress note must be 1200 characters or fewer.'}

 const {data,error}=await actor.supabase.rpc('technician_set_job_progress',{
  p_job_id:jobId,p_action:action,p_note:note||null
 })
 if(error){
  const known=error.message||''
  const message=known.includes('not assigned')?'This job is no longer assigned to you.'
   :known.includes('already closed')?'This job is already closed.'
   :known.includes('Too long')?'Progress note is too long.'
   :'Could not save progress. Check your assignment and try again.'
  return {success:false,message}
 }
 const status=data==='completed'?'completed':'in_progress'
 revalidatePath('/technician')
 revalidatePath('/technician/jobs/'+jobId)
 revalidatePath('/dashboard')
 revalidatePath('/jobs/'+jobId)
 return {success:true,status,
  message:status==='completed'?'Job completed and saved automatically. No Admin approval required.':'Job started. Status is now In Progress.'}
}

export async function saveTechnicianLodging(
 _previous:LodgingActionState,
 form:FormData
):Promise<LodgingActionState>{
 const actor=await technicianActor()
 if(!actor)return {success:false,message:'Only active Technicians may add lodging details.'}
 const stayDate=String(form.get('stay_date')||'').trim()
 const location=String(form.get('location')||'').trim()
 const nights=Number(String(form.get('nights')||''))
 const costRaw=String(form.get('expense_lkr')||'').trim()
 const notes=String(form.get('notes')||'').trim()
 const jobId=String(form.get('job_id')||'').trim()

 if(!validTechnicianStayDate(stayDate))return {success:false,message:'Enter a valid lodging date.'}
 if(location.length<3||location.length>160)
  return {success:false,message:'Enter a lodging place between 3 and 160 characters.'}
 if(!Number.isInteger(nights)||nights<1||nights>30)
  return {success:false,message:'Nights must be between 1 and 30.'}
 if(notes.length>800)return {success:false,message:'Notes must not exceed 800 characters.'}
 if(jobId&&!technicianJobIdPattern.test(jobId))
  return {success:false,message:'Select a valid assigned job.'}
 const expense=parseLodgingExpense(costRaw)
 if(expense===undefined)return {success:false,message:'Enter a valid cost in LKR, or leave it blank.'}
 const {error}=await actor.supabase.from('technician_lodging').insert({
  technician_id:actor.user.id,job_id:jobId||null,
  stay_date:stayDate,location,nights,expense_lkr:expense,notes:notes||null
 })
 if(error)return {success:false,message:'Lodging details were not saved. Check the selected job and try again.'}
 revalidatePath('/technician/lodging')
 return {success:true,message:'Lodging details saved successfully.'}
}
