'use server'
import {db} from '../../lib/supabase'
import {redirect} from 'next/navigation'
export async function signIn(formData:FormData){const email=String(formData.get('email')||'');const password=String(formData.get('password')||'');const supabase=await db();const {error}=await supabase.auth.signInWithPassword({email,password});if(error)redirect('/login?error=credentials');redirect('/dashboard')}
export async function signOut(){const supabase=await db();await supabase.auth.signOut();redirect('/login')}
