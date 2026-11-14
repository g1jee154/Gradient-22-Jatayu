import { useState } from 'react'
import Logo from '../components/Logo'
export default function Auth({ go, mode }) {
  const [role, setRole] = useState('user')
  const su = mode === 'signup'
  return (
    <div className="auth"><div className="card authcard">
      <a onClick={() => go('landing')}><Logo /></a>
      <h2>{su ? 'Create your account' : 'Welcome back'}</h2>
      <p className="mut">Secure access to JATAYU (demo: any details work)</p>
      <div className="seg">{['user', 'responder', 'admin'].map(r => <button key={r} className={role === r ? 'on' : ''} onClick={() => setRole(r)}>{r}</button>)}</div>
      <form onSubmit={e => { e.preventDefault(); go(role) }}>
        {su && <input required placeholder="Full name" />}
        <input required type="email" placeholder="Email" />
        <input required type="password" placeholder="Password" />
        <button className="btn red full">{su ? 'Sign Up' : 'Login'}</button>
      </form>
      <p className="mut small">{su ? 'Already registered?' : 'New here?'} <a className="lnk" onClick={() => go(su ? 'login' : 'signup')}>{su ? 'Login' : 'Sign Up'}</a></p>
    </div></div>
  )
}
