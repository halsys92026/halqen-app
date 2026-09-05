import Link from 'next/link';

export default function Home() {
  return (
    <div
      style={{
        background: '#1C1B19', minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', color: '#F2EEE6', fontFamily: 'Inter, sans-serif',
        textAlign: 'center', padding: 24,
      }}
    >
      <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 12 }}>Halqen</h1>
      <p style={{ color: '#8A8478', marginBottom: 32, maxWidth: 380 }}>
        Identity. Verified. Trusted.
      </p>
      <div style={{ display: 'flex', gap: 12 }}>
        <Link
          href="/scan"
          style={{ background: '#C08A4E', color: '#1C1B19', padding: '12px 24px', borderRadius: 14, fontWeight: 600, textDecoration: 'none' }}
        >
          Try the scan
        </Link>
        <Link
          href="/login"
          style={{ border: '1px solid #3a352c', color: '#F2EEE6', padding: '12px 24px', borderRadius: 14, textDecoration: 'none' }}
        >
          Owner login
        </Link>
      </div>
    </div>
  );
}
