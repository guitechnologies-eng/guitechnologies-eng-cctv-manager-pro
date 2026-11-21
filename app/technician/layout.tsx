import BrandLogo from '../components/BrandLogo'
import {db} from '../../lib/supabase'
import {signOut} from '../actions/auth'
import {redirect} from 'next/navigation'
import TechIcon from './TechIcon'
import TechnicianNavigation from './TechnicianNavigation'
import './technician-ui.css'

export const dynamic='force-dynamic'

export default async function TechnicianLayout({children}:{children:React.ReactNode}){
 const supabase=await db()
 const {data:{user}}=await supabase.auth.getUser()
 if(!user)redirect('/login')
 const {data:profile}=await supabase.from('profiles')
  .select('full_name,role,active').eq('id',user.id).maybeSingle()
 if(!profile?.active||profile.role!=='technician')redirect('/dashboard')

 return <div className="technician-app">
  <header className="technician-top">
   <div className="technician-top-inner">
    <div className="technician-identity">
     <BrandLogo size={48} className="gui-technician-logo" priority/>
     <div className="technician-identity-text">
      <p className="technician-brand">GUI TECHNOLOGIES</p>
      <strong>CCTV Manager Pro</strong>
      <span className="technician-user">{profile.full_name} · Technician</span>
     </div>
    </div>
    <form action={signOut}>
     <button className="technician-signout" type="submit" aria-label="Sign out">
      <TechIcon name="logout" size={19}/><span>Sign out</span>
     </button>
    </form>
   </div>
  </header>
  <main className="technician-main" id="technician-main">
   {children}
  </main>
  <TechnicianNavigation/>
 </div>
}
