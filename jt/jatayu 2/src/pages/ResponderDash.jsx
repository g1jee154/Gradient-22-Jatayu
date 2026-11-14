import { useState } from 'react'
import Shell from '../components/Shell'
import MapView from '../components/MapView'
import { Tog, Badge, T } from '../components/ui'

const RQ0 = [
  { id: 'JTY-4821', who: 'Aarav S.', type: 'Personal safety', loc: '12th Main, Indiranagar', km: 1.2, x: 250, y: 150, la: 12.9784, lo: 77.6408, ago: '1 min ago' },
  { id: 'JTY-4824', who: 'Neha R.', type: 'Stalking report', loc: '5th Block, Koramangala', km: 2.9, x: 130, y: 200, la: 12.9352, lo: 77.6245, ago: '3 min ago' },
  { id: 'JTY-4826', who: 'Karan M.', type: 'Medical assist', loc: 'ITPL Road, Whitefield', km: 6.4, x: 340, y: 70, la: 12.9698, lo: 77.75, ago: '5 min ago' }]
const ST = ['Accepted', 'En route', 'On scene', 'Resolved'], RP = { x: 70, y: 50 }

export default function ResponderDash({ go }) {
  const [tab, setTab] = useState('Console')
  const [on, setOn] = useState(true)
  const [rq, setRq] = useState(RQ0)
  const [act, setAct] = useState(null)
  const [done, setDone] = useState([{ id: 'JTY-4760', who: 'Isha T.', d: 'Yesterday' }, { id: 'JTY-4731', who: 'Manoj K.', d: '11 Nov' }])
  const drop = r => setRq(rq.filter(q => q.id !== r.id))
  const accept = r => { setAct({ ...r, st: 0 }); drop(r) }
  const upd = i => { if (i === 3) { setDone([{ id: act.id, who: act.who, d: 'Today' }, ...done]); setAct(null) } else setAct({ ...act, st: i }) }
  const prog = act ? [0, .4, 1, 1][act.st] : 0
  const rp = act ? { x: RP.x + (act.x - RP.x) * prog, y: RP.y + (act.y - RP.y) * prog } : RP

  const Con = () => (<>
    <div className="card row"><div><h3>Availability</h3><p className="mut small">{on ? 'You are visible and can receive requests.' : 'You are offline. No requests will be sent.'}</p></div>
      <div className="row"><Badge c={on ? 'green' : 'gray'}>{on ? 'Online' : 'Offline'}</Badge><Tog on={on} set={setOn} /></div></div>
    <div className="g2">
      <div className="card"><h3>Incoming emergency requests</h3>
        {!on ? <p className="mut">Go online to receive requests.</p> : rq.length === 0 ? <p className="mut">No pending requests.</p> :
          rq.map(r => <div className="req" key={r.id}>
            <div className="row"><b>{r.id} · {r.type}</b><span className="mut small">{r.ago}</span></div>
            <p className="mut small">{r.who} · {r.loc}</p><p className="small">📍 {r.km} km away</p>
            <div className="row"><button className="btn ok" disabled={!!act} onClick={() => accept(r)}>Accept</button><button className="btn ghost" onClick={() => drop(r)}>Decline</button></div></div>)}
        {act && on && <p className="mut small">Finish your active incident to accept another.</p>}</div>
      <div className="card"><h3>Incident location</h3>
        <MapView line={act ? [rp, act] : null} markers={[{ ...rp, type: 'responder', label: 'You' }, ...(act ? [{ x: act.x, y: act.y, type: 'user', label: act.id }] : rq.map(r => ({ x: r.x, y: r.y, type: 'user' })))]} />
        {act ? <>
          <dl className="kv"><dt>Location</dt><dd>{act.loc}</dd><dt>Distance</dt><dd>{(act.km * (1 - prog)).toFixed(1)} km</dd><dt>Status</dt><dd><Badge c="blue">{ST[act.st]}</Badge></dd></dl>
          <button className="btn red" onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${act.la},${act.lo}`, '_blank')}>🧭 Navigate</button>
          <h4 style={{ margin: '16px 0 8px' }}>Update status</h4>
          <div className="seg">{ST.map((s, i) => <button key={s} className={act.st === i ? 'on' : ''} onClick={() => upd(i)}>{s}</button>)}</div>
        </> : <p className="mut small" style={{ marginTop: 10 }}>Accept a request to see distance, navigation and status controls.</p>}</div>
    </div></>)

  return (
    <Shell role="Responder" tabs={['Console', 'Completed Incidents']} tab={tab} setTab={setTab} go={go}>
      {tab === 'Console' ? Con() : <div className="card"><h3>Completed incidents</h3><T h={['ID', 'Person', 'Date', 'Outcome']} rows={done.map(d => [d.id, d.who, d.d, <Badge c="green">Resolved</Badge>])} /></div>}
    </Shell>
  )
}
