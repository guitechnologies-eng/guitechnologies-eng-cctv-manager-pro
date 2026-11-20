'use server'
import {db} from '../../lib/supabase'
import {revalidatePath} from 'next/cache'

export type StaffEditState={success:boolean;message:string}
const fail=(message:string):StaffEditState=>({success:false,message})
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

async function adminSession(){
 const supabase=await db()
 const {data:{user}}=await supabase.auth.getUser()
 if(!user)return null
 const {data:profile}=await supabase.from('profiles')
  .select('role,active').eq('id',user.id).maybeSingle()
 if(!profile?.active||profile.role!=='admin')return null
 const {data:{session}}=await supabase.auth.getSession()
 if(!session||session.user.id!==user.id)return null
 return {supabase,token:session.access_token}
}

async function sendStaffEdit(body:Record<string,unknown>):Promise<StaffEditState>{
 const context=await adminSession()
 if(!context)return fail('Only an active administrator can edit staff.')
 try{
  const {data,error}=await context.supabase.functions.invoke('admin-manage-staff',{
   method:'POST',body,headers:{Authorization:'Bearer '+context.token}
  })
  if(error){
   const response=(error as {context?:unknown}).context
   let parsed:unknown=null
   if(response&&typeof response==='object'&&'json' in response&&
    typeof (response as {json?:unknown}).json==='function'){
    parsed=await (response as {json:()=>Promise<unknown>}).json().catch(()=>null)
   }
   const detail=parsed&&typeof parsed==='object'&&'message' in parsed
    ?String((parsed as {message:unknown}).message):''
   const allowed=[
    'Cannot remove the last Admin or your own Admin access',
    'You cannot reset your own PIN here',
    'PIN reset is only available for PIN-based staff accounts',
    'PIN must contain 4 to 8 digits',
    'Staff account not found',
    'Invalid staff name, role or status',
    'Staff editing not permitted'
   ]
   return fail(allowed.includes(detail)?detail:'Staff details could not be saved. Try again.')
  }
  if(!data||typeof data.message!=='string')return fail('Could not confirm the update.')
  revalidatePath('/staff')
  revalidatePath('/dashboard')
  return {success:true,message:data.message}
 }catch{
  return fail('Staff management service unavailable. Try again.')
 }
}

export async function editStaffDetails(_prev:StaffEditState,form:FormData):Promise<StaffEditState>{
 const user_id=String(form.get('user_id')||'')
 const full_name=String(form.get('full_name')||'').trim()
 const role=String(form.get('role')||'')
 const active=String(form.get('active')||'')
 if(!uuid.test(user_id))return fail('Invalid staff user.')
 if(full_name.length<2||full_name.length>120)return fail('Enter a staff name between 2 and 120 characters.')
 if(!['admin','office','technician'].includes(role))return fail('Choose a valid staff role.')
 if(!['true','false'].includes(active))return fail('Choose Active or Inactive.')
 return sendStaffEdit({operation:'update_profile',user_id,full_name,role,active:active==='true'})
}

export async function resetStaffPin(_prev:StaffEditState,form:FormData):Promise<StaffEditState>{
 const user_id=String(form.get('user_id')||'')
 const pin=String(form.get('pin')||'')
 const confirm=String(form.get('confirm_pin')||'')
 if(!uuid.test(user_id))return fail('Invalid staff user.')
 if(!/^[0-9]{4,8}$/.test(pin))return fail('PIN must contain 4 to 8 digits.')
 if(pin!==confirm)return fail('PINs do not match.')
 return sendStaffEdit({operation:'reset_pin',user_id,pin})
}
