'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Logo } from '@/components/Logo';
import { Spinner } from '@/components/Layout';
import { Button } from '@/components/Button';

type Profile = {
  kind: string;
  business: string;
  display_name: string;
  title: string;
  phone: string;
  email: string;
  color: string;
  photo_url: string | null;
  brand: string | null;
  bio: string | null;
};

// Builds a standard vCard containing ONLY basic contact info — name, business,
// title, phone, email, and photo. Deliberately never includes bio or any
// credential/verification data; that stays on the webpage only.
async function buildVCard(profile: Profile): Promise<string> {
  const lines = ['BEGIN:VCARD', 'VERSION:3.0'];
  lines.push(`FN:${profile.display_name || profile.business}`);
  if (profile.business) lines.push(`ORG:${profile.business}`);
  if (profile.title) lines.push(`TITLE:${profile.title}`);
  if (profile.phone) lines.push(`TEL;TYPE=CELL:${profile.phone}`);
  if (profile.email) lines.push(`EMAIL:${profile.email}`);

  if (profile.photo_url) {
    try {
      const res = await fetch(profile.photo_url);
      const blob = await res.blob();
      const base64: string = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      const type = blob.type.includes('png') ? 'PNG' : 'JPEG';
      lines.push(`PHOTO;ENCODING=b;TYPE=${type}:${base64}`);
    } catch {
      // If the photo can't be fetched, the vCard still works without it
    }
  }

  lines.push('END:VCARD');
  return lines.join('\r\n');
}

export default function CardTapPage() {
  const params = useParams();
  const token = typeof params.token === 'string' ? params.token : Array.isArray(params.token) ? params.token[0] : '';

  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingContact, setSavingContact] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/verify-card', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        const json = await res.json();

        if (!res.ok) {
          setError(json.error || 'Something went wrong');
        } else {
          setProfile(json.profile);
        }
      } catch {
        setError('Network error — check your connection');
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  async function saveContact() {
    if (!profile) return;
    setSavingContact(true);
    try {
      const vcard = await buildVCard(profile);
      const blob = new Blob([vcard], { type: 'text/vcard' });
      const url = URL.createObjectURL(blob);
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

      if (isIOS) {
        // iOS Safari handles a forced "download" attribute inconsistently for
        // vCards — sometimes routing to the Files app instead of the native
        // Add Contact screen. Navigating directly to the vCard data lets
        // Safari recognize the MIME type and show the native contact preview.
        window.location.href = url;
      } else {
        const a = document.createElement('a');
        a.href = url;
        a.download = `${(profile.display_name || profile.business || 'contact').replace(/\s+/g, '-')}.vcf`;
        a.click();
      }
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } finally {
      setSavingContact(false);
    }
  }

  return (
    <div
      style={{
        background: 'radial-gradient(circle at 25% 10%, #16204f 0%, #0A1330 55%)',
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24, fontFamily: 'Inter, sans-serif',
      }}
    >
      <div
        style={{
          width: '100%', maxWidth: 380, background: '#111a3d', border: '1px solid #22305e', borderRadius: 28,
          padding: 32, boxShadow: '0 30px 60px -20px rgba(0,0,0,0.6)', animation: 'hq-fade-in 0.4s ease',
        }}
      >
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 0' }}>
            <div style={{ marginBottom: 20 }}>
              <Logo size={30} wordmarkSize={17} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#8B93B8', fontSize: 12 }}>
              <Spinner size={16} /> Verifying card…
            </div>
          </div>
        ) : error || !profile ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 0', textAlign: 'center' }}>
            <div style={{ marginBottom: 20 }}>
              <Logo size={30} wordmarkSize={17} />
            </div>
            <div
              style={{
                width: 40, height: 40, borderRadius: '50%', background: 'rgba(224,122,99,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#e07a63', fontSize: 18, marginBottom: 14,
              }}
            >
              !
            </div>
            <p style={{ color: '#F2EEE6', fontSize: 14, marginBottom: 4 }}>Card not recognized</p>
            <p style={{ color: '#8B93B8', fontSize: 12 }}>{error || 'This card may have been deactivated or reissued.'}</p>
          </div>
        ) : (
          <div style={{ animation: 'hq-fade-in 0.3s ease' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#5FAE8F', fontSize: 12, marginBottom: 16 }}>
              <span style={{ display: 'inline-flex', width: 16, height: 16, borderRadius: '50%', background: 'rgba(95,174,143,0.15)', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>✓</span>
              Card verified
            </div>
            <div style={{ background: `${profile.color}1A`, border: `1px solid ${profile.color}55`, borderRadius: 16, padding: 20, marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                {profile.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.photo_url}
                    alt={profile.display_name}
                    style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover', border: `1px solid ${profile.color}66` }}
                  />
                ) : (
                  <div
                    style={{
                      width: 52, height: 52, borderRadius: '50%', background: `${profile.color}33`, color: profile.color,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace', fontSize: 18,
                      border: `1px solid ${profile.color}66`, flexShrink: 0,
                    }}
                  >
                    {(profile.display_name || '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()}
                  </div>
                )}
                <div>
                  <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.15em', color: profile.color, marginBottom: 2 }}>
                    {profile.business}
                  </p>
                  <h2 style={{ fontSize: 18, color: '#F2EEE6', fontWeight: 600 }}>{profile.display_name}</h2>
                </div>
              </div>
              {profile.title && <p style={{ fontSize: 13, color: '#8B93B8', marginBottom: 10 }}>{profile.title}</p>}
              {profile.bio && (
                <p style={{ fontSize: 13, color: '#c9cfe8', lineHeight: 1.5, marginBottom: 14, fontStyle: 'italic' }}>
                  {profile.bio}
                </p>
              )}
              <div style={{ borderTop: `1px solid ${profile.color}33`, paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {profile.phone && (
                  <a href={`tel:${profile.phone}`} style={{ fontSize: 14, color: '#F2EEE6', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: profile.color }}>☎</span> {profile.phone}
                  </a>
                )}
                {profile.email && (
                  <a href={`mailto:${profile.email}`} style={{ fontSize: 14, color: '#F2EEE6', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: profile.color }}>✉</span> {profile.email}
                  </a>
                )}
              </div>
            </div>
            <Button full onClick={saveContact} disabled={savingContact}>
              {savingContact ? <Spinner size={16} /> : 'Save contact'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
