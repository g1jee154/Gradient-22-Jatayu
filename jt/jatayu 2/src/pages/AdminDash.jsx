import { useState } from 'react'
import Shell from '../components/Shell'
import MapView from '../components/MapView'
import { Badge, Stat, T, fmt } from '../components/ui'

const INC0 = [
  { id: 'JTY-4821', u: 'Aarav S.', l: 'Indiranagar', s: 'Active', x: 250, y: 150 }, { id: 'JTY-4819', u: 'Neha R.', l: 'Koramangala', s: 'Active', x: 130, y: 200 },
  { id: 'JTY-4812', u: 'Karan M.', l: 'Whitefield', s: 'Resolved', x: 340, y: 70 }, { id: 'JTY-4799', u: 'Divya P.', l: 'Jayanagar', s: 'Resolved', x: 90, y: 120 }, { id: 'JTY-4780', u: 'Sameer T.', l: 'HSR Layout', s: 'Cancelled', x: 300, y: 215 }]
const RES0 = [
  { n: 'Arjun K.', t: 'Police', v: true, a: true, x: 70, y: 50 }, { n: 'Dr. Meera N.', t: 'Medical', v: true, a: true, x: 210, y: 100 }, { n: 'Vikram S.', t: 'Fire & Rescue', v: true, a: false, x: 320, y: 160 },
  { n: 'Sana Q.', t: 'Volunteer', v: false, a: false, x: 160, y: 230 }, { n: 'Rahul D.', t: 'Medical', v: false, a: false, x: 360, y: 230 }]
const USR0 = [{ n: 'Aarav Sharma', e: 'aarav@mail.com', s: false }, { n: 'Neha Rao', e: 'neha@mail.com', s: false }, { n: 'Karan Mehta', e: 'karan@mail.com', s: false }, { n: 'Spam Bot', e: 'x@spam.io', s: true }]
const LOG0 = [{ t: '10:42:08', a: 'system', m: 'Responder Arjun K. assigned to JTY-4821', h: 'a91f03c2' }, { t: '10:41:55', a: 'system', m: 'SOS triggered: JTY-4821', h: '5be7d410' }, { t: '09:58:12', a: 'admin@jatayu', m: 'Verified responder Dr. Meera N.', h: '0c33aa7e' }]
const hash = s => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7).toString(16).padStart(8, '0')

export default function AdminDash({ go }) {
  const [tab, setTab] = useState('Overview')
  const [inc] = useState(INC0)
  const [res, setRes] = useState(RES0)
  const [usr, setUsr] = useState(USR0)
  const [log, setLog] = useState(LOG0)
  const audit = m => setLog(l => [{ t: fmt(new Date()), a: 'admin@jatayu', m, h: hash(m + l[0].h) }, ...l])
  const act = inc.filter(i => i.s === 'Active'), avail = res.filter(r => r.v && r.a)
  const verify = (r, ok) => { setRes(ok ? res.map(x => x === r ? { ...x, v: true } : x) : res.filter(x => x !== r)); audit((ok ? 'Verified' : 'Rejected') + ' responder ' + r.n) }
  const susp = u => { setUsr(usr.map(x => x === u ? { ...x, s: !x.s } : x)); audit((u.s ? 'Reinstated' : 'Suspended') + ' user ' + u.n) }
  const sb = { Active: 'red', Resolved: 'green', Cancelled: 'gray' }

  return (
    <Shell role="Admin" tabs={['Overview', 'Responder Verification', 'User Management', 'Incident History', 'Audit Logs']} tab={tab} setTab={setTab} go={go}>
      {tab === 'Overview' && <>
        <div className="g4">
          <Stat l="Total registered users" v="12,480" /><Stat l="Active emergencies" v={act.length} c="var(--red)" />
          <Stat l="Available responders" v={avail.length} c="var(--blue)" /><Stat l="Resolved incidents" v={inc.filter(i => i.s === 'Resolved').length + 1840} c="var(--green)" /></div>
        <div className="card"><h3>Live incident map</h3>
          <MapView markers={[...act.map(i => ({ x: i.x, y: i.y, type: 'user', label: i.id })), ...avail.map(r => ({ x: r.x, y: r.y, type: 'responder' }))]} />
          <p className="mut small"><span style={{ color: 'var(--red)' }}>●</span> Active emergency &nbsp; <span style={{ color: 'var(--blue)' }}>●</span> Available responder</p></div></>}
      {tab === 'Responder Verification' && <div className="card"><h3>Responder verification</h3>
        <T h={['Name', 'Type', 'Status', 'Action']} rows={res.map(r => [r.n, r.t, <Badge c={r.v ? 'green' : 'amber'}>{r.v ? 'Verified' : 'Pending'}</Badge>,
          r.v ? '—' : <span className="row"><button className="btn ok sm" onClick={() => verify(r, true)}>Approve</button><button className="btn ghost sm" onClick={() => verify(r, false)}>Reject</button></span>])} /></div>}
      {tab === 'User Management' && <div className="card"><h3>User management</h3>
        <T h={['Name', 'Email', 'Status', 'Action']} rows={usr.map(u => [u.n, u.e, <Badge c={u.s ? 'gray' : 'green'}>{u.s ? 'Suspended' : 'Active'}</Badge>, <button className="btn ghost sm" onClick={() => susp(u)}>{u.s ? 'Reinstate' : 'Suspend'}</button>])} /></div>}
      {tab === 'Incident History' && <div className="card"><h3>Incident history</h3>
        <T h={['ID', 'User', 'Location', 'Status']} rows={inc.map(i => [i.id, i.u, i.l, <Badge c={sb[i.s]}>{i.s}</Badge>])} /></div>}
      {tab === 'Audit Logs' && <div className="card"><h3>Audit logs <span className="mut small">(hash-chained, tamper-evident)</span></h3>
        <T h={['Time', 'Actor', 'Action', 'Hash']} rows={log.map(l => [l.t, l.a, l.m, <code>{l.h}</code>])} /></div>}
    </Shell>
  )
}
