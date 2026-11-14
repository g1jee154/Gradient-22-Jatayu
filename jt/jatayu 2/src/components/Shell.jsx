import Logo from './Logo'
export default function Shell({ role, tabs, tab, setTab, go, children }) {
  return (
    <div className="shell">
      <header className="top">
        <Logo /><span className="chip">{role}</span>
        <nav className="tabs">{tabs.map(t => <button key={t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>{t}</button>)}</nav>
        <button className="btn ghost" onClick={() => go('landing')}>Logout</button>
      </header>
      <main key={tab} className="page">{children}</main>
    </div>
  )
}
