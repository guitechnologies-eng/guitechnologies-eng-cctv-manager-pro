// CCTV Manager Pro: server-to-server staff PIN authentication.
// Public endpoint has no browser CORS access. Client-side code cannot obtain Vault pepper.
// Restricts guesses for each existing staff username (5 attempts / 30 min).
import {createClient} from 'npm:@supabase/supabase-js@2.57.0'
import {derivePinAuthPassword,normalizeStaffPin,normalizeStaffUsername} from '../_shared/pin-auth.ts'

const replyHeaders={
 'Content-Type':'application/json',
 'Cache-Control':'no-store, no-cache, max-age=0, must-revalidate',
 'X-Content-Type-Options':'nosniff'
}
function reply(status:number,message:string,extra:Record<string,unknown>={}){
 return new Response(JSON.stringify({message,...extra}),{status,headers:replyHeaders})
}

Deno.serve(async(req:Request)=>{
 if(req.method!=='POST')return reply(405,'Method not allowed')
 const url=Deno.env.get('SUPABASE_URL')
 const key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
 if(!url||!key)return reply(503,'Authentication unavailable')

 let parsed:Record<string,unknown>|null=null
 try{
  const raw=await req.text()
  if(raw.length>500)return reply(400,'Invalid credentials')
  const data=JSON.parse(raw)
  if(!data||typeof data!=='object'||Array.isArray(data))return reply(400,'Invalid credentials')
  parsed=data as Record<string,unknown>
 }catch{return reply(400,'Invalid credentials')}

 const username=normalizeStaffUsername(parsed.username)
 const pin=normalizeStaffPin(parsed.pin)
 if(!username||!pin)return reply(401,'Incorrect username or PIN')

 const adminClient=createClient(url,key,{auth:{autoRefreshToken:false,persistSession:false}})
 // All attempted usernames require a server-only database throttle.
 const {data:permitted,error:limitError}=await adminClient.rpc('cctv_staff_pin_attempt',{p_username:username})
 if(limitError)return reply(503,'Authentication unavailable')
 if(permitted!==true)return reply(401,'Incorrect username or PIN')

 const {data:pepper,error:pepperError}=await adminClient.rpc('cctv_staff_pin_pepper')
 if(pepperError||typeof pepper!=='string')return reply(503,'Authentication unavailable')
 let password:string
 try{password=await derivePinAuthPassword(username,pin,pepper)}
 catch{return reply(503,'Authentication unavailable')}

 // Separate Auth client ensures an authenticated staff session never replaces
 // the service-only client used for RLS-protected database queries.
 const userAuth=createClient(url,key,{auth:{autoRefreshToken:false,persistSession:false}})
 const email=username+'@staff.cctv-manager-pro.invalid'
 const {data, error}=await userAuth.auth.signInWithPassword({email,password})
 if(error||!data.session||!data.user)return reply(401,'Incorrect username or PIN')
 const {data:profile,error:profileError}=await adminClient.from('profiles')
  .select('role,active').eq('id',data.user.id).maybeSingle()
 if(profileError||!profile?.active||!['admin','office','technician'].includes(profile.role)){
  return reply(401,'Incorrect username or PIN')
 }
 const {data:alias,error:aliasError}=await adminClient.from('staff_accounts')
  .select('user_id').eq('username',username).maybeSingle()
 if(aliasError||alias?.user_id!==data.user.id)return reply(401,'Incorrect username or PIN')

 await adminClient.rpc('cctv_staff_pin_clear',{p_username:username})
 return reply(200,'Signed in',{
  access_token:data.session.access_token,
  refresh_token:data.session.refresh_token
 })
})
