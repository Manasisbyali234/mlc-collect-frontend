import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';

const Pill = ({ c, children }) => <span className={`pill ${c}`}>{children}</span>;

function ConfirmModal({ message, onConfirm, onCancel }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={onCancel}>
      <div style={{ background: '#fff', borderRadius: 18, padding: 28, maxWidth: 420, width: '100%' }} onClick={e => e.stopPropagation()}>
        <h3 style={{ margin: '0 0 12px', fontSize: 18 }}>Confirm Delete</h3>
        <p style={{ margin: '0 0 24px', color: 'var(--muted)', fontSize: 15 }}>{message}</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn outline" onClick={onCancel}>Cancel</button>
          <button className="btn outline-red" onClick={onConfirm}>Yes, Deactivate</button>
        </div>
      </div>
    </div>
  );
}

function EditModal({ collector, onSave, onCancel }) {
  const [form, setForm] = useState({ name: collector.name || '', mobile: collector.mobile || '', branch: collector.branch || '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  async function handleSave() {
    if (!form.name || !form.mobile) return setError('Name and mobile are required.');
    setSaving(true); setError('');
    try { await onSave(form); }
    catch (e) { setError(e.message); setSaving(false); }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={onCancel}>
      <div style={{ background: '#fff', borderRadius: 18, padding: 28, maxWidth: 460, width: '100%' }} onClick={e => e.stopPropagation()}>
        <h3 style={{ margin: '0 0 20px', fontSize: 18 }}>Edit Collector</h3>
        {error && <div style={{ color: 'var(--red-tx)', background: 'var(--red-bg)', padding: '8px 12px', borderRadius: 8, marginBottom: 14, fontSize: 14 }}>{error}</div>}
        <div style={{ display: 'grid', gap: 14 }}>
          {[['name', 'Name *', 'text'], ['mobile', 'Mobile / Login ID *', 'tel'], ['branch', 'Branch / Area', 'text']].map(([k, lbl, type]) => (
            <div key={k}>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 5 }}>{lbl}</label>
              <input className="input" type={type} style={{ padding: '10px 12px' }} value={form[k]} onChange={set(k)} />
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
          <button className="btn outline" onClick={onCancel}>Cancel</button>
          <button className="btn gold" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
    </div>
  );
}

function CollectorDetailModal({ collector, onClose }) {
  const nav = useNavigate();
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getApplications({ collectorId: collector.id })
      .then(setApps).catch(() => {}).finally(() => setLoading(false));
  }, [collector.id]);

  const memberIds = [...new Set(apps.map(a => a.memberId))];
  const disbursed = apps.filter(a => a.status === 'Disbursed');

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 18, padding: 28, maxWidth: 640, width: '100%', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 20 }}>{collector.name}</h3>
            <div style={{ color: 'var(--muted)', fontSize: 13, marginTop: 4 }}>
              {collector.id} · {collector.mobile}{collector.branch ? ` · ${collector.branch}` : ''}
            </div>
          </div>
          <button style={{ border: 0, background: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--muted)' }} onClick={onClose}>✕</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 20 }}>
          {[
            ['Customers', memberIds.length, 'unique members'],
            ['Active Loans', disbursed.length, 'disbursed'],
            ['Total Apps', apps.length, 'all time'],
          ].map(([l, v, s]) => (
            <div key={l} className="panel pad" style={{ textAlign: 'center' }}>
              <div className="eyebrow" style={{ fontSize: 11 }}>{l}</div>
              <div className="mono" style={{ fontSize: 24, fontWeight: 700, margin: '4px 0 2px' }}>{v}</div>
              <div className="muted" style={{ fontSize: 12 }}>{s}</div>
            </div>
          ))}
        </div>

        {loading ? (
          <p className="muted" style={{ textAlign: 'center', padding: 24 }}>Loading…</p>
        ) : apps.length === 0 ? (
          <p className="muted" style={{ textAlign: 'center', padding: 24 }}>No applications found for this collector.</p>
        ) : (
          <div className="panel scroll-x">
            <table className="dtable">
              <thead><tr><th>App ID</th><th>Member</th><th>Loan Type</th><th className="r">Amount</th><th>Status</th></tr></thead>
              <tbody>{apps.slice(0, 30).map(a => {
                const sc = { Draft: 'grey', 'Pending Admin Approval': 'yellow', Approved: 'green', Rejected: 'red', Disbursed: 'green', NPA: 'red' };
                return (
                  <tr key={a.appId} style={{ cursor: 'pointer' }} onClick={() => { onClose(); nav('/admin/loan-applications/' + a.appId); }}>
                    <td className="mono" style={{ fontSize: 12 }}>{a.appId}</td>
                    <td><b>{a.memberName}</b><div className="muted" style={{ fontSize: 12 }}>{a.memberId}</div></td>
                    <td>{a.loanType}</td>
                    <td className="r mono">₹{Number(a.loanAmount || 0).toLocaleString('en-IN')}</td>
                    <td><Pill c={sc[a.status] || 'grey'}>{a.status}</Pill></td>
                  </tr>
                );
              })}</tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export function CollectorManagement() {
  const [collectors, setCollectors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [detailTarget, setDetailTarget] = useState(null);
  const [toast, setToast] = useState('');

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  }

  async function load() {
    setLoading(true);
    try {
      // Try the new stats endpoint first; fall back to building stats from existing endpoints
      let stats;
      try {
        stats = await api.getCollectorStats();
      } catch {
        // Fallback: build stats client-side from existing endpoints
        const [users, apps, collections] = await Promise.all([
          api.getUsers(),
          api.getApplications(),
          api.getCollections(),
        ]);
        const colUsers = users.filter(u => u.role === 'collector');
        stats = colUsers.map(col => {
          const colApps = apps.filter(a =>
            a.collectorId === col.id || a.collectorId === col.mobile || a.collectorName === col.name
          );
          const memberIds = [...new Set(colApps.map(a => a.memberId))];
          const colCols = collections.filter(c =>
            c.collectorId === col.id || c.collectorId === col.mobile || c.collectorName === col.name
          );
          const totalCollection = colCols.reduce((s, c) => s + Number(c.amount || 0), 0);
          return { ...col, customerCount: memberIds.length, totalCollection };
        });
      }
      setCollectors(stats);
    } catch (e) {
      console.error('Failed to load collectors:', e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const filtered = collectors.filter(c => {
    const q = search.toLowerCase();
    return !q || [c.name, c.mobile, c.id, c.branch].some(v => v && v.toLowerCase().includes(q));
  });

  const total = collectors.length;
  const active = collectors.filter(c => c.status !== 'inactive').length;
  const inactive = collectors.filter(c => c.status === 'inactive').length;
  const totalCustomers = collectors.reduce((s, c) => s + (c.customerCount || 0), 0);

  async function handleEdit(form) {
    try {
      await api.updateUser(editTarget.id, form);
      setEditTarget(null);
      showToast('✅ Collector updated successfully.');
      load();
    } catch (e) {
      alert('Update failed: ' + e.message + '\n\nMake sure the backend is deployed with the latest changes.');
    }
  }

  async function handleDelete() {
    try {
      await api.deleteUser(deleteTarget.id);
      setDeleteTarget(null);
      showToast('🗑️ Collector deleted successfully.');
      load();
    } catch (e) {
      alert('Delete failed: ' + e.message + '\n\nMake sure the backend is deployed with the latest changes.');
    }
  }

  return (
    <>
      <div className="a-title">
        <div><h1>Collector Management</h1><p>{total} registered collector{total !== 1 ? 's' : ''}</p></div>
      </div>

      {/* Summary cards */}
      <div className="stat-grid-4" style={{ marginBottom: 20 }}>
        {[
          ['Total Collectors', total, '👥'],
          ['Active', active, '✅'],
          ['Inactive', inactive, '🚫'],
          ['Total Customers', totalCustomers, '🏠'],
        ].map(([l, v, icon]) => (
          <div key={l} className="panel pad" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 26, marginBottom: 6 }}>{icon}</div>
            <div className="eyebrow" style={{ fontSize: 11 }}>{l}</div>
            <div className="mono" style={{ fontSize: 28, fontWeight: 700, margin: '4px 0 2px' }}>{v}</div>
          </div>
        ))}
      </div>

      <input
        className="search"
        style={{ marginBottom: 16 }}
        placeholder="Search name, mobile, ID, branch…"
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      {loading ? (
        <div className="panel pad" style={{ textAlign: 'center', padding: 48 }}>
          <p className="muted">Loading collectors…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="panel pad" style={{ textAlign: 'center', padding: 48 }}>
          <p className="muted">{collectors.length === 0 ? 'No collectors found.' : 'No results match your search.'}</p>
        </div>
      ) : (
        <div className="panel scroll-x">
          <table className="dtable">
            <thead>
              <tr>
                <th>Sl.</th>
                <th>Collector Name</th>
                <th>Collector ID</th>
                <th>Mobile</th>
                <th>Branch</th>
                <th className="r">Customers</th>
                <th className="r">Total Collection</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, i) => (
                <tr key={c.id}>
                  <td className="mono" style={{ fontSize: 13 }}>{i + 1}</td>
                  <td>
                    <button
                      style={{ background: 'none', border: 0, padding: 0, fontWeight: 700, fontSize: 14, color: 'var(--g800)', cursor: 'pointer', textDecoration: 'underline' }}
                      onClick={() => setDetailTarget(c)}
                    >
                      {c.name}
                    </button>
                  </td>
                  <td className="mono" style={{ fontSize: 12 }}>{c.id}</td>
                  <td className="mono">{c.mobile}</td>
                  <td>{c.branch || '–'}</td>
                  <td className="r mono" style={{ fontWeight: 700 }}>{c.customerCount || 0}</td>
                  <td className="r mono">₹{(c.totalCollection || 0).toLocaleString('en-IN')}</td>
                  <td>
                    <Pill c={c.status === 'inactive' ? 'red' : 'green'}>
                      {c.status === 'inactive' ? 'Inactive' : 'Active'}
                    </Pill>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn sm outline" onClick={() => setEditTarget(c)}>Edit</button>
                      {c.status !== 'inactive' && (
                        <button className="btn sm outline-red" onClick={() => setDeleteTarget(c)}>Delete</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editTarget && (
        <EditModal collector={editTarget} onSave={handleEdit} onCancel={() => setEditTarget(null)} />
      )}

      {deleteTarget && (
        <ConfirmModal
          message={`Are you sure you want to delete "${deleteTarget.name}"? This will permanently remove them from the database. All their customer and payment records will be preserved.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {detailTarget && (
        <CollectorDetailModal collector={detailTarget} onClose={() => setDetailTarget(null)} />
      )}

      {toast && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: 'var(--g800)', color: '#fff', padding: '12px 24px', borderRadius: 12, fontSize: 14, fontWeight: 600, zIndex: 300, boxShadow: '0 4px 20px rgba(0,0,0,.3)', whiteSpace: 'nowrap' }}>
          {toast}
        </div>
      )}
    </>
  );
}
