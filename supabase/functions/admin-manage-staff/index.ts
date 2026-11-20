// CCTV Manager Pro: Admin-only editing of existing staff accounts.
// The Supabase service role is available only in the Edge function environment.
import {createClient} from 'npm:@supabase/supabase-js@2.57.0'
import {derivePinAuthPassword,normalizeStaffPin} from '../_shared/pin-auth.ts'

const uuidRe=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const headers={'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}
const resp=(status:number,message:string)=>new Response(JSON.stringify({message}),{status,headers})

Deno.serve(async(req:Request)=>{
 if(req.method!=='POST')return resp(405,'Method not allowed')
 const m=/^Bearer ([A-Za-z0-9._-]+)$/.exec(req.headers.get('authorization')||'')
 if(!m)return resp(401,'Authentication required')
 const url=Deno.env.get('SUPABASE_URL'),key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
 if(!url||!key)return resp(503,'Staff management unavailable')
 const admin=createClient(url,key,{auth:{autoRefreshToken:false,persistSession:false}})
 const {data:{user},error:authError}=await admin.auth.getUser(m[1])
 if(authError||!user)return resp(401,'Authentication required')
 const {data:actor,error:actorError}=await admin.from('profiles')
  .select('role,active').eq('id',user.id).maybeSingle()
 if(actorError||!actor?.active||actor.role!=='admin')return resp(403,'Only active Admins can edit staff')

 let raw:Record<string,unknown>
 try{
  const t=await req.text()
  if(t.length>2000)return resp(400,'Invalid staff details')
  const body=JSON.parse(t)
  if(!body||typeof body!=='object'||Array.isArray(body))return resp(400,'Invalid staff details')
  raw=body as Record<string,unknown>
 }catch{return resp(400,'Invalid staff details')}

 const targetId=typeof raw.user_id==='string'?raw.user_id:''
 if(!uuidRe.test(targetId))return resp(400,'Invalid staff user')
 const {data:account,error:lookupError}=await admin.from('staff_accounts')
  .select('user_id,username').eq('user_id',targetId).maybeSingle()
 if(lookupError)return resp(503,'Staff lookup unavailable')
 if(!account)return resp(404,'Staff account not found')
 const operation=raw.operation

 if(operation==='update_profile'){
  const name=typeof raw.full_name==='string'?raw.full_name.trim():''
  const role=raw.role
  const active=raw.active
  if(name.length<2||name.length>120||!['admin','office','technician'].includes(String(role))||typeof active!=='boolean'){
   return resp(400,'Invalid staff name, role or status')
  }
  const {error}=await admin.rpc('cctv_admin_edit_staff',{
   p_actor:user.id,p_target:targetId,p_full_name:name,p_role:role,p_active:active
  })
  if(error){
   if(error.message.includes('own admin access')||error.message.includes('last active administrator')){
    return resp(403,'Cannot remove the last Admin or your own Admin access')
   }
   if(error.code==='42501')return resp(403,'Staff editing not permitted')
   if(error.code==='22023')return resp(400,'Invalid staff details')
   return resp(503,'Staff details could not be updated')
  }
  return resp(200,'Staff details updated successfully')
 }

 if(operation==='reset_pin'){
  // Original guiadmin is an email/password login, not a PIN-based staff account.
  if(targetId===user.id)return resp(403,'You cannot reset your own PIN here')
  const pin=normalizeStaffPin(raw.pin)
  if(!pin)return resp(400,'PIN must contain 4 to 8 digits')
  const {data:target,error:getError}=await admin.auth.admin.getUserById(targetId)
  if(getError||!target?.user)return resp(404,'Staff account not found')
  const expectedEmail=account.username+'@staff.cctv-manager-pro.invalid'
  if(target.user.email?.toLowerCase()!==expectedEmail){
   return resp(400,'PIN reset is only available for PIN-based staff accounts')
  }
  const {data:pepper,error:pepperError}=await admin.rpc('cctv_staff_pin_pepper')
  if(pepperError||typeof pepper!=='string')return resp(503,'PIN reset unavailable')
  let password:string
  try{password=await derivePinAuthPassword(account.username,pin,pepper)}
  catch{return resp(400,'PIN invalid')}
  const {error:updateError}=await admin.auth.admin.updateUserById(targetId,{password})
  if(updateError)return resp(503,'PIN reset could not be completed')
  // Reset login-attempt lockout only after successfully updating the credential.
  await admin.rpc('cctv_staff_pin_clear',{p_username:account.username})
  return resp(200,'Staff PIN reset successfully')
 }
 return resp(400,'Unknown staff action')
})
