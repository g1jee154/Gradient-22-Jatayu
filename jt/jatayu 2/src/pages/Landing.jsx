import Logo from '../components/Logo'
const F = [['🆘', 'One-Tap SOS', 'Trigger an emergency alert instantly from any device.'], ['📍', 'Live Location Sharing', 'Trusted contacts follow your real-time location.'], ['🛡️', 'Verified Responders', 'Nearby, verified responders are matched in seconds.'], ['📡', 'Real-Time Tracking', 'Follow every incident from alert to resolution.'], ['🔔', 'Smart Escalation', 'If a contact does not respond, alerts escalate automatically.'], ['🧾', 'Tamper-Evident Audit', 'Every action is recorded in an auditable incident timeline.']]
const S = [['1', 'Press SOS', 'One tap alerts your trusted contacts and the JATAYU network.'], ['2', 'Get Matched', 'The nearest verified responder is assigned and starts moving.'], ['3', 'Stay Informed', 'Track the response live until you are safe.']]
export default function Landing({ go }) {
  return (
    <>
      <header className="nav">
        <a href="#home"><Logo /></a>
        <nav>{[['Home', 'home'], ['Features', 'features'], ['How it Works', 'how'], ['About', 'about']].map(([l, i]) => <a key={i} href={'#' + i}>{l}</a>)}</nav>
        <div className="navbtn"><button className="btn ghost" onClick={() => go('login')}>Login</button><button className="btn red" onClick={() => go('signup')}>Sign Up</button></div>
      </header>
      <section id="home" className="hero">
        <span className="chip live">● Live emergency network</span>
        <h1>Your Safety.<br /><em>Our Priority.</em></h1>
        <p>JATAYU is a unified personal safety and emergency response platform. Trigger an alert, share your live location with trusted contacts, and connect with verified responders nearby, all tracked on a secure, auditable timeline.</p>
        <button className="btn red lg" onClick={() => go('signup')}>Get Protected</button>
      </section>
      <section id="features" className="sec"><h2>Built for the moment it matters</h2>
        <div className="g3">{F.map(([i, t, d]) => <div className="card feat" key={t}><span className="ico">{i}</span><h3>{t}</h3><p className="mut">{d}</p></div>)}</div></section>
      <section id="how" className="sec"><h2>How it works</h2>
        <div className="g3">{S.map(([n, t, d]) => <div className="card feat" key={n}><span className="num">{n}</span><h3>{t}</h3><p className="mut">{d}</p></div>)}</div></section>
      <section id="about" className="sec"><h2>About JATAYU</h2>
        <p className="mut about">Named after the guardian bird of the Ramayana who stood up to protect someone in danger, JATAYU connects people in distress with the people and responders who can help, quickly and securely.</p></section>
      <footer className="foot mut small">© 2026 JATAYU · Build Beyond'26 · Gradient Club, BMSCE</footer>
    </>
  )
}
