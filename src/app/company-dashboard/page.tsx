'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { LoadingScreen, Spinner, expirationBadge } from '@/components/Layout';

type Company = {
  id: string;
  company_name: string;
  brand_color: string;
};

type Employee = {
  id: string;
  code: string;
  name: string;
  role: string;
  phone: string;
  email: string;
  color: string;
  photo_url: string | null;
  employment_status: string;
};

type Credential = {
  id: string;
  employee_id: string;
  credential_type: string;
  label: string | null;
  issuing_state: string | null;
  license_or_policy_number: string | null;
  expiration_date: string | null;
  status: string;
  verification_confidence: string | null;
  last_verified_at: string | null;
};

const CREDENTIAL_TYPES = [
  { value: 'contractor_license', label: 'Contractor license' },
  { value: 'insurance_coi', label: 'Insurance (COI)' },
  { value: 'bond', label: 'Bond' },
  { value: 'business_license', label: 'Business license' },
  { value: 'background_check', label: 'Background check' },
];

const BLANK_EMPLOYEE: Omit<Employee, 'id'> = {
  code: '', name: '', role: '', phone: '', email: '', color: '#2F6F6B', photo_url: null, employment_status: 'active',
};

function Avatar({ url, name, size = 40 }: { url: string | null; name: string; size?: number }) {
  const initials = (name || '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={url} alt={name} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', border: '1px solid #22305e' }} />
    );
  }
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: '#2F6F6B33', color: '#5FAE8F', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace', fontSize: size * 0.36, border: '1px solid #22305e', flexShrink: 0 }}>
      {initials}
    </div>
  );
}

function EmployeeCredentialsSection({ employeeId }: { employeeId: string }) {
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState({
    credential_type: 'contractor_license', label: '', issuing_state: '', license_or_policy_number: '', expiration_date: '',
  });

  useEffect(() => { load(); }, [employeeId]);

  async function load() {
    const { data } = await supabase.from('credentials').select('*').eq('employee_id', employeeId).order('created_at', { ascending: false });
    if (data) setCredentials(data as Credential[]);
  }

  function startEdit(c: Credential) {
    setEditingId(c.id);
    setDraft({
      credential_type: c.credential_type, label: c.label || '', issuing_state: c.issuing_state || '',
      license_or_policy_number: c.license_or_policy_number || '', expiration_date: c.expiration_date || '',
    });
    setAdding(false);
  }

  async function saveCredential() {
    if (editingId) {
      await supabase.from('credentials').update({
        credential_type: draft.credential_type, label: draft.label || null, issuing_state: draft.issuing_state || null,
        license_or_policy_number: draft.license_or_policy_number || null, expiration_date: draft.expiration_date || null,
        status: 'unverified', last_verified_at: null, verification_confidence: null,
      }).eq('id', editingId);
    } else {
      await supabase.from('credentials').insert({
        employee_id: employeeId, credential_type: draft.credential_type, label: draft.label || null,
        issuing_state: draft.issuing_state || null, license_or_policy_number: draft.license_or_policy_number || null,
        expiration_date: draft.expiration_date || null, status: 'unverified',
      });
    }
    setDraft({ credential_type: 'contractor_license', label: '', issuing_state: '', license_or_policy_number: '', expiration_date: '' });
    setAdding(false);
    setEditingId(null);
    await load();
  }

  async function markVerified(id: string) {
    await supabase.from('credentials').update({ status: 'active', last_verified_at: new Date().toISOString(), verification_confidence: 'best_effort' }).eq('id', id);
    await load();
  }

  async function removeCredential(id: string) {
    await supabase.from('credentials').delete().eq('id', id);
    await load();
  }

  const showForm = adding || editingId;

  return (
    <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #22305e' }}>
      <p style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#8B93B8', marginBottom: 8 }}>Credentials</p>
      {credentials.length === 0 && !showForm && <p style={{ fontSize: 12, color: '#5c6588', marginBottom: 8 }}>No credentials added yet.</p>}
      {credentials.map((c) => (
        <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid #1a2450' }}>
          <div>
            <span style={{ fontSize: 12.5, color: '#F2EEE6' }}>{c.label || CREDENTIAL_TYPES.find((t) => t.value === c.credential_type)?.label || c.credential_type}</span>
            {c.expiration_date && <span style={{ fontSize: 10.5, color: '#8B93B8', marginLeft: 6 }}>exp {c.expiration_date}</span>}
            {expirationBadge(c.expiration_date) && (
              <span style={{ fontSize: 10, marginLeft: 6, padding: '1px 5px', borderRadius: 6, color: expirationBadge(c.expiration_date)!.color, background: expirationBadge(c.expiration_date)!.bg }}>
                {expirationBadge(c.expiration_date)!.text}
              </span>
            )}
            <div style={{ fontSize: 10.5, marginTop: 2 }}>
              {c.status === 'active' ? <span style={{ color: '#5FAE8F' }}>✓ Verified {c.last_verified_at ? new Date(c.last_verified_at).toLocaleDateString() : ''}</span> : <span style={{ color: '#8B93B8' }}>Unverified</span>}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {c.status !== 'active' && <Button variant="ghost" style={{ color: '#5FAE8F', fontSize: 11 }} onClick={() => markVerified(c.id)}>Verify</Button>}
            <Button variant="ghost" style={{ fontSize: 11 }} onClick={() => startEdit(c)}>Edit</Button>
            <Button variant="ghost" style={{ fontSize: 11 }} onClick={() => removeCredential(c.id)}>Remove</Button>
          </div>
        </div>
      ))}
      {showForm ? (
        <div style={{ marginTop: 8 }}>
          <select value={draft.credential_type} onChange={(e) => setDraft({ ...draft, credential_type: e.target.value })}
            style={{ width: '100%', padding: 7, marginBottom: 6, borderRadius: 8, border: '1px solid #22305e', background: '#0A1330', color: '#F2EEE6', fontSize: 12 }}>
            {CREDENTIAL_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <input placeholder="Label (optional)" value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })}
            style={{ width: '100%', padding: 7, marginBottom: 6, borderRadius: 8, border: '1px solid #22305e', background: '#0A1330', color: '#F2EEE6', fontSize: 12 }} />
          <input placeholder="Issuing state" value={draft.issuing_state} onChange={(e) => setDraft({ ...draft, issuing_state: e.target.value })}
            style={{ width: '100%', padding: 7, marginBottom: 6, borderRadius: 8, border: '1px solid #22305e', background: '#0A1330', color: '#F2EEE6', fontSize: 12 }} />
          <input placeholder="License / policy number" value={draft.license_or_policy_number} onChange={(e) => setDraft({ ...draft, license_or_policy_number: e.target.value })}
            style={{ width: '100%', padding: 7, marginBottom: 6, borderRadius: 8, border: '1px solid #22305e', background: '#0A1330', color: '#F2EEE6', fontSize: 12 }} />
          <input type="date" value={draft.expiration_date} onChange={(e) => setDraft({ ...draft, expiration_date: e.target.value })}
            style={{ width: '100%', padding: 7, marginBottom: 8, borderRadius: 8, border: '1px solid #22305e', background: '#0A1330', color: '#F2EEE6', fontSize: 12 }} />
          <div style={{ display: 'flex', gap: 6 }}>
            <Button onClick={saveCredential} style={{ flex: 1, fontSize: 12, padding: 8 }}>{editingId ? 'Save' : 'Add'}</Button>
            <Button variant="secondary" onClick={() => { setAdding(false); setEditingId(null); }} style={{ flex: 1, fontSize: 12, padding: 8 }}>Cancel</Button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAdding(true)} style={{ marginTop: 6, background: 'none', border: '1px dashed #22305e', color: '#5AA7FF', fontSize: 11, padding: 7, borderRadius: 8, width: '100%', cursor: 'pointer' }}>
          + Add credential
        </button>
      )}
    </div>
  );
}

export default function CompanyDashboard() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [companyNameInput, setCompanyNameInput] = useState('');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Employee | (Omit<Employee, 'id'> & { id?: undefined }) | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  async function loadEmployees(companyId: string) {
    const { data } = await supabase.from('employees').select('*').eq('company_id', companyId).order('created_at');
    if (data) setEmployees(data as Employee[]);
  }

  async function loadCompany() {
    const { data } = await supabase.from('companies').select('*').limit(1).maybeSingle();
    if (data) {
      setCompany(data as Company);
      await loadEmployees((data as Company).id);
    }
  }

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/login'); return; }
      setUserId(session.user.id);
      await loadCompany();
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  async function createCompany() {
    if (!companyNameInput.trim() || !userId) return;
    const { data, error } = await supabase.from('companies').insert({ admin_id: userId, company_name: companyNameInput.trim() }).select().single();
    if (!error && data) setCompany(data as Company);
  }

  function photoPathFromUrl(url: string): string | null {
    const marker = '/identity-photos/';
    const idx = url.indexOf(marker);
    return idx === -1 ? null : url.slice(idx + marker.length);
  }

  async function uploadPhoto(file: File) {
    if (!userId || !editing) return;
    if (!file.type.startsWith('image/')) { setSaveError('Please choose an image file'); return; }
    if (file.size > 5 * 1024 * 1024) { setSaveError('Image must be under 5MB'); return; }
    setUploading(true);
    const oldPath = editing.photo_url ? photoPathFromUrl(editing.photo_url) : null;
    const ext = file.name.split('.').pop();
    const path = `${userId}/emp-${Date.now()}.${ext}`;
    const { error: uploadErr } = await supabase.storage.from('identity-photos').upload(path, file, { upsert: true });
    if (uploadErr) { setSaveError(uploadErr.message); setUploading(false); return; }
    if (oldPath) await supabase.storage.from('identity-photos').remove([oldPath]);
    const { data } = supabase.storage.from('identity-photos').getPublicUrl(path);
    setEditing({ ...editing, photo_url: data.publicUrl });
    setUploading(false);
  }

  async function save() {
    if (!editing || !company) return;
    setSaveError(null);
    if (!/^\d{4}$/.test(editing.code)) { setSaveError('Code must be exactly 4 digits'); return; }

    if ('id' in editing && editing.id) {
      const { error } = await supabase.from('employees').update(editing).eq('id', editing.id);
      if (error) { setSaveError(error.message); return; }
    } else {
      const { error } = await supabase.from('employees').insert({ ...editing, company_id: company.id });
      if (error) { setSaveError(error.message); return; }
    }
    setEditing(null);
    await loadEmployees(company.id);
  }

  async function revoke(id: string) {
    await supabase.from('employees').update({ employment_status: 'revoked' }).eq('id', id);
    if (company) await loadEmployees(company.id);
  }

  async function reactivate(id: string) {
    await supabase.from('employees').update({ employment_status: 'active' }).eq('id', id);
    if (company) await loadEmployees(company.id);
  }

  async function remove(id: string) {
    await supabase.from('employees').delete().eq('id', id);
    if (company) await loadEmployees(company.id);
  }

  if (loading) return <LoadingScreen label="Loading your company…" />;

  return (
    <div style={{ background: 'radial-gradient(circle at 20% 0%, #16204f 0%, #0A1330 45%)', minHeight: '100vh', color: '#F2EEE6', fontFamily: 'Inter, sans-serif', padding: 24 }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
          <Logo size={30} wordmarkSize={18} />
          <Link href="/dashboard" style={{ color: '#8B93B8', fontSize: 13, textDecoration: 'none' }}>← My identities</Link>
        </div>

        {!company ? (
          <div style={{ background: '#111a3d', border: '1px solid #22305e', borderRadius: 16, padding: 24 }}>
            <h1 style={{ fontSize: 18, marginBottom: 8, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700 }}>Set up your company</h1>
            <p style={{ color: '#8B93B8', fontSize: 13, marginBottom: 16 }}>Create a company profile to start adding employees, each with their own access code.</p>
            <Input placeholder="Company name" value={companyNameInput} onChange={(e) => setCompanyNameInput(e.target.value)} />
            <Button full onClick={createCompany}>Create company</Button>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 20 }}>
              <h1 style={{ fontSize: 22, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700 }}>{company.company_name}</h1>
              <span style={{ fontSize: 12, color: '#8B93B8' }}>{employees.length} employee{employees.length !== 1 ? 's' : ''}</span>
            </div>

            {employees.length === 0 && !editing && (
              <div style={{ background: '#111a3d', border: '1px dashed #22305e', borderRadius: 16, padding: 28, textAlign: 'center', marginBottom: 16 }}>
                <p style={{ color: '#8B93B8', fontSize: 13, marginBottom: 4 }}>No employees yet</p>
                <p style={{ color: '#5c6588', fontSize: 12 }}>Add your first one below to issue them a code.</p>
              </div>
            )}

            {employees.map((emp) => (
              <div key={emp.id} style={{ background: '#111a3d', border: '1px solid #22305e', borderRadius: 16, padding: 18, marginBottom: 12, opacity: emp.employment_status === 'active' ? 1 : 0.55 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Avatar url={emp.photo_url} name={emp.name} size={38} />
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontFamily: 'monospace', color: '#5AA7FF', fontSize: 13, background: 'rgba(90,167,255,0.1)', padding: '2px 8px', borderRadius: 6 }}>{emp.code}</span>
                        {emp.employment_status === 'revoked' && <span style={{ color: '#e07a63', fontSize: 10, textTransform: 'uppercase' }}>Revoked</span>}
                      </div>
                      <p style={{ fontSize: 14, marginTop: 4 }}>{emp.name}</p>
                      {emp.role && <p style={{ fontSize: 12, color: '#8B93B8' }}>{emp.role}</p>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 2 }}>
                    <Button variant="ghost" onClick={() => setEditing(emp)}>Edit</Button>
                    {emp.employment_status === 'active' ? (
                      <Button variant="danger" onClick={() => revoke(emp.id)}>Revoke</Button>
                    ) : (
                      <Button variant="ghost" style={{ color: '#5FAE8F' }} onClick={() => reactivate(emp.id)}>Reactivate</Button>
                    )}
                    <Button variant="ghost" onClick={() => remove(emp.id)}>Delete</Button>
                  </div>
                </div>
                <EmployeeCredentialsSection employeeId={emp.id} />
              </div>
            ))}

            {!editing && (
              <Button variant="secondary" full onClick={() => setEditing({ ...BLANK_EMPLOYEE })} style={{ borderStyle: 'dashed', color: '#5AA7FF' }}>
                + Add employee
              </Button>
            )}

            {editing && (
              <div style={{ background: '#111a3d', border: '1px solid #22305e', borderRadius: 16, padding: 22, marginTop: 16 }}>
                <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16, fontFamily: "'Space Grotesk', sans-serif" }}>
                  {'id' in editing && editing.id ? 'Edit employee' : 'New employee'}
                </h2>
                {saveError && <p style={{ color: '#e07a63', fontSize: 12, marginBottom: 12 }}>{saveError}</p>}

                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18, flexWrap: 'wrap' }}>
                  <Avatar url={editing.photo_url} name={editing.name} size={52} />
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <label style={{ fontSize: 12, padding: '9px 14px', borderRadius: 10, border: '1px solid #22305e', color: '#8B93B8', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      {uploading && <Spinner size={12} />}
                      {uploading ? 'Uploading…' : editing.photo_url ? 'Change photo' : 'Add photo'}
                      <input type="file" accept="image/*" disabled={uploading} onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadPhoto(f); }} style={{ display: 'none' }} />
                    </label>
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#8B93B8', cursor: 'pointer' }}>
                    Accent color
                    <input type="color" value={editing.color || '#2F6F6B'} onChange={(e) => setEditing({ ...editing, color: e.target.value })}
                      style={{ width: 32, height: 32, padding: 0, border: '1px solid #22305e', borderRadius: 8, cursor: 'pointer', background: 'none' }} />
                  </label>
                </div>

                {([
                  ['code', 'Code (4 digits)'], ['name', 'Employee name'], ['role', 'Role'], ['phone', 'Phone'], ['email', 'Email'],
                ] as [keyof typeof BLANK_EMPLOYEE, string][]).map(([field, label]) => (
                  <Input key={field} placeholder={label} value={editing[field] as string || ''} onChange={(e) => setEditing({ ...editing, [field]: e.target.value })} />
                ))}
                <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                  <Button full onClick={save} disabled={uploading}>Save</Button>
                  <Button full variant="secondary" onClick={() => setEditing(null)}>Cancel</Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
