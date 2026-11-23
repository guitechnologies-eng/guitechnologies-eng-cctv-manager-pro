import BrandLogo from '../components/BrandLogo'
import {signIn} from '../actions/auth'
import PendingButton from '../components/PendingButton'

export default async function Login({searchParams}:{searchParams:Promise<{error?:string}>}){
 const p=await searchParams
 const message=p.error==='credentials'
  ?'Incorrect username, password or PIN. Please try again.'
  :p.error==='service'
  ?'Sign in is temporarily unavailable. Please contact your administrator.'
  :null

 return <main className="login">
  <section className="panel gui-login-panel">
   <div className="gui-login-logo"><BrandLogo size={112} priority/></div>
   <p className="brand">GUI TECHNOLOGIES</p>
   <h1>CCTV Manager Pro</h1>
   <p>Authorized staff access only</p>
   {message&&<p role="alert" className="login-error">{message}</p>}
   <form action={signIn}>
    <label>Username
     <input name="username" type="text" required minLength={3} maxLength={32}
      autoComplete="username" autoCapitalize="none" autoCorrect="off"
      spellCheck={false} pattern="[A-Za-z][A-Za-z0-9._-]{2,31}"
      placeholder="Enter your username"/>
    </label>
    <label>Password / Staff PIN
     <input name="password" type="password" required autoComplete="current-password"
      placeholder="Admin password or staff PIN"/>
    </label>
    <PendingButton label="Sign in" pendingLabel="Signing in..."/>
   </form>
   <p className="muted">Admin uses the existing password. Newly created staff use their 4–8 digit PIN. No Gmail address is required.</p>
  </section>
 </main>
}
