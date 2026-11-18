import {signIn} from '../actions/auth'
export default async function Login({searchParams}:{searchParams:Promise<{error?:string}>}){
 const p=await searchParams
 const message=p.error==='credentials'
  ?'Incorrect email or password. Enter the password you set for this CCTV Manager Pro account, not your Gmail password.'
  :p.error==='service'
  ?'Sign in could not be completed. Please try again.'
  :null
 return <main className="login"><section className="panel"><p className="brand">GUI TECHNOLOGIES</p><h1>CCTV Manager Pro</h1><p>Authorized staff access only</p>{message&&<p role="alert">{message}</p>}<form action={signIn}><label>Email<input name="email" type="email" required autoComplete="username" autoCapitalize="none"/></label><label>Password<input name="password" type="password" required autoComplete="current-password"/></label><button type="submit">Sign in</button></form><p className="muted">If your saved password does not work, type the password manually or reset it through your account administrator.</p></section></main>
}
