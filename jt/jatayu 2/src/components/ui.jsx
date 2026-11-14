export const Tog = ({ on, set }) => <button type="button" className={'tog' + (on ? ' on' : '')} onClick={() => set(!on)}><i /></button>
export const Badge = ({ c = 'blue', children }) => <span className={'badge ' + c}>{children}</span>
export const Stat = ({ l, v, c }) => <div className="card stat"><span className="mut">{l}</span><b style={{ color: c }}>{v}</b></div>
export const T = ({ h, rows }) => (
  <div className="tw"><table><thead><tr>{h.map(x => <th key={x}>{x}</th>)}</tr></thead>
    <tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody></table></div>
)
export const fmt = d => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
