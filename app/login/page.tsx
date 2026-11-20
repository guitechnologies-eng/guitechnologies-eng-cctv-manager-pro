import {signIn} from '../actions/auth'

export default async function Login({searchParams}:{searchParams:Promise<{error?:string}>}){
 const p=await searchParams
 const message=p.error==='credentials'
  ?'Incorrect username or password. Enter the password for your CCTV Manager Pro account.'
  :p.error==='service'
  ?'Sign in is temporarily unavailable. Please contact your administrator.'
  :null

 return <main className="login">
  <section className="panel">
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
    <label>Password
     <input name="password" type="password" required autoComplete="current-password"
      placeholder="Enter your password"/>
    </label>
    <button type="submit">Sign in</button>
   </form>
   <p className="muted">Use your staff username and the same CCTV Manager Pro password. No Gmail address is needed on this screen.</p>
  </section>
 </main>
}
