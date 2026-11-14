const P = Array.from({ length: 36 }, (_, i) => ({ l: (i * 37) % 100, t: (i * 53) % 100, s: 2 + (i % 4), d: 8 + (i % 7) * 2, dl: -(i % 9) * 1.3, r: i % 5 === 0 }))
export default function Bg() {
  return (
    <div className="bg">
      <i className="blob b1" /><i className="blob b2" /><i className="blob b3" /><div className="grid" />
      {P.map((p, i) => <b key={i} className={'pt' + (p.r ? ' red' : '')} style={{ left: p.l + '%', top: p.t + '%', width: p.s, height: p.s, animationDuration: p.d + 's', animationDelay: p.dl + 's' }} />)}
    </div>
  )
}
