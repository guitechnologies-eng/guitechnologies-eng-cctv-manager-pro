import {createServerClient} from '@supabase/ssr'
import {cookies} from 'next/headers'
export async function db(){const store=await cookies();const url=process.env.NEXT_PUBLIC_SUPABASE_URL;const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;if(!url||!key)throw new Error('Dedicated Supabase project is not configured');return createServerClient(url,key,{cookies:{getAll(){return store.getAll()},setAll(values){try{values.forEach(({name,value,options})=>store.set(name,value,options))}catch{/* Server Components cannot set cookies */}}}})}
