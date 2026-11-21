'use server'
import {db} from '../../lib/supabase'
import {resolveLoginEmail,staffUsernameEmail,normalizeLoginUsername} from '../../lib/username-login'
import {redirect} from 'next/navigation'

async function loginDestination(supabase:Awaited<ReturnType<typeof db>>){
 const {data:{user}}=await supabase.auth.getUser()
 if(!user)return '/login?error=credentials'
 const {data:profile}=await supabase.from('profiles')
  .select('role,active').eq('id',user.id).maybeSingle()
 return profile?.active&&profile.role==='technician'?'/technician':'/dashboard'
}

export async function signIn(formData:FormData){
 const username=normalizeLoginUsername(formData.get('username'))
 const credential=String(formData.get('password')||'')
 if(!username||!credential||credential.length>1024)redirect('/login?error=credentials')

 const supabase=await db()
 // Preserve the original admin's existing password-based login.
 const originalEmail=resolveLoginEmail(username,process.env.CCTV_LOGIN_ALIASES_JSON)
 if(originalEmail){
  const {error}=await supabase.auth.signInWithPassword({email:originalEmail,password:credential})
  if(error)redirect(error.code==='invalid_credentials'?'/login?error=credentials':'/login?error=service')
  redirect(await loginDestination(supabase))
 }
 if(!staffUsernameEmail(username)||!/^[0-9]{4,8}$/.test(credential)){
  redirect('/login?error=credentials')
 }

 // Staff PIN never goes directly to Supabase Auth. It is verified in a
 // dedicated Edge Function with encrypted Vault pepper and 5-attempt throttle.
 try{
  const {data,error}=await supabase.functions.invoke('staff-pin-login',{
   method:'POST',body:{username,pin:credential}
  })
  if(error||!data||typeof data.access_token!=='string'||typeof data.refresh_token!=='string'){
   redirect('/login?error=credentials')
  }
  const {error:sessionError}=await supabase.auth.setSession({
   access_token:data.access_token,refresh_token:data.refresh_token
  })
  if(sessionError)redirect('/login?error=credentials')
 }catch(error){
  // Redirects are intentional control flow; Next.js must rethrow them.
  if(error&&typeof error==='object'&&'digest' in error&&
      String((error as {digest:unknown}).digest).startsWith('NEXT_REDIRECT'))throw error
  redirect('/login?error=credentials')
 }
 redirect(await loginDestination(supabase))
}

export async function signOut(){
 const supabase=await db()
 await supabase.auth.signOut()
 redirect('/login')
}
