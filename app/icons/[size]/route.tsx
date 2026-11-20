import {ImageResponse} from 'next/og'

// Neutral CCTV app icon; not a replacement or alteration of the GUI Technologies logo.
// A dedicated image route produces real PNGs for Android and iOS installation.
export const runtime='nodejs'

export async function GET(_request:Request,{params}:{params:Promise<{size:string}>}){
 const {size}=await params
 if(!['180.png','192.png','512.png'].includes(size)){
  return new Response('Not Found',{status:404,headers:{'Cache-Control':'no-store'}})
 }
 const pixels=parseInt(size,10)
 const unit=pixels/512
 const scale=(value:number)=>Math.round(value*unit)
 return new ImageResponse(
  <div style={{
   display:'flex',width:'100%',height:'100%',alignItems:'center',
   justifyContent:'center',background:'#071625',fontFamily:'sans-serif'
  }}>
   <div style={{
    display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
    width:'79%',height:'79%',borderRadius:scale(92),
    background:'linear-gradient(150deg,#15b7d1 0%,#057ca6 42%,#103d62 100%)',
    border:scale(5)+'px solid #2accdf'
   }}>
    <div style={{
     display:'flex',alignItems:'center',justifyContent:'center',
     width:scale(165),height:scale(100),borderRadius:scale(25),
     border:scale(14)+'px solid #f4fcff',marginBottom:scale(21)
    }}>
     <div style={{
      display:'flex',width:scale(57),height:scale(57),borderRadius:'50%',
      border:scale(12)+'px solid #f4fcff',
      background:'#075c84'
     }}/>
    </div>
    <div style={{
     display:'flex',color:'#ffffff',fontSize:scale(78),fontWeight:800,
     letterSpacing:scale(4),lineHeight:1
    }}>CCTV</div>
    <div style={{
     display:'flex',color:'#d7fbff',fontSize:scale(30),fontWeight:700,
     letterSpacing:scale(3),marginTop:scale(12)
    }}>MANAGER PRO</div>
   </div>
  </div>,
  {
   width:pixels,height:pixels,
   headers:{'Cache-Control':'public,max-age=86400,immutable','X-Content-Type-Options':'nosniff'}
  }
 )
}
