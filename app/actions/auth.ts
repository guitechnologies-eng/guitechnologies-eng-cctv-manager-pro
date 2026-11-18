'use server'
import {db} from '../../lib/supabase'
import {redirect} from 'next/navigation'
export async function signIn(formData:FormData){
 const email=String(formData.get('email')||'').trim().toLowerCase()
 const password=String(formData.get('password')||'')
 if(!email||!password)redirect('/login?error=credentials')
 const supabase=await db()
 const {error}=await supabase.auth.signInWithPassword({email,password})
 if(error)redirect(error.code==='invalid_credentials'?'/login?error=credentials':'/login?error=service')
 redirect('/dashboard')
}
export async function signOut(){const supabase=await db();await supabase.auth.signOut();redirect('/login')}
