import {createServerClient} from '@supabase/ssr'
import {NextResponse,type NextRequest} from 'next/server'
import {isProtectedAppPath} from './lib/protected-routes'

/**
 * Next.js 15: middleware refreshes Supabase cookies before Server Components
 * read them. Never drop Set-Cookie updates when redirecting stale sessions.
 */
export async function middleware(request:NextRequest){
 let response=NextResponse.next({request})
 const protectedPage=isProtectedAppPath(request.nextUrl.pathname)
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL
 const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
 if(!url||!key){
  if(protectedPage){
   const login=new URL('/login?error=service',request.url)
   const result=NextResponse.redirect(login)
   result.headers.set('Cache-Control','private, no-store')
   return result
  }
  return response
 }
 const supabase=createServerClient(url,key,{
  cookies:{
   getAll(){return request.cookies.getAll()},
   setAll(cookiesToSet,headersToSet){
    cookiesToSet.forEach(({name,value})=>request.cookies.set(name,value))
    response=NextResponse.next({request})
    cookiesToSet.forEach(({name,value,options})=>response.cookies.set(name,value,options))
    // Supabase SSR supplies cache-prevention headers during token refresh.
    if(headersToSet){
     Object.entries(headersToSet).forEach(([name,value])=>response.headers.set(name,value))
    }
   }
  }
 })
 let authorized=false
 try{
  const {data}=await supabase.auth.getClaims()
  authorized=Boolean(data?.claims?.sub)
 }catch{
  // Treat failed verification as unauthenticated; never expose protected pages.
 }
 if(protectedPage&&!authorized){
  const login=NextResponse.redirect(new URL('/login',request.url))
  // Supabase may remove invalid refresh-token cookies during getClaims().
  // Dropping these deletion headers causes the same bad token to be retried.
  response.cookies.getAll().forEach(cookie=>login.cookies.set(cookie))
  login.headers.set('Cache-Control','private, no-store')
  return login
 }
 response.headers.set('Cache-Control','private, no-store')
 return response
}

export const config={matcher:['/dashboard/:path*','/jobs/:path*','/staff/:path*','/technician/:path*','/login']}
