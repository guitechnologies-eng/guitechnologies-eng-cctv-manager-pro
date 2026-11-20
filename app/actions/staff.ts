'use server'

import {db} from '../../lib/supabase'
import {normalizeLoginUsername} from '../../lib/username-login'
import {revalidatePath} from 'next/cache'

export type StaffCreateState={success:boolean;message:string;username?:string}
const fail=(message:string):StaffCreateState=>({success:false,message})

export async function createStaffAccount(
 _previous:StaffCreateState,
 form:FormData
):Promise<StaffCreateState>{
 const supabase=await db()
 const {data:{user},error:authError}=await supabase.auth.getUser()
 if(authError||!user)return fail('Please sign in as an administrator.')

 const {data:profile}=await supabase.from('profiles')
  .select('role,active').eq('id',user.id).maybeSingle()
 if(!profile?.active||profile.role!=='admin')return fail('Only administrators can add staff accounts.')

 const username=normalizeLoginUsername(form.get('username'))
 const full_name=String(form.get('full_name')||'').trim()
 const role=String(form.get('role')||'')
 const pin=String(form.get('pin')||'')
 const confirm=String(form.get('confirm_pin')||'')

 if(!username)return fail('Username must be 3-32 characters, starting with a letter. Use letters, numbers, dots, hyphens or underscores.')
 if(full_name.length<2||full_name.length>120)return fail('Enter a staff name between 2 and 120 characters.')
 if(role!=='office'&&role!=='admin')return fail('Choose Office Staff or Admin role.')
 if(!/^[0-9]{4,8}$/.test(pin))return fail('PIN must contain 4 to 8 digits only.')
 if(pin!==confirm)return fail('PINs do not match.')

 const {data:{session}}=await supabase.auth.getSession()
 if(!session||session.user.id!==user.id)return fail('Your session has expired. Sign in again.')

 try{
  const {data,error}=await supabase.functions.invoke('admin-create-staff',{
   method:'POST',
   body:{username,full_name,role,pin},
   headers:{Authorization:'Bearer '+session.access_token}
  })
  if(error){
   const context=(error as {context?:unknown}).context
   let details:unknown=null
   if(context&&typeof context==='object'&&'json' in context&&
    typeof (context as {json?:unknown}).json==='function'){
    details=await (context as {json:()=>Promise<unknown>}).json().catch(()=>null)
   }
   const serverMessage=details&&typeof details==='object'&&'message' in details
    ?String((details as {message:unknown}).message):''
   const allowed=['This username is already in use',
    'Only an active administrator can add staff accounts',
    'Enter a valid username, name, role and numeric PIN (4-8 digits).',
    'Staff account could not be saved. Please contact the administrator.']
   return fail(allowed.includes(serverMessage)?serverMessage:'Could not create staff account. Please try again.')
  }
  if(!data||data.username!==username)return fail('Could not confirm staff creation. Please refresh Staff Management.')
  revalidatePath('/staff')
  return {success:true,message:'Staff account created. Share the username and PIN privately.',username}
 }catch{
  return fail('Staff creation service unavailable. Please try again.')
 }
}
