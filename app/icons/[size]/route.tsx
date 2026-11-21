import {ImageResponse} from 'next/og'
import {guiTechnologiesLogoDataUri} from '../../../lib/brand/original-logo'

export const runtime='nodejs'

// The existing PWA icon URLs remain unchanged so Android, iOS and push
// notifications all use the user's real, unchanged GUI Technologies artwork.
export async function GET(_request:Request,{params}:{params:Promise<{size:string}>}){
 const {size}=await params
 if(!['180.png','192.png','512.png'].includes(size)){
  return new Response('Not Found',{status:404,headers:{'Cache-Control':'no-store'}})
 }
 const pixels=parseInt(size,10)
 return new ImageResponse(
  <div style={{
   display:'flex',width:'100%',height:'100%',
   background:'#fff',alignItems:'center',justifyContent:'center'
  }}>
   <img src={guiTechnologiesLogoDataUri} alt="GUI Technologies official logo"
    width={pixels} height={pixels} style={{width:'100%',height:'100%',objectFit:'contain'}}/>
  </div>,
  {width:pixels,height:pixels,headers:{
   'Cache-Control':'public,max-age=3600,s-maxage=86400',
   'X-Content-Type-Options':'nosniff'
  }}
 )
}
