import Link from 'next/link';
import { Logo } from '@/components/Logo';

export default function Home() {
  return (
    <div
      style={{
        background: '#0A1330', minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', color: '#F2EEE6', fontFamily: 'Inter, sans-serif',
        textAlign: 'center', padding: 24,
      }}
    >
      <div style={{ marginBottom: 20 }}>
        <Logo size={56} wordmarkSize={30} />
      </div>
      <p style={{ color: '#8B93B8', letterSpacing: '0.18em', textTransform: 'uppercase', fontSize: 11, marginBottom: 32 }}>
        Identity. <span style={{ color: '#5AA7FF' }}>Verified</span>. Trusted.
      </p>
      <div style={{ display: 'flex', gap: 12 }}>
        <Link
          href="/scan"
          style={{ background: 'linear-gradient(135deg,#5AA7FF,#2F6BFF)', color: '#0A1330', padding: '12px 24px', borderRadius: 14, fontWeight: 700, textDecoration: 'none' }}
        >
          Try the scan
        </Link>
        <Link
          href="/login"
          style={{ border: '1px solid #22305e', color: '#F2EEE6', padding: '12px 24px', borderRadius: 14, textDecoration: 'none' }}
        >
          Owner login
        </Link>
      </div>
    </div>
  );
}
