// Dedicated CCTV Manager Pro PIN authentication helper.
// A 4-8 digit PIN is NEVER used as a Supabase Auth password by itself.
// An Edge-only pepper from the dedicated project's encrypted Supabase Vault
// derives the real high-entropy Auth password. Never expose the pepper/client credentials.
export const PIN_PATTERN=/^[0-9]{4,8}$/
export function normalizeStaffPin(value:unknown):string|null{
 if(typeof value!=='string')return null
 return PIN_PATTERN.test(value)?value:null
}
export function normalizeStaffUsername(value:unknown):string|null{
 if(typeof value!=='string')return null
 const name=value.trim().toLowerCase()
 return /^[a-z][a-z0-9._-]{2,31}$/.test(name)?name:null
}
export async function derivePinAuthPassword(username:string,pin:string,pepperHex:string):Promise<string>{
 if(!normalizeStaffUsername(username)||!normalizeStaffPin(pin))throw new Error('Invalid PIN credential')
 if(!/^[a-f0-9]{64}$/i.test(pepperHex))throw new Error('Invalid server credential configuration')
 const keyBytes=Uint8Array.from(pepperHex.match(/.{2}/g)!,x=>parseInt(x,16))
 const key=await crypto.subtle.importKey('raw',keyBytes,{name:'HMAC',hash:'SHA-256'},false,['sign'])
 const data=new TextEncoder().encode('CCTV-MANAGER-PIN-V1|'+username.toLowerCase()+'|'+pin)
 const hash=await crypto.subtle.sign('HMAC',key,data)
 return Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('')
}
