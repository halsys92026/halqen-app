export function Logo({ size = 32, showWordmark = true, wordmarkSize = 20 }: { size?: number; showWordmark?: boolean; wordmarkSize?: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: size * 0.3 }}>
      <svg width={size} height={size * 1.15} viewBox="0 0 200 230">
        <defs>
          <linearGradient id="halqenGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8FC4FF" />
            <stop offset="55%" stopColor="#2F6BFF" />
            <stop offset="100%" stopColor="#0A1F6E" />
          </linearGradient>
        </defs>
        <path
          d="M100 8 L176 34 L176 118 C176 172 142 208 100 222 C58 208 24 172 24 118 L24 34 Z"
          fill="none"
          stroke="url(#halqenGrad)"
          strokeWidth="7"
        />
        <g fill="#5AA7FF">
          <circle cx="100" cy="98" r="17" />
          <path d="M92.5 111 L107.5 111 L113 138 L87 138 Z" />
        </g>
        <circle cx="100" cy="98" r="6.2" fill="#0A1330" />
      </svg>
      {showWordmark && (
        <span
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 700,
            fontSize: wordmarkSize,
            letterSpacing: '0.04em',
            color: '#F2EEE6',
          }}
        >
          HAL<span style={{ color: '#5AA7FF' }}>Q</span>EN
        </span>
      )}
    </div>
  );
}
