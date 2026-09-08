'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { LoadingScreen, Spinner, expirationBadge } from '@/components/Layout';

type Identity = {
  id: string;
  code: string;
  business: string;
  display_name: string;
  title: string;
  phone: string;
  email: string;
  color: string;
  is_active: boolean;
  photo_url: string | null;
  bio: string | null;
};

type Credential = {
  id: string;
  identity_id: string;
  credential_type: string;
  label: string | null;
  issuing_state: string | null;
  license_or_policy_number: string | null;
  expiration_date: string | null;
  status: string;
  verification_confidence: string | null;
  last_verified_at: string | null;
};

type Grant = {
  id: string;
  client_id: string;
  identity_id: string;
  granted_at: string;
  revoked_at: string | null;
};

const BLANK: Omit<Identity, 'id'> = {
  code: '', business: '', display_name: '', title: '', phone: '', email: '', color: '#2F6F6B',
  is_active: true, photo_url: null, bio: null,
};

const CREDENTIAL_TYPES = [
  { value: 'contractor_license', label: 'Contractor license' },
  { value: 'insurance_coi', label: 'Insurance (COI)' },
  { value: 'bond', label: 'Bond' },
  { value: 'business_license', label: 'Business license' },
  { value: 'background_check', label: 'Background check' },
];

function Avatar({ url, name, size = 40 }: { url: string | null; name: string; size?: number }) {
  const initials = (name || '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={name}
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', border: '1px solid #22305e' }}
      />
    );
  }
  return (
    <div
      style={{
        width: size, height: size, borderRadius: '50%', background: '#2F6F6B33', color: '#5FAE8F',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace',
        fontSize: size * 0.36, border: '1px solid #22305e', flexShrink: 0,
      }}
    >
      {initials}
    </div>
  );
}

function CredentialsSection({ identityId }: { identityId: string }) {
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState({
    credential_type: 'contractor_license',
    label: '',
    issuing_state: '',
    license_or_policy_number: '',
    expiration_date: '',
  });

  useEffect(() => { load(); }, [identityId]);

  async function load() {
    const { data } = await supabase
      .from('credentials')
      .select('*')
      .eq('identity_id', identityId)
      .order('created_at', { ascending: false });
    if (data) setCredentials(data as Credential[]);
  }

  function startEdit(c: Credential) {
    setEditingId(c.id);
    setDraft({
      credential_type: c.credential_type,
      label: c.label || '',
      issuing_state: c.issuing_state || '',
      license_or_policy_number: c.license_or_policy_number || '',
      expiration_date: c.expiration_date || '',
    });
    setAdding(false);
  }

  async function saveCredential() {
    if (editingId) {
      // Editing details resets verification — the previously verified facts no longer necessarily apply
      await supabase.from('credentials').update({
        credential_type: draft.credential_type,
        label: draft.label || null,
        issuing_state: draft.issuing_state || null,
        license_or_policy_number: draft.license_or_policy_number || null,
        expiration_date: draft.expiration_date || null,
        status: 'unverified',
        last_verified_at: null,
        verification_confidence: null,
      }).eq('id', editingId);
    } else {
      await supabase.from('credentials').insert({
        identity_id: identityId,
        credential_type: draft.credential_type,
        label: draft.label || null,
        issuing_state: draft.issuing_state || null,
        license_or_policy_number: draft.license_or_policy_number || null,
        expiration_date: draft.expiration_date || null,
        status: 'unverified',
      });
    }
    setDraft({ credential_type: 'contractor_license', label: '', issuing_state: '', license_or_policy_number: '', expiration_date: '' });
    setAdding(false);
    setEditingId(null);
    await load();
  }

  async function markVerified(id: string) {
    await supabase.from('credentials').update({
      status: 'active',
      last_verified_at: new Date().toISOString(),
      verification_confidence: 'best_effort',
    }).eq('id', id);
    await load();
  }

  async function removeCredential(id: string) {
    await supabase.from('credentials').delete().eq('id', id);
    await load();
  }

  const showForm = adding || editingId;

  return (
    <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #22305e' }}>
      <p style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#8B93B8', marginBottom: 10 }}>
        Credentials
      </p>
      {credentials.length === 0 && !showForm && (
        <p style={{ fontSize: 12, color: '#5c6588', marginBottom: 8 }}>No credentials added yet.</p>
      )}
      {credentials.map((c) => (
        <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #1a2450' }}>
          <div>
            <span style={{ fontSize: 13, color: '#F2EEE6' }}>
              {c.label || CREDENTIAL_TYPES.find((t) => t.value === c.credential_type)?.label || c.credential_type}
            </span>
            {c.label && (
              <span style={{ fontSize: 10, color: '#8B93B8', marginLeft: 6 }}>
                ({CREDENTIAL_TYPES.find((t) => t.value === c.credential_type)?.label || c.credential_type})
              </span>
            )}
            {c.issuing_state && <span style={{ fontSize: 11, color: '#8B93B8', marginLeft: 8 }}>{c.issuing_state}</span>}
            {c.expiration_date && <span style={{ fontSize: 11, color: '#8B93B8', marginLeft: 8 }}>exp {c.expiration_date}</span>}
            {expirationBadge(c.expiration_date) && (
              <span style={{ fontSize: 10.5, marginLeft: 8, padding: '2px 6px', borderRadius: 6, color: expirationBadge(c.expiration_date)!.color, background: expirationBadge(c.expiration_date)!.bg }}>
                {expirationBadge(c.expiration_date)!.text}
              </span>
            )}
            <div style={{ fontSize: 11, marginTop: 3 }}>
              {c.status === 'active' ? (
                <span style={{ color: '#5FAE8F', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ display: 'inline-flex', width: 12, height: 12, borderRadius: '50%', background: 'rgba(95,174,143,0.15)', alignItems: 'center', justifyContent: 'center', fontSize: 8 }}>✓</span>
                  Verified {c.last_verified_at ? new Date(c.last_verified_at).toLocaleDateString() : ''} ({c.verification_confidence || 'best_effort'})
                </span>
              ) : (
                <span style={{ color: '#8B93B8' }}>Unverified</span>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 2 }}>
            {c.status !== 'active' && (
              <Button variant="ghost" style={{ color: '#5FAE8F' }} onClick={() => markVerified(c.id)}>Mark verified</Button>
            )}
            <Button variant="ghost" onClick={() => startEdit(c)}>Edit</Button>
            <Button variant="ghost" onClick={() => removeCredential(c.id)}>Remove</Button>
          </div>
        </div>
      ))}

      {showForm ? (
        <div style={{ marginTop: 10 }}>
          {editingId && (
            <p style={{ fontSize: 11, color: '#e07a63', marginBottom: 6 }}>
              Editing will reset this credential to unverified — re-confirm it once saved.
            </p>
          )}
          <select
            value={draft.credential_type}
            onChange={(e) => setDraft({ ...draft, credential_type: e.target.value })}
            style={{ width: '100%', padding: 8, marginBottom: 6, borderRadius: 8, border: '1px solid #22305e', background: '#0A1330', color: '#F2EEE6' }}
          >
            {CREDENTIAL_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <input
            placeholder="Label (optional — e.g. 'General Liability — Carrier A')"
            value={draft.label}
            onChange={(e) => setDraft({ ...draft, label: e.target.value })}
            style={{ width: '100%', padding: 8, marginBottom: 6, borderRadius: 8, border: '1px solid #22305e', background: '#0A1330', color: '#F2EEE6' }}
          />
          <input
            placeholder="Issuing state (e.g. OR)"
            value={draft.issuing_state}
            onChange={(e) => setDraft({ ...draft, issuing_state: e.target.value })}
            style={{ width: '100%', padding: 8, marginBottom: 6, borderRadius: 8, border: '1px solid #22305e', background: '#0A1330', color: '#F2EEE6' }}
          />
          <input
            placeholder="License / policy number"
            value={draft.license_or_policy_number}
            onChange={(e) => setDraft({ ...draft, license_or_policy_number: e.target.value })}
            style={{ width: '100%', padding: 8, marginBottom: 6, borderRadius: 8, border: '1px solid #22305e', background: '#0A1330', color: '#F2EEE6' }}
          />
          <input
            type="date"
            placeholder="Expiration date"
            value={draft.expiration_date}
            onChange={(e) => setDraft({ ...draft, expiration_date: e.target.value })}
            style={{ width: '100%', padding: 8, marginBottom: 8, borderRadius: 8, border: '1px solid #22305e', background: '#0A1330', color: '#F2EEE6' }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={saveCredential} style={{ flex: 1, padding: 8, borderRadius: 8, border: 'none', background: '#5AA7FF', color: '#0A1330', fontWeight: 600, cursor: 'pointer', fontSize: 12 }}>
              {editingId ? 'Save changes' : 'Add'}
            </button>
            <button
              onClick={() => { setAdding(false); setEditingId(null); }}
              style={{ flex: 1, padding: 8, borderRadius: 8, border: '1px solid #22305e', background: 'none', color: '#F2EEE6', cursor: 'pointer', fontSize: 12 }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAdding(true)} style={{ marginTop: 8, background: 'none', border: '1px dashed #22305e', color: '#5AA7FF', fontSize: 12, padding: 8, borderRadius: 8, width: '100%', cursor: 'pointer' }}>
          + Add credential
        </button>
      )}
    </div>
  );
}

function AccessLogSection({ identityId }: { identityId: string }) {
  const [logs, setLogs] = useState<{ id: string; accessed_at: string; success: boolean }[]>([]);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('access_logs')
        .select('id, accessed_at, success')
        .eq('identity_id', identityId)
        .order('accessed_at', { ascending: false })
        .limit(10);
      if (data) setLogs(data);
    })();
  }, [identityId]);

  if (logs.length === 0) return null;

  return (
    <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #22305e' }}>
      <button
        onClick={() => setExpanded(!expanded)}
        style={{ background: 'none', border: 'none', color: '#8B93B8', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', cursor: 'pointer', padding: 0 }}
      >
        Recent scan activity ({logs.length}) {expanded ? '▲' : '▼'}
      </button>
      {expanded && (
        <div style={{ marginTop: 10 }}>
          {logs.map((l) => (
            <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '4px 0', color: '#8B93B8' }}>
              <span>{new Date(l.accessed_at).toLocaleString()}</span>
              <span style={{ color: l.success ? '#5FAE8F' : '#e07a63' }}>{l.success ? 'Unlocked' : 'Failed attempt'}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

type RecipientCode = {
  id: string;
  code: string;
  label: string | null;
  is_active: boolean;
  revoked_at: string | null;
  last_used_at: string | null;
};

function RecipientCodesSection({ identityId }: { identityId: string }) {
  const [codes, setCodes] = useState<RecipientCode[]>([]);
  const [adding, setAdding] = useState(false);
  const [draftCode, setDraftCode] = useState('');
  const [draftLabel, setDraftLabel] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { load(); }, [identityId]);

  async function load() {
    const { data } = await supabase.from('identity_codes').select('*').eq('identity_id', identityId).order('created_at', { ascending: false });
    if (data) setCodes(data as RecipientCode[]);
  }

  async function addCode() {
    setError(null);
    if (!/^\d{4}$/.test(draftCode)) { setError('Code must be exactly 4 digits'); return; }
    const { error } = await supabase.from('identity_codes').insert({
      identity_id: identityId, code: draftCode, label: draftLabel || null,
    });
    if (error) { setError(error.message); return; }
    setDraftCode('');
    setDraftLabel('');
    setAdding(false);
    await load();
  }

  async function revokeCode(id: string) {
    await supabase.from('identity_codes').update({ is_active: false, revoked_at: new Date().toISOString() }).eq('id', id);
    await load();
  }

  async function deleteCode(id: string) {
    await supabase.from('identity_codes').delete().eq('id', id);
    await load();
  }

  const active = codes.filter((c) => c.is_active);
  const revoked = codes.filter((c) => !c.is_active);

  return (
    <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #22305e' }}>
      <p style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#8B93B8', marginBottom: 4 }}>
        Recipient codes ({active.length})
      </p>
      <p style={{ fontSize: 11, color: '#5c6588', marginBottom: 10 }}>
        Give a separate code to each person instead of sharing your main one — revoking it later won&apos;t affect anyone else.
      </p>
      {active.map((c) => (
        <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', fontSize: 12 }}>
          <div>
            <span style={{ fontFamily: 'monospace', color: '#5AA7FF' }}>{c.code}</span>
            <span style={{ marginLeft: 8, color: '#F2EEE6' }}>{c.label || 'Unlabeled'}</span>
            {c.last_used_at && <span style={{ marginLeft: 8, fontSize: 10.5, color: '#5c6588' }}>used {new Date(c.last_used_at).toLocaleDateString()}</span>}
          </div>
          <Button variant="danger" onClick={() => revokeCode(c.id)}>Revoke</Button>
        </div>
      ))}
      {revoked.length > 0 && (
        <details style={{ marginTop: 8 }}>
          <summary style={{ fontSize: 11, color: '#5c6588', cursor: 'pointer' }}>{revoked.length} revoked</summary>
          {revoked.map((c) => (
            <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', fontSize: 11, color: '#5c6588' }}>
              <span>{c.code} — {c.label || 'Unlabeled'} (revoked {c.revoked_at ? new Date(c.revoked_at).toLocaleDateString() : ''})</span>
              <Button variant="ghost" onClick={() => deleteCode(c.id)}>Delete</Button>
            </div>
          ))}
        </details>
      )}
      {adding ? (
        <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
          <input
            placeholder="4-digit code"
            value={draftCode}
            onChange={(e) => setDraftCode(e.target.value)}
            maxLength={4}
            style={{ width: 90, padding: 8, borderRadius: 8, border: '1px solid #22305e', background: '#0A1330', color: '#F2EEE6', fontSize: 12 }}
          />
          <input
            placeholder="Label (e.g. Maria - Northgate)"
            value={draftLabel}
            onChange={(e) => setDraftLabel(e.target.value)}
            style={{ flex: 1, padding: 8, borderRadius: 8, border: '1px solid #22305e', background: '#0A1330', color: '#F2EEE6', fontSize: 12 }}
          />
          <Button onClick={addCode} style={{ fontSize: 12, padding: '8px 12px' }}>Add</Button>
          <Button variant="secondary" onClick={() => { setAdding(false); setError(null); }} style={{ fontSize: 12, padding: '8px 12px' }}>Cancel</Button>
        </div>
      ) : (
        <button onClick={() => setAdding(true)} style={{ marginTop: 8, background: 'none', border: '1px dashed #22305e', color: '#5AA7FF', fontSize: 11, padding: 7, borderRadius: 8, width: '100%', cursor: 'pointer' }}>
          + Give someone their own code
        </button>
      )}
      {error && <p style={{ color: '#e07a63', fontSize: 11, marginTop: 4 }}>{error}</p>}
    </div>
  );
}

function GrantsSection({ identityId }: { identityId: string }) {
  const [grants, setGrants] = useState<Grant[]>([]);
  const [clientNames, setClientNames] = useState<Record<string, string>>({});
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ id: string; company_name: string }[]>([]);
  const [manualId, setManualId] = useState('');
  const [showManual, setShowManual] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { load(); }, [identityId]);

  useEffect(() => {
    const t = setTimeout(async () => {
      if (query.trim().length < 2) { setResults([]); return; }
      const { data } = await supabase
        .from('clients')
        .select('id, company_name')
        .ilike('company_name', `%${query.trim()}%`)
        .limit(5);
      setResults(data || []);
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  async function load() {
    const { data } = await supabase.from('vendor_grants').select('*').eq('identity_id', identityId);
    if (data) {
      setGrants(data as Grant[]);
      const ids = (data as Grant[]).filter((g) => !g.revoked_at).map((g) => g.client_id);
      if (ids.length) {
        const { data: clients } = await supabase.from('clients').select('id, company_name').in('id', ids);
        const names: Record<string, string> = {};
        (clients || []).forEach((c) => { names[c.id] = c.company_name; });
        setClientNames(names);
      }
    }
  }

  async function grantTo(clientId: string) {
    setError(null);
    const { error } = await supabase.from('vendor_grants').insert({ identity_id: identityId, client_id: clientId });
    if (error) { setError('Could not grant access — check the ID and try again'); return; }
    setQuery('');
    setResults([]);
    setManualId('');
    setShowManual(false);
    await load();
  }

  async function revokeGrant(id: string) {
    await supabase.from('vendor_grants').update({ revoked_at: new Date().toISOString() }).eq('id', id);
    await load();
  }

  const active = grants.filter((g) => !g.revoked_at);

  return (
    <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #22305e' }}>
      <p style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#8B93B8', marginBottom: 10 }}>
        Clients with standing access ({active.length})
      </p>
      {active.map((g) => (
        <div key={g.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', fontSize: 12 }}>
          <span style={{ color: '#F2EEE6' }}>{clientNames[g.client_id] || `${g.client_id.slice(0, 8)}… (not searchable)`}</span>
          <button onClick={() => revokeGrant(g.id)} style={{ background: 'none', border: 'none', color: '#c96b56', cursor: 'pointer', fontSize: 12 }}>
            Revoke
          </button>
        </div>
      ))}

      <div style={{ position: 'relative', marginTop: 8 }}>
        <input
          placeholder="Search for a client by company name"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid #22305e', background: '#0A1330', color: '#F2EEE6', fontSize: 12 }}
        />
        {results.length > 0 && (
          <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#111a3d', border: '1px solid #22305e', borderRadius: 8, marginTop: 4, zIndex: 10 }}>
            {results.map((r) => (
              <button
                key={r.id}
                onClick={() => grantTo(r.id)}
                style={{ display: 'block', width: '100%', textAlign: 'left', padding: 10, background: 'none', border: 'none', color: '#F2EEE6', cursor: 'pointer', fontSize: 12 }}
              >
                {r.company_name}
              </button>
            ))}
          </div>
        )}
      </div>

      {showManual ? (
        <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
          <input
            placeholder="Paste client ID directly"
            value={manualId}
            onChange={(e) => setManualId(e.target.value)}
            style={{ flex: 1, padding: 8, borderRadius: 8, border: '1px solid #22305e', background: '#0A1330', color: '#F2EEE6', fontSize: 12 }}
          />
          <button onClick={() => grantTo(manualId.trim())} style={{ padding: '8px 12px', borderRadius: 8, border: 'none', background: '#5AA7FF', color: '#0A1330', fontWeight: 600, cursor: 'pointer', fontSize: 12 }}>
            Grant
          </button>
        </div>
      ) : (
        <button onClick={() => setShowManual(true)} style={{ marginTop: 8, background: 'none', border: 'none', color: '#8B93B8', fontSize: 11, cursor: 'pointer', textDecoration: 'underline' }}>
          Client not showing up? Paste their ID directly
        </button>
      )}
      {error && <p style={{ color: '#c96b56', fontSize: 11, marginTop: 4 }}>{error}</p>}
    </div>
  );
}

export default function Dashboard() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [identities, setIdentities] = useState<Identity[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Identity | (Omit<Identity, 'id'> & { id?: undefined }) | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }
      setUserId(session.user.id);
      await recordConsentIfNeeded(session.user.id);
      await loadIdentities();
      setLoading(false);
    })();
  }, [router]);

  async function recordConsentIfNeeded(uid: string) {
    const { data: existing } = await supabase.from('consents').select('id').eq('user_id', uid).limit(1);
    if (existing && existing.length > 0) return;
    await supabase.from('consents').insert({ user_id: uid, terms_version: '2026-09', account_type: 'contractor' });
  }

  async function loadIdentities() {
    const { data } = await supabase.from('identities').select('*').order('created_at');
    if (data) setIdentities(data as Identity[]);
  }

  function photoPathFromUrl(url: string): string | null {
    const marker = '/identity-photos/';
    const idx = url.indexOf(marker);
    if (idx === -1) return null;
    return url.slice(idx + marker.length);
  }

  async function uploadPhoto(file: File) {
    if (!userId || !editing) return;
    setUploadError(null);

    if (!file.type.startsWith('image/')) {
      setUploadError('Please choose an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Image must be under 5MB');
      return;
    }

    setUploading(true);
    const oldPath = editing.photo_url ? photoPathFromUrl(editing.photo_url) : null;
    const ext = file.name.split('.').pop();
    const path = `${userId}/${Date.now()}.${ext}`;

    const { error: uploadErr } = await supabase.storage.from('identity-photos').upload(path, file, {
      upsert: true,
    });

    if (uploadErr) {
      setUploadError(uploadErr.message);
      setUploading(false);
      return;
    }

    if (oldPath) {
      await supabase.storage.from('identity-photos').remove([oldPath]);
    }

    const { data } = supabase.storage.from('identity-photos').getPublicUrl(path);
    setEditing({ ...editing, photo_url: data.publicUrl });
    setUploading(false);
  }

  async function removePhoto() {
    if (!editing?.photo_url) return;
    const oldPath = photoPathFromUrl(editing.photo_url);
    if (oldPath) {
      await supabase.storage.from('identity-photos').remove([oldPath]);
    }
    setEditing({ ...editing, photo_url: null });
  }

  async function save() {
    if (!editing) return;
    setSaveError(null);

    if (!/^\d{4}$/.test(editing.code)) {
      setSaveError('Code must be exactly 4 digits');
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    if ('id' in editing && editing.id) {
      const { error } = await supabase.from('identities').update(editing).eq('id', editing.id);
      if (error) { setSaveError(error.message); return; }
    } else {
      const { error } = await supabase.from('identities').insert({ ...editing, owner_id: user.id });
      if (error) { setSaveError(error.message); return; }
    }
    setEditing(null);
    setUploadError(null);
    await loadIdentities();
  }

  async function revoke(id: string) {
    await supabase.from('identities').update({ is_active: false }).eq('id', id);
    await loadIdentities();
  }

  async function reactivate(id: string) {
    await supabase.from('identities').update({ is_active: true }).eq('id', id);
    await loadIdentities();
  }

  async function remove(id: string) {
    await supabase.from('identities').delete().eq('id', id);
    await loadIdentities();
  }

  async function logout() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  async function downloadMyData() {
    const { data: creds } = await supabase
      .from('credentials')
      .select('*')
      .in('identity_id', identities.map((i) => i.id));
    const { data: grants } = await supabase
      .from('vendor_grants')
      .select('*')
      .in('identity_id', identities.map((i) => i.id));

    const bundle = {
      exported_at: new Date().toISOString(),
      identities,
      credentials: creds || [],
      grants_issued: grants || [],
    };

    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `halqen-data-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return <LoadingScreen label="Loading your identities…" />;
  }

  return (
    <div style={{ background: 'radial-gradient(circle at 20% 0%, #16204f 0%, #0A1330 45%)', minHeight: '100vh', color: '#F2EEE6', fontFamily: 'Inter, sans-serif', padding: 24 }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
          <Logo size={30} wordmarkSize={18} />
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <a href="/company-dashboard" style={{ color: '#5AA7FF', fontSize: 13, textDecoration: 'none', marginRight: 8 }}>Manage a company →</a>
            <Button variant="ghost" onClick={downloadMyData}>Download my data</Button>
            <Button variant="ghost" onClick={logout}>Log out</Button>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 20 }}>
          <h1 style={{ fontSize: 22, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700 }}>Your identities</h1>
          <span style={{ fontSize: 12, color: '#8B93B8' }}>{identities.length} of 5 used</span>
        </div>

        {identities.length === 0 && (
          <div style={{ background: '#111a3d', border: '1px dashed #22305e', borderRadius: 16, padding: 32, textAlign: 'center', marginBottom: 16, animation: 'hq-fade-in 0.3s ease' }}>
            <p style={{ color: '#8B93B8', fontSize: 14, marginBottom: 4 }}>No identities yet</p>
            <p style={{ color: '#5c6588', fontSize: 12 }}>Add your first one below to start using your card.</p>
          </div>
        )}

        {identities.map((id) => (
          <div
            key={id.id}
            style={{
              background: '#111a3d', border: '1px solid #22305e', borderRadius: 16, padding: 18, marginBottom: 12,
              opacity: id.is_active ? 1 : 0.55, transition: 'border-color 0.15s ease', animation: 'hq-fade-in 0.3s ease',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Avatar url={id.photo_url} name={id.display_name || id.business} size={38} />
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontFamily: 'monospace', color: '#5AA7FF', fontSize: 13, background: 'rgba(90,167,255,0.1)', padding: '2px 8px', borderRadius: 6 }}>{id.code}</span>
                    {!id.is_active && <span style={{ color: '#e07a63', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Revoked</span>}
                  </div>
                  <p style={{ fontSize: 14, marginTop: 4 }}>{id.business}</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                <Button variant="ghost" onClick={() => setEditing(id)}>Edit</Button>
                {id.is_active ? (
                  <Button variant="danger" onClick={() => revoke(id.id)}>Revoke</Button>
                ) : (
                  <Button variant="ghost" style={{ color: '#5FAE8F' }} onClick={() => reactivate(id.id)}>Reactivate</Button>
                )}
                <Button variant="ghost" onClick={() => remove(id.id)}>Delete</Button>
              </div>
            </div>
            <CredentialsSection identityId={id.id} />
            <RecipientCodesSection identityId={id.id} />
            <GrantsSection identityId={id.id} />
            <AccessLogSection identityId={id.id} />
          </div>
        ))}

        {identities.length < 5 && !editing && (
          <Button
            variant="secondary"
            full
            onClick={() => setEditing({ ...BLANK })}
            style={{ borderStyle: 'dashed', color: '#5AA7FF' }}
          >
            + Add identity
          </Button>
        )}

        {editing && (
          <div style={{ background: '#111a3d', border: '1px solid #22305e', borderRadius: 16, padding: 22, marginTop: 16, animation: 'hq-fade-in 0.3s ease' }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16, fontFamily: "'Space Grotesk', sans-serif" }}>
              {'id' in editing && editing.id ? 'Edit identity' : 'New identity'}
            </h2>
            {saveError && <p style={{ color: '#e07a63', fontSize: 12, marginBottom: 12 }}>{saveError}</p>}

            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18, flexWrap: 'wrap' }}>
              <Avatar url={editing.photo_url} name={editing.display_name || editing.business} size={52} />
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <label style={{ fontSize: 12, padding: '9px 14px', borderRadius: 10, border: '1px solid #22305e', color: '#8B93B8', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  {uploading && <Spinner size={12} />}
                  {uploading ? 'Uploading…' : editing.photo_url ? 'Change photo' : 'Add photo'}
                  <input
                    type="file"
                    accept="image/*"
                    disabled={uploading}
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadPhoto(f); }}
                    style={{ display: 'none' }}
                  />
                </label>
                {editing.photo_url && !uploading && (
                  <Button variant="ghost" onClick={removePhoto}>Remove</Button>
                )}
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#8B93B8', cursor: 'pointer' }}>
                Accent color
                <input
                  type="color"
                  value={editing.color || '#2F6F6B'}
                  onChange={(e) => setEditing({ ...editing, color: e.target.value })}
                  style={{ width: 32, height: 32, padding: 0, border: '1px solid #22305e', borderRadius: 8, cursor: 'pointer', background: 'none' }}
                />
              </label>
            </div>
            {uploadError && <p style={{ color: '#e07a63', fontSize: 12, marginBottom: 12 }}>{uploadError}</p>}

            {(
              [
                ['code', 'Code (4 digits)'],
                ['business', 'Business name'],
                ['display_name', 'Your name'],
                ['title', 'Title'],
                ['phone', 'Phone'],
                ['email', 'Email'],
              ] as [keyof typeof BLANK, string][]
            ).map(([field, label]) => (
              <Input
                key={field}
                placeholder={label}
                value={editing[field] as string || ''}
                onChange={(e) => setEditing({ ...editing, [field]: e.target.value })}
              />
            ))}
            <textarea
              placeholder="Short bio (optional) — shown to anyone who scans this identity"
              value={editing.bio || ''}
              onChange={(e) => setEditing({ ...editing, bio: e.target.value })}
              rows={3}
              maxLength={280}
              style={{ width: '100%', padding: 10, marginBottom: 8, borderRadius: 8, border: '1px solid #22305e', background: '#0A1330', color: '#F2EEE6', fontFamily: 'inherit', fontSize: 14, resize: 'vertical' }}
            />
            <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
              <Button full onClick={save} disabled={uploading}>Save</Button>
              <Button full variant="secondary" onClick={() => { setEditing(null); setUploadError(null); }}>Cancel</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
