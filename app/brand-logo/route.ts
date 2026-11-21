import {guiTechnologiesLogoBase64} from '../../lib/brand/original-logo'

// Original GUI Technologies artwork (resized without altering brand elements).
// Served from our own app rather than a third-party image host.
export const runtime='nodejs'
export const dynamic='force-static'

export function GET(){
 const bytes=Buffer.from(guiTechnologiesLogoBase64,'base64')
 return new Response(new Uint8Array(bytes),{
  status:200,
  headers:{
   'Content-Type':'image/jpeg',
   'Cache-Control':'public, max-age=3600, s-maxage=86400',
   'X-Content-Type-Options':'nosniff'
  }
 })
}
