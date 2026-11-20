'use server'
import {db} from '../../lib/supabase'
import {resolveLoginEmail} from '../../lib/username-login'
import {redirect} from 'next/navigation'

export async function signIn(formData:FormData){
 const username=String(formData.get('username')||'')
 const password=String(formData.get('password')||'')
 if(!username.trim()||!password||password.length>1024)redirect('/login?error=credentials')

 // Read aliases ONLY on the server. No login email is sent to the browser.
 const aliases=process.env.CCTV_LOGIN_ALIASES_JSON
 if(!aliases)redirect('/login?error=service')
 const email=resolveLoginEmail(username,aliases)
 const supabase=await db()

 // Use one generic error whether a username is unknown or password is wrong.
 // Supabase Auth still verifies the existing password and handles rate limits.
 const {error}=await supabase.auth.signInWithPassword({
  email:email||'unknown-user@invalid.example',
  password
 })
 if(!email||error){
  redirect(!email||error?.code==='invalid_credentials'
   ?'/login?error=credentials'
   :'/login?error=service')
 }
 redirect('/dashboard')
}

export async function signOut(){
 const supabase=await db()
 await supabase.auth.signOut()
 redirect('/login')
}
