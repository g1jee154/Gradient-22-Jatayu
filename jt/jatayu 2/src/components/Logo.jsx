export default function Logo({ size = 30 }) {
  return (
    <span className="logo">
      <svg width={size} height={size} viewBox="0 0 32 32">
        <defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#EF4444" /><stop offset="1" stopColor="#38BDF8" /></linearGradient></defs>
        <path d="M16 2 4 6v9c0 7 5 12 12 15 7-3 12-8 12-15V6z" fill="none" stroke="url(#lg)" strokeWidth="2" />
        <path d="M7 17c4 0 7-3 9-9 2 6 5 9 9 9-3 1-6 3-9 7-3-4-6-6-9-7z" fill="url(#lg)" />
      </svg>JATAYU
    </span>
  )
}
