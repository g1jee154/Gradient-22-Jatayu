import { useState } from 'react'
import Bg from './components/Bg'
import Landing from './pages/Landing'
import Auth from './pages/Auth'
import UserDash from './pages/UserDash'
import ResponderDash from './pages/ResponderDash'
import AdminDash from './pages/AdminDash'

const PAGES = { landing: Landing, login: Auth, signup: Auth, user: UserDash, responder: ResponderDash, admin: AdminDash }

export default function App() {
  const [page, setPage] = useState('landing')
  const go = p => { setPage(p); window.scrollTo(0, 0) }
  const View = PAGES[page]
  return (<><Bg /><div key={page} className="page"><View go={go} mode={page} /></div></>)
}
