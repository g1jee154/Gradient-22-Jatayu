const C = { user: '#EF4444', responder: '#38BDF8', me: '#22C55E' }
export default function MapView({ markers = [], line }) {
  return (
    <svg className="map" viewBox="0 0 400 260">
      <rect width="400" height="260" fill="#0c1526" />
      {[40, 110, 170, 230, 300, 360].map(x => <path key={x} d={`M${x} 0V260`} className="road" />)}
      {[30, 90, 150, 210].map(y => <path key={y} d={`M0 ${y}H400`} className="road" />)}
      <path d="M0 240C100 180 220 200 400 60" className="road main" />
      {line && <line x1={line[0].x} y1={line[0].y} x2={line[1].x} y2={line[1].y} className="route" />}
      {markers.map((m, i) => (
        <g key={i} className="mk" style={{ transform: `translate(${m.x}px,${m.y}px)` }}>
          <circle r="8" fill={C[m.type]} className="ping" />
          <circle r="6" fill={C[m.type]} /><circle r="2.5" fill="#fff" />
          {m.label && <text y="-13" textAnchor="middle" className="mlabel">{m.label}</text>}
        </g>
      ))}
    </svg>
  )
}
