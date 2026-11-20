// Server-side username aliases for Supabase Auth email/password accounts.
// Never expose the JSON mapping via NEXT_PUBLIC_ variables or client components.
const usernamePattern=/^[a-z][a-z0-9._-]{2,31}$/
const emailPattern=/^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function normalizeLoginUsername(input:unknown):string|null{
 if(typeof input!=='string')return null
 const username=input.trim().toLowerCase()
 return usernamePattern.test(username)?username:null
}

export function resolveLoginEmail(input:unknown,config:string|undefined):string|null{
 const username=normalizeLoginUsername(input)
 if(!username||!config||config.length>32000)return null
 let map:unknown
 try{map=JSON.parse(config)}catch{return null}
 if(!map||typeof map!=='object'||Array.isArray(map))return null
 // Exact, case-normalized username only: no lookups on inherited properties.
 if(!Object.hasOwn(map,username))return null
 const value=(map as Record<string,unknown>)[username]
 if(typeof value!=='string')return null
 const email=value.trim().toLowerCase()
 return email.length<=254&&emailPattern.test(email)?email:null
}

/**
 * Supabase Auth uses an internal email identity for admin-created staff.
 * The email is never requested from staff or exposed by the login form.
 * This namespace must match the admin-create-staff Edge Function.
 */
export function staffUsernameEmail(input:unknown):string|null{
 const username=normalizeLoginUsername(input)
 if(!username)return null
 return username+'@staff.cctv-manager-pro.invalid'
}
