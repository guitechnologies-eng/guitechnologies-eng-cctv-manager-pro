// @ts-nocheck
// CCTV Manager Pro - admin-only user provisioning.
// This Edge Function is intentionally not a browser credential service.
// JWT verification is performed inside the handler, including active Admin role.
// The Supabase secret/service-role key never leaves the Edge environment.
import {createClient} from 'npm:@supabase/supabase-js@2.57.0'

const STAFF_DOMAIN='staff.cctv-manager-pro.invalid'
const USERNAME=/^[a-z][a-z0-9._-]{2,31}$/
const headers={'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}
function reply(status:number,message:string,extra:Record<string,unknown>={}){
 return new Response(JSON.stringify({message,...extra}),{status,headers})
}
function parseStaffInput(input:unknown){
 if(!input||typeof input!=='object'||Array.isArray(input))return null
 const data=input as Record<string,unknown>
 const username=typeof data.username==='string'?data.username.trim().toLowerCase():''
 const name=typeof data.full_name==='string'?data.full_name.trim():''
 const role=typeof data.role==='string'?data.role:''
 const password=typeof data.password==='string'?data.password:''
 if(!USERNAME.test(username)||name.length<2||name.length>120||
    !['office','admin'].includes(role)||password.length<12||password.length>128||
    !/[A-Z]/.test(password)||!/[a-z]/.test(password)||!/[0-9]/.test(password))return null
 return {username,full_name:name,role,password}
}

Deno.serve(async(req:Request)=>{
 if(req.method!=='POST')return reply(405,'Method not allowed')
 const authMatch=/^Bearer ([A-Za-z0-9._-]+)$/.exec(req.headers.get('authorization')||'')
 if(!authMatch)return reply(401,'Authentication required')
 const url=Deno.env.get('SUPABASE_URL')
 const key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
 if(!url||!key)return reply(503,'Staff management is temporarily unavailable')

 const adminClient=createClient(url,key,{
  auth:{autoRefreshToken:false,persistSession:false}
 })
 const {data:{user},error:authError}=await adminClient.auth.getUser(authMatch[1])
 if(authError||!user)return reply(401,'Authentication required')
 const {data:actor,error:actorError}=await adminClient.from('profiles')
  .select('id,role,active').eq('id',user.id).maybeSingle()
 if(actorError||!actor||actor.active!==true||actor.role!=='admin'){
  return reply(403,'Only an active administrator can add staff accounts')
 }

 let parsed:unknown
 try{
  const content=await req.text()
  if(content.length>3000)return reply(400,'Invalid staff details')
  parsed=JSON.parse(content)
 }catch{
  return reply(400,'Invalid staff details')
 }
 const input=parseStaffInput(parsed)
 if(!input)return reply(400,'Enter a valid username, name, role, and strong password (12+ characters, upper/lower case and a number).')

 const {data:existing,error:lookupError}=await adminClient.from('staff_accounts')
  .select('user_id').eq('username',input.username).maybeSingle()
 if(lookupError)return reply(503,'Could not check staff username')
 if(existing)return reply(409,'This username is already in use')

 const email=input.username+'@'+STAFF_DOMAIN
 const {data:created,error:creationError}=await adminClient.auth.admin.createUser({
  email,password:input.password,email_confirm:true
 })
 if(creationError||!created.user){
  const duplicate=/already|registered|duplicate/i.test(creationError?.message||'')
  return reply(duplicate?409:500,duplicate?'This username is already in use':'Could not create staff account. Please try again.')
 }
 const userId=created.user.id
 const {error:profileError}=await adminClient.from('profiles').insert({
  id:userId,full_name:input.full_name,role:input.role,active:true
 })
 if(profileError){
  await adminClient.auth.admin.deleteUser(userId)
  return reply(500,'Staff account could not be saved. Please contact the administrator.')
 }
 const {error:directoryError}=await adminClient.from('staff_accounts').insert({
  user_id:userId,username:input.username,created_by:user.id
 })
 if(directoryError){
  await adminClient.auth.admin.deleteUser(userId)
  return reply(directoryError.code==='23505'?409:500,
   directoryError.code==='23505'?'This username is already in use':'Staff account could not be saved. Please contact the administrator.')
 }
 return reply(201,'Staff account created successfully.',{
  username:input.username,role:input.role
 })
})
