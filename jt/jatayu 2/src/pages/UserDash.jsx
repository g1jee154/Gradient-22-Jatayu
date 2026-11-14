import { useState, useEffect } from 'react'
import Shell from '../components/Shell'
import MapView from '../components/MapView'
import { Tog, Badge, T, fmt } from '../components/ui'

const CONTACTS = [{ n: 'Mom', p: '+91 98450 11122' }, { n: 'Rohan (Brother)', p: '+91 98860 22233' }, { n: 'Priya (Friend)', p: '+91 99000 33344' }]
const STEPS = ['SOS triggered', 'Live location sharing started', 'Trusted contacts notified', 'Responder Arjun K. assigned', 'Responder en route', 'Responder arrived on scene']
const NEAR = [{ n: 'Arjun K.', t: 'Police', d: '0.8 km', x: 70, y: 50 }, { n: 'Dr. Meera N.', t: 'Medical', d: '1.4 km', x: 330, y: 70 }, { n: 'Vikram S.', t: 'Fire & Rescue', d: '2.1 km', x: 300, y: 215 }]
const ME = { x: 250, y: 150 }, R0 = NEAR[0]
const csBadge = s => s === 'Acknowledged' ? 'green' : s === 'Notified' ? 'blue' : 'gray'

export default function UserDash({ go }) {
  const [tab, setTab] = useState('Overview')
  const [inc, setInc] = useState(null)
  const [confirm, setConfirm] = useState(false)
  const [hist, setHist] = useState([{ id: 'JTY-2041', d: '12 Oct 2026', s: 'Resolved', l: 'Indiranagar' }, { id: 'JTY-1987', d: '28 Aug 2026', s: 'Cancelled', l: 'MG Road' }])
  const [prefs, setPrefs] = useState({ share: true, sms: true, silent: false })

  useEffect(() => {
    if (!inc || inc.step >= 5) return
    const t = setTimeout(() => setInc(i => ({ ...i, step: i.step + 1, log: [...i.log, { t: new Date(), m: STEPS[i.step + 1] }] })), 3000)
    return () => clearTimeout(t)
  }, [inc])

  const sos = () => { setInc({ id: 'JTY-' + Math.floor(1000 + Math.random() * 9000), t0: new Date(), step: 0, log: [{ t: new Date(), m: STEPS[0] }] }); setTab('Active Incident') }
  const end = s => { setHist([{ id: inc.id, d: 'Today', s, l: 'Indiranagar' }, ...hist]); setInc(null); setConfirm(false); setTab('Overview') }

  const Over = () => (<>
    <h1 className="wel">Welcome back, Aarav 👋</h1>
    <p className="mut" style={{ marginBottom: 20 }}>You are protected. Your trusted network is on standby.</p>
    <div className="g3">
      <div className="card"><h3>Emergency SOS</h3><div className="sosbox"><button className="sos" onClick={sos}>SOS</button></div><p className="mut small center">Press to alert contacts and nearby responders</p></div>
      <div className="card"><h3>Current location</h3>
        <p style={{ margin: '12px 0 4px', fontWeight: 600 }}>12th Main, Indiranagar, Bengaluru</p>
        <p className="mut small">12.9784° N, 77.6408° E · ±8 m</p>
        <div className="row li"><span>Share live location</span><Tog on={prefs.share} set={v => setPrefs({ ...prefs, share: v })} /></div></div>
      <div className="card"><h3>Active incident</h3>
        {inc ? <><p style={{ margin: '12px 0' }}><Badge c="red">LIVE</Badge> {inc.id}</p><p className="mut small">{STEPS[inc.step]}</p><br /><button className="btn red" onClick={() => setTab('Active Incident')}>View live status</button></>
          : <p style={{ marginTop: 12 }}><Badge c="green">All clear</Badge> <span className="mut">No active incident.</span></p>}</div>
    </div>
    <div className="g2">
      <div className="card"><h3>Trusted contacts</h3>
        {CONTACTS.map(c => <div className="row li" key={c.n}><span><b>{c.n}</b><br /><small className="mut">{c.p}</small></span><Badge c="green">Verified</Badge></div>)}
        <button className="btn ghost">+ Add contact</button></div>
      <div className="card"><h3>Nearby responders</h3>
        <MapView markers={[{ ...ME, type: 'me', label: 'You' }, ...NEAR.map(r => ({ ...r, type: 'responder' }))]} />
        {NEAR.map(r => <div className="row li" key={r.n}><span>{r.n} · <span className="mut">{r.t}</span></span><span className="mut">{r.d}</span></div>)}</div>
    </div>
    <div className="card"><h3>Emergency history</h3>
      <T h={['ID', 'Date', 'Location', 'Status']} rows={hist.map(x => [x.id, x.d, x.l, <Badge c={x.s === 'Resolved' ? 'green' : 'gray'}>{x.s}</Badge>])} /></div>
  </>)

  const Active = () => {
    if (!inc) return <div className="card center"><h3>No active incident</h3><p className="mut">Press SOS on the Overview to start one.</p></div>
    const s = inc.step, prog = [0, 0, 0, .15, .6, 1][s]
    const rp = { x: R0.x + (ME.x - R0.x) * prog, y: R0.y + (ME.y - R0.y) * prog }
    const cs = [s < 2 ? 'Pending' : s < 4 ? 'Notified' : 'Acknowledged', s < 2 ? 'Pending' : 'Notified', s < 4 ? 'On standby' : 'Notified']
    return (
      <div className="g2">
        <div className="card">
          <div className="row"><h3>Active emergency</h3><Badge c="red">● LIVE</Badge></div>
          <dl className="kv">
            <dt>Emergency ID</dt><dd>{inc.id}</dd>
            <dt>Incident time</dt><dd>{fmt(inc.t0)}</dd>
            <dt>Current location</dt><dd>12th Main, Indiranagar</dd>
            <dt>Location sharing</dt><dd><span className="livetxt">● Sharing live</span></dd>
            <dt>Assigned responder</dt><dd>{s < 3 ? 'Searching…' : 'Arjun K. (Police)'}</dd>
            <dt>Responder status</dt><dd>{['Searching', 'Searching', 'Searching', 'Assigned', 'En route', 'On scene'][s]}</dd>
          </dl>
          <h4>Contact escalation</h4>
          {CONTACTS.map((c, i) => <div className="row li" key={c.n}><span>L{i + 1} · {c.n}</span><Badge c={csBadge(cs[i])}>{cs[i]}</Badge></div>)}
          <div className="row" style={{ marginTop: 18 }}>
            <button className="btn red" onClick={() => setConfirm(true)}>Cancel Alert</button>
            {s === 5 && <button className="btn ok" onClick={() => end('Resolved')}>Mark Resolved</button>}
          </div>
        </div>
        <div>
          <div className="card"><h3>Live map</h3>
            <MapView line={s >= 3 ? [rp, ME] : null} markers={[{ ...ME, type: 'user', label: 'You' }, ...(s >= 3 ? [{ ...rp, type: 'responder', label: 'Arjun' }] : [])]} /></div>
          <div className="card"><h3>Live incident timeline</h3>
            <ul className="tl">{[...inc.log].reverse().map((e, i) => <li key={i}><time>{fmt(e.t)}</time>{e.m}</li>)}</ul></div>
        </div>
      </div>
    )
  }

  const Prof = () => (
    <div className="g2">
      <div className="card"><h3>Profile</h3>
        <dl className="kv"><dt>Name</dt><dd>Aarav Sharma</dd><dt>Email</dt><dd>aarav@mail.com</dd><dt>Phone</dt><dd>+91 98000 00000</dd><dt>Blood group</dt><dd>B+</dd></dl></div>
      <div className="card"><h3>Settings</h3>
        {[['share', 'Share live location by default'], ['sms', 'SMS fallback to contacts'], ['silent', 'Silent SOS (no sound)']].map(([k, l]) =>
          <div className="row li" key={k}><span>{l}</span><Tog on={prefs[k]} set={v => setPrefs({ ...prefs, [k]: v })} /></div>)}
        <p className="mut small" style={{ marginTop: 14 }}>Location and personal data are encrypted and visible only to people you authorise.</p></div>
    </div>
  )

  return (
    <Shell role="User" tabs={['Overview', 'Active Incident', 'Profile & Settings']} tab={tab} setTab={setTab} go={go}>
      {tab === 'Overview' && Over()}{tab === 'Active Incident' && Active()}{tab === 'Profile & Settings' && Prof()}
      {confirm && <div className="modal"><div className="card">
        <h3>Cancel this alert?</h3><p className="mut" style={{ margin: '10px 0 18px' }}>Contacts and the assigned responder will be told you are safe. This is recorded in the audit log.</p>
        <div className="row"><button className="btn ghost" onClick={() => setConfirm(false)}>Keep alert active</button><button className="btn red" onClick={() => end('Cancelled')}>Yes, cancel alert</button></div></div></div>}
    </Shell>
  )
}
