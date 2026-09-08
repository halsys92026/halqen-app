'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { LoadingScreen } from '@/components/Layout';

type ClientAccount = {
  id: string;
  company_name: string;
  discoverable: boolean;
};

type GrantedIdentity = {
  id: string;
  business: string;
  display_name: string;
  title: string;
  phone: string;
  email: string;
  photo_url: string | null;
};

type Credential = {
  id: string;
  identity_id: string;
  credential_type: string;
  label: string | null;
  status: string;
  expiration_date: string | null;
  last_verified_at: string | null;
  verification_confidence: string | null;
};

const CREDENTIAL_LABELS: Record<string, string> = {
  contractor_license: 'Contractor license',
  insurance_coi: 'Insurance',
  bond: 'Bond',
  business_license: 'Business license',
  background_check: 'Background check',
};

function VendorAvatar({ url, name, size = 44 }: { url: string | null; name: string; size?: number }) {
  const initials = (name || '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={name} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', border: '1px solid #22305e' }} />;
  }
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: '#2F6F6B33', color: '#5FAE8F', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace', fontSize: size * 0.36, border: '1px solid #22305e', flexShrink: 0 }}>
      {initials}
    </div>
  );
}

export default function ClientDashboard() {
  const router = useRouter();
  const [client, setClient] = useState<ClientAccount | null>(null);
  const [companyNameInput, setCompanyNameInput] = useState('');
  const [vendors, setVendors] = useState<GrantedIdentity[]>([]);
  const [credentialsByIdentity, setCredentialsByIdentity] = useState<Record<string, Credential[]>>({});
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  async function loadVendors(clientId: string) {
    const { data: grants } = await supabase
      .from('vendor_grants')
      .select('identity_id')
      .eq('client_id', clientId)
      .is('revoked_at', null);

    if (!grants || grants.length === 0) {
      setVendors([]);
      return;
    }

    const identityIds = grants.map((g) => g.identity_id);
    const { data: identities } = await supabase.from('identities').select('*').in('id', identityIds);
    if (identities) setVendors(identities as GrantedIdentity[]);

    const { data: creds } = await supabase.from('credentials').select('*').in('identity_id', identityIds);
    if (creds) {
      const grouped: Record<string, Credential[]> = {};
      for (const c of creds as Credential[]) {
        grouped[c.identity_id] = grouped[c.identity_id] || [];
        grouped[c.identity_id].push(c);
      }
      setCredentialsByIdentity(grouped);
    }
  }

  async function loadClient() {
    const { data } = await supabase.from('clients').select('*').limit(1).maybeSingle();
    if (data) {
      setClient(data as ClientAccount);
      await loadVendors((data as ClientAccount).id);
    }
  }

  async function recordConsentIfNeeded(uid: string) {
    const { data: existing } = await supabase.from('consents').select('id').eq('user_id', uid).limit(1);
    if (existing && existing.length > 0) return;
    await supabase.from('consents').insert({ user_id: uid, terms_version: '2026-09', account_type: 'client' });
  }

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/client-login');
        return;
      }
      await recordConsentIfNeeded(session.user.id);
      await loadClient();
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  async function createClientAccount() {
    if (!companyNameInput.trim()) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await supabase
      .from('clients')
      .insert({ owner_id: user.id, company_name: companyNameInput.trim() })
      .select()
      .single();
    if (!error && data) {
      setClient(data as ClientAccount);
    }
  }

  async function toggleDiscoverable() {
    if (!client) return;
    const next = !client.discoverable;
    await supabase.from('clients').update({ discoverable: next }).eq('id', client.id);
    setClient({ ...client, discoverable: next });
  }

  function copyClientId() {
    if (!client) return;
    navigator.clipboard.writeText(client.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function logout() {
    await supabase.auth.signOut();
    router.push('/client-login');
  }

  if (loading) {
    return <LoadingScreen label="Loading your account…" />;
  }

  return (
    <div style={{ background: 'radial-gradient(circle at 20% 0%, #16204f 0%, #0A1330 45%)', minHeight: '100vh', color: '#F2EEE6', fontFamily: 'Inter, sans-serif', padding: 24 }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
          <Logo size={30} wordmarkSize={18} />
          {client && <Button variant="ghost" onClick={logout}>Log out</Button>}
        </div>

        {!client ? (
          <div style={{ background: '#111a3d', border: '1px solid #22305e', borderRadius: 16, padding: 24, animation: 'hq-fade-in 0.3s ease' }}>
            <h1 style={{ fontSize: 18, marginBottom: 8, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700 }}>Set up your client account</h1>
            <p style={{ color: '#8B93B8', fontSize: 13, marginBottom: 16 }}>
              Enter your company name to get your own Client ID — share it with vendors so they can grant you standing access.
            </p>
            <Input
              placeholder="Company name"
              value={companyNameInput}
              onChange={(e) => setCompanyNameInput(e.target.value)}
            />
            <Button full onClick={createClientAccount}>Create account</Button>
          </div>
        ) : (
          <>
            <h1 style={{ fontSize: 22, marginBottom: 20, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700 }}>
              {client.company_name}
            </h1>

            <div style={{ background: '#111a3d', border: '1px solid #22305e', borderRadius: 16, padding: 18, marginBottom: 24, animation: 'hq-fade-in 0.3s ease' }}>
              <p style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#8B93B8', marginBottom: 10 }}>
                Your Client ID — share this with vendors
              </p>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <code style={{ flex: 1, fontSize: 12, color: '#5AA7FF', background: '#0A1330', padding: 12, borderRadius: 10, wordBreak: 'break-all', border: '1px solid #22305e' }}>
                  {client.id}
                </code>
                <Button variant="secondary" onClick={copyClientId} style={{ minWidth: 78 }}>
                  {copied ? '✓ Copied' : 'Copy'}
                </Button>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, fontSize: 12, color: '#8B93B8', cursor: 'pointer' }}>
                <input type="checkbox" checked={client.discoverable} onChange={toggleDiscoverable} />
                Let vendors find {client.company_name} by searching your company name
              </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
              <h2 style={{ fontSize: 15, fontWeight: 600 }}>Vendors with standing access</h2>
              <span style={{ fontSize: 12, color: '#8B93B8' }}>{vendors.length} total</span>
            </div>

            {vendors.length === 0 && (
              <div style={{ background: '#111a3d', border: '1px dashed #22305e', borderRadius: 16, padding: 28, textAlign: 'center', animation: 'hq-fade-in 0.3s ease' }}>
                <p style={{ color: '#8B93B8', fontSize: 13, marginBottom: 4 }}>No vendors yet</p>
                <p style={{ color: '#5c6588', fontSize: 12 }}>Share your Client ID above with a contractor and ask them to grant you access from their dashboard.</p>
              </div>
            )}

            {vendors.map((v) => (
              <div key={v.id} style={{ background: '#111a3d', border: '1px solid #22305e', borderRadius: 16, padding: 18, marginBottom: 12, animation: 'hq-fade-in 0.3s ease' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <VendorAvatar url={v.photo_url} name={v.display_name || v.business} />
                  <div>
                    <p style={{ fontSize: 15, fontWeight: 600 }}>{v.display_name || v.business}</p>
                    <p style={{ fontSize: 12, color: '#8B93B8' }}>{v.business}</p>
                  </div>
                </div>
                {(credentialsByIdentity[v.id] || []).length === 0 ? (
                  <p style={{ fontSize: 12, color: '#5c6588' }}>No credentials on file yet.</p>
                ) : (
                  <div style={{ borderTop: '1px solid #1a2450', paddingTop: 10 }}>
                    {(credentialsByIdentity[v.id] || []).map((c) => (
                      <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '5px 0' }}>
                        <span>{c.label || CREDENTIAL_LABELS[c.credential_type] || c.credential_type}</span>
                        {c.status === 'active' ? (
                          <span style={{ color: '#5FAE8F', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <span style={{ display: 'inline-flex', width: 12, height: 12, borderRadius: '50%', background: 'rgba(95,174,143,0.15)', alignItems: 'center', justifyContent: 'center', fontSize: 8 }}>✓</span>
                            Verified {c.last_verified_at ? new Date(c.last_verified_at).toLocaleDateString() : ''}
                          </span>
                        ) : (
                          <span style={{ color: '#8B93B8' }}>Unverified</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
