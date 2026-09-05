export function LogoMark({ compact = false }) {
  return (
    <div className={compact ? 'logoMark compact' : 'logoMark'}>
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <defs>
          <linearGradient id="logoCore" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0ea5e9" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>
        </defs>
        <rect x="3" y="3" width="58" height="58" rx="14" fill="#050b18" stroke="#1f3a66" strokeWidth="2.5" />
        <circle cx="32" cy="32" r="18" fill="none" stroke="url(#logoCore)" strokeWidth="3" />
        <path d="M20 39 L26 29 L31 34 L38 24 L44 29" fill="none" stroke="url(#logoCore)" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="44" cy="29" r="2.4" fill="#22d3ee" />
      </svg>
      <div className="logoTextWrap">
        <span className="logoTitle">Nexora Markets</span>
        {!compact && <span className="logoSub">Market Intelligence Console</span>}
      </div>
    </div>
  );
}
