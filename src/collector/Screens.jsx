import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
export { LoanCollection, NewMemberForm, LoanApplicationForm } from './LoanCollectionScreens.jsx';
function PageHeader({ title, sub, children }) {
  return (
    <div className="page-header">
      <div><h1>{title}</h1>{sub && <p>{sub}</p>}</div>
      {children && <div className="right">{children}</div>}
    </div>
  );
}

/* ---------- 1. Home ---------- */
export function Home() {
  const [stats, setStats] = useState(null);
  const nav = useNavigate();
  const user = JSON.parse(localStorage.getItem('mlc_user') || '{"name":"Collector","id":"COL-001"}');
  useEffect(() => { api.getDashboard({ collectorId: user.id }).then(setStats).catch(() => {}); }, []);
  return (
    <>
      <PageHeader title={`Namaskara, ${user.name}`} sub={`Collector · ${user.branch || ''} · ${new Date().toLocaleDateString('en-IN', { weekday:'short', day:'2-digit', month:'short', year:'numeric' })}`}>
        <Link to="/app/loan-collection" className="btn gold" style={{ padding: '14px 28px', fontSize: 17 }}>Loan Collection →</Link>
      </PageHeader>

      <div className="cols">
        <div className="panel pad span2 stat-card" style={{ marginBottom: 18 }} onClick={() => nav('/app/loan-collection')} role="button" tabIndex={0} onKeyDown={e => e.key === 'Enter' && nav('/app/loan-collection')}>
          <div className="row between" style={{ marginBottom: 14 }}>
            <div>
              <div className="eyebrow">Loan Applications</div>
              <div className="big" style={{ fontSize: 44, margin: '6px 0 2px' }}>{stats ? stats.totalApplications : '–'}</div>
              <div className="muted">Total submitted · {stats ? stats.pendingApproval : 0} pending approval</div>
            </div>
            <div
              style={{ textAlign: 'right', cursor: 'pointer' }}
              onClick={e => { e.stopPropagation(); nav('/app/loan-collection?status=Approved'); }}
              role="button" tabIndex={0}
              onKeyDown={e => e.key === 'Enter' && (e.stopPropagation(), nav('/app/loan-collection?status=Approved'))}
            >
              <div className="muted" style={{ fontSize: 14 }}>Approved</div>
              <div className="mono" style={{ fontSize: 32, fontWeight: 700 }}>{stats ? stats.approved : '–'}</div>
            </div>
          </div>
        </div>

        <div className="panel pad stat-card" onClick={() => nav('/app/customers')} role="button" tabIndex={0} onKeyDown={e => e.key === 'Enter' && nav('/app/customers')}>
          <div className="eyebrow">Members</div>
          <div className="stat-num">{stats ? stats.totalMembers : '–'}</div>
          <div className="muted">registered</div>
        </div>
        <div className="panel pad stat-card" onClick={() => nav('/app/loan-collection?status=Disbursed')} role="button" tabIndex={0} onKeyDown={e => e.key === 'Enter' && nav('/app/loan-collection?status=Disbursed')}>
          <div className="eyebrow">Disbursed</div>
          <div className="stat-num">{stats ? stats.disbursed : '–'}</div>
          <div className="muted">loans disbursed</div>
        </div>
      </div>
    </>
  );
}

/* ---------- 2. Today's collection list ---------- */
export function Collect() {
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [apps, setApps] = useState([]);
  const [appSearch, setAppSearch] = useState('');
  const [selectedApp, setSelectedApp] = useState(null);
  const [appDetail, setAppDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [amountPaid, setAmountPaid] = useState('');
  const [remarks, setRemarks] = useState('');
  const [payDate, setPayDate] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);
  const [formErr, setFormErr] = useState('');
  const [payPhoto, setPayPhoto] = useState(null);
  const [payPhotoPreview, setPayPhotoPreview] = useState(null);
  const [payLocation, setPayLocation] = useState(null);
  const [locLoading, setLocLoading] = useState(false);
  const user = JSON.parse(localStorage.getItem('mlc_user') || '{"name":"Collector","id":"COL-001"}');
  const todayKey = new Date().toLocaleDateString('en-IN');

  function loadCollections() {
    api.getCollections({ collectorId: user.id })
      .then(setCollections).finally(() => setLoading(false));
  }

  useEffect(() => { Promise.resolve().then(loadCollections); }, []);

  function capturePayLocation() {
    if (!navigator.geolocation) { alert('Geolocation not supported'); return; }
    setLocLoading(true);
    navigator.geolocation.getCurrentPosition(
      pos => { setPayLocation({ lat: pos.coords.latitude.toFixed(6), lng: pos.coords.longitude.toFixed(6) }); setLocLoading(false); },
      () => { alert('Could not get location. Please allow location access.'); setLocLoading(false); }
    );
  }

  function handlePayPhoto(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (!['image/jpeg','image/png'].includes(file.type)) { alert('Only JPG/PNG allowed'); return; }
    if (file.size > 5 * 1024 * 1024) { alert('Max 5 MB'); return; }
    setPayPhoto(file);
    setPayPhotoPreview(URL.createObjectURL(file));
  }

  function openModal() {
    setSelectedApp(null); setAppDetail(null); setAmountPaid(''); setRemarks('');
    setPayDate(new Date().toISOString().slice(0, 10)); setFormErr('');
    setPayPhoto(null); setPayPhotoPreview(null); setPayLocation(null); setAppSearch('');
    if (apps.length === 0) {
      api.getApplications({ collectorId: user.id })
        .then(list => setApps(list.filter(a => a.status === 'Disbursed')))
        .catch(() => {});
    }
    setShowModal(true);
  }

  function closeModal() { setShowModal(false); }

  async function handleSelectApp(appId) {
    const app = apps.find(a => a.appId === appId);
    setSelectedApp(app || null);
    setAppDetail(null);
    if (!app) return;
    setDetailLoading(true);
    try {
      const detail = await api.getApplication(appId);
      setAppDetail(detail);
    } catch (e) { setAppDetail(null); }
    finally { setDetailLoading(false); }
  }

  async function handleSave() {
    setFormErr('');
    if (!selectedApp) { setFormErr('Please select a customer.'); return; }
    const amt = Number(amountPaid);
    if (!amt || amt <= 0) { setFormErr('Enter a valid payment amount.'); return; }
    const outstanding = appDetail ? Number(appDetail.pending || 0) : 0;
    if (outstanding > 0 && amt > outstanding) {
      setFormErr(`Amount cannot exceed outstanding balance of ₹${outstanding.toLocaleString('en-IN')}.`);
      return;
    }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('collectorId', user.id);
      fd.append('collectorName', user.name);
      fd.append('memberName', selectedApp.memberName);
      fd.append('memberId', selectedApp.memberId);
      fd.append('appId', selectedApp.appId);
      fd.append('amount', amt);
      fd.append('mode', 'Cash');
      fd.append('reference', remarks);
      fd.append('date', todayKey);
      fd.append('collectionDate', payDate);
      if (payLocation) fd.append('location', JSON.stringify(payLocation));
      if (payPhoto) fd.append('photo', payPhoto);
      const saved = await api.saveCollectionForm(fd);
      setCollections(p => [...p, saved]);
      closeModal();
    } catch (e) { setFormErr('Error: ' + e.message); }
    finally { setSaving(false); }
  }

  const total = collections.reduce((s, c) => s + (Number(c.amount) || 0), 0);
  const outstanding = appDetail ? Number(appDetail.pending || 0) : 0;
  const loanAmount = appDetail ? Number(appDetail.loanAmount || 0) : 0;
  const totalPaid = appDetail ? Number(appDetail.totalPaid || 0) : 0;

  return (
    <>
      <PageHeader title="Today's collections" sub={new Date().toLocaleDateString('en-IN', { weekday:'short', day:'2-digit', month:'short', year:'numeric' })}>
        <button className="btn gold sm" onClick={openModal}>+ Add Payment</button>
      </PageHeader>
      {loading ? (
        <div className="panel pad" style={{ textAlign:'center', padding:48 }}><p className="muted">Loading…</p></div>
      ) : collections.length === 0 ? (
        <div className="panel pad" style={{ textAlign:'center', padding:48 }}>
          <p className="muted">No collections recorded yet. Use <b>Record</b> to add entries.</p>
        </div>
      ) : (
        <div className="panel scroll-x" style={{ marginBottom: 18 }}>
          <table className="dtable">
            <thead><tr><th>Member</th><th>App ID</th><th className="r">Amount</th><th>Mode</th><th>Remarks</th><th>Date</th></tr></thead>
            <tbody>{collections.map(c => (
              <tr key={c.id}>
                <td><b>{c.memberName}</b><div className="muted" style={{ fontSize:12 }}>{c.memberId}</div></td>
                <td className="mono" style={{ fontSize:12 }}>{c.appId || '–'}</td>
                <td className="r mono">₹{Number(c.amount).toLocaleString('en-IN')}</td>
                <td>{c.mode}</td>
                <td style={{ fontSize:13, color:'var(--muted)' }}>{c.reference || '–'}</td>
                <td className="mono" style={{ fontSize:13 }}>{c.date}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
      {collections.length > 0 && (
        <div className="panel pad">
          <div className="row between">
            <div>
              <div className="eyebrow">Total collected</div>
              <div className="mono" style={{ fontSize: 32, fontWeight: 700, margin: '4px 0 2px' }}>₹{total.toLocaleString('en-IN')}</div>
            </div>
            <Link to="/app/deposit" className="btn gold" style={{ padding: '16px 32px', fontSize: 18 }}>Deposit →</Link>
          </div>
        </div>
      )}

      {showModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.5)', zIndex:100, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }} onClick={closeModal}>
          <div style={{ background:'#fff', borderRadius:20, padding:28, width:'100%', maxWidth:520, maxHeight:'90vh', overflowY:'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
              <h3 style={{ margin:0, fontSize:20, fontWeight:800 }}>Add Payment</h3>
              <button onClick={closeModal} style={{ border:0, background:'none', fontSize:22, cursor:'pointer', color:'var(--muted)', lineHeight:1 }}>✕</button>
            </div>

            <div style={{ display:'grid', gap:14 }}>
              <div>
                <label style={{ display:'block', fontSize:13, fontWeight:600, color:'var(--muted)', marginBottom:6 }}>Selected Customer <span style={{ color:'var(--red-tx)' }}>*</span></label>
                <input className="input" style={{ padding:'10px 12px', fontSize:14, marginBottom:6 }} placeholder="Search customer name…" value={appSearch} onChange={e => { setAppSearch(e.target.value); setSelectedApp(null); setAppDetail(null); }} />
                {appSearch && (
                  <div style={{ border:'1px solid var(--line)', borderRadius:10, maxHeight:180, overflowY:'auto', background:'#fff' }}>
                    {apps.filter(a => a.memberName.toLowerCase().includes(appSearch.toLowerCase())).map(a => (
                      <div key={a.appId} style={{ padding:'9px 14px', cursor:'pointer', borderBottom:'1px solid var(--line)', fontSize:14 }}
                        onClick={() => { setAppSearch(a.memberName); handleSelectApp(a.appId); }}>
                        <b>{a.memberName}</b> <span style={{ color:'var(--muted)', fontSize:12 }}>· {a.appId}</span>
                      </div>
                    ))}
                    {apps.filter(a => a.memberName.toLowerCase().includes(appSearch.toLowerCase())).length === 0 && (
                      <div style={{ padding:'9px 14px', color:'var(--muted)', fontSize:13 }}>No match</div>
                    )}
                  </div>
                )}
              </div>

              {detailLoading && <p className="muted" style={{ fontSize:13, margin:0 }}>Loading loan details…</p>}

              {appDetail && (
                <div style={{ background:'var(--soft)', borderRadius:14, padding:'14px 16px', display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
                  <div>
                    <div style={{ fontSize:11, fontWeight:700, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'.08em' }}>Loan Amount</div>
                    <div className="mono" style={{ fontWeight:700, fontSize:16, marginTop:3 }}>₹{loanAmount.toLocaleString('en-IN')}</div>
                  </div>
                  <div>
                    <div style={{ fontSize:11, fontWeight:700, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'.08em' }}>Total Paid</div>
                    <div className="mono" style={{ fontWeight:700, fontSize:16, marginTop:3, color:'var(--green-tx)' }}>₹{totalPaid.toLocaleString('en-IN')}</div>
                  </div>
                  <div>
                    <div style={{ fontSize:11, fontWeight:700, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'.08em' }}>Outstanding</div>
                    <div className="mono" style={{ fontWeight:700, fontSize:16, marginTop:3, color: outstanding > 0 ? 'var(--red-tx)' : 'var(--green-tx)' }}>₹{outstanding.toLocaleString('en-IN')}</div>
                  </div>
                </div>
              )}

              {selectedApp && (
                <div>
                  <label style={{ display:'block', fontSize:13, fontWeight:600, color:'var(--muted)', marginBottom:6 }}>Customer Name</label>
                  <input className="input ro" style={{ padding:'10px 12px', fontSize:14 }} value={selectedApp.memberName} readOnly />
                </div>
              )}

              <div>
                <label style={{ display:'block', fontSize:13, fontWeight:600, color:'var(--muted)', marginBottom:6 }}>Date</label>
                <input className="input" type="date" style={{ padding:'10px 12px', fontSize:14 }} value={payDate} onChange={e => setPayDate(e.target.value)} />
              </div>

              <div>
                <label style={{ display:'block', fontSize:13, fontWeight:600, color:'var(--muted)', marginBottom:6 }}>Amount Paid (₹) <span style={{ color:'var(--red-tx)' }}>*</span></label>
                <input className="input mono" style={{ padding:'10px 12px', fontSize:14 }} type="number" min="1"
                  value={amountPaid} onChange={e => setAmountPaid(e.target.value)}
                  placeholder={outstanding > 0 ? `Max ₹${outstanding.toLocaleString('en-IN')}` : 'Enter amount'} />
              </div>

              <div>
                <label style={{ display:'block', fontSize:13, fontWeight:600, color:'var(--muted)', marginBottom:6 }}>Remarks (Optional)</label>
                <input className="input" style={{ padding:'10px 12px', fontSize:14 }} value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="e.g. Cash collected at door" />
              </div>

              <div>
                <label style={{ display:'block', fontSize:13, fontWeight:600, color:'var(--muted)', marginBottom:6 }}>Live Location</label>
                {payLocation ? (
                  <div style={{ display:'flex', alignItems:'center', gap:10, border:'1px solid var(--g800)', borderRadius:12, padding:'10px 14px', background:'var(--green-bg)' }}>
                    <span style={{ fontSize:13, flex:1 }}>📍 {payLocation.lat}, {payLocation.lng}</span>
                    <button type='button' style={{ border:0, background:'none', color:'var(--red-tx)', cursor:'pointer', fontSize:12 }} onClick={() => setPayLocation(null)}>✕</button>
                  </div>
                ) : (
                  <button type='button' className="btn outline" style={{ width:'100%' }} onClick={capturePayLocation} disabled={locLoading}>
                    {locLoading ? 'Getting location…' : '📍 Capture Live Location'}
                  </button>
                )}
              </div>

              <div>
                <label style={{ display:'block', fontSize:13, fontWeight:600, color:'var(--muted)', marginBottom:6 }}>Photo Proof</label>
                {payPhotoPreview ? (
                  <div>
                    <img src={payPhotoPreview} alt="proof" style={{ width:'100%', maxHeight:160, objectFit:'cover', borderRadius:12, border:'1px solid var(--line)' }} />
                    <button type='button' style={{ border:0, background:'none', color:'var(--red-tx)', cursor:'pointer', fontSize:13, marginTop:6 }} onClick={() => { setPayPhoto(null); setPayPhotoPreview(null); }}>✕ Remove photo</button>
                  </div>
                ) : (
                  <label style={{ display:'block', border:'1.5px dashed var(--line)', borderRadius:12, padding:14, textAlign:'center', cursor:'pointer', fontSize:13, color:'var(--muted)' }}>
                    📷 Take / Upload Photo (JPG/PNG, max 5MB)
                    <input type='file' accept='image/jpeg,image/png' capture='environment' style={{ display:'none' }} onChange={handlePayPhoto} />
                  </label>
                )}
              </div>

              {formErr && (
                <div style={{ background:'var(--red-bg)', color:'var(--red-tx)', borderRadius:10, padding:'10px 14px', fontSize:13, fontWeight:600 }}>{formErr}</div>
              )}
            </div>

            <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:22 }}>
              <button className="btn outline" onClick={closeModal}>Cancel</button>
              <button className="btn gold" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : 'Save Payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ---------- 4. Customer profile ---------- */
export function Customer() {
  const [members, setMembers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const user = JSON.parse(localStorage.getItem('mlc_user') || '{"name":"Collector","id":"COL-001"}');
  useEffect(() => { Promise.resolve().then(() => api.getMembers({ collectorId: user.id }).then(setMembers).finally(() => setLoading(false))); }, []);
  const filtered = members.filter(m => {
    const q = search.toLowerCase();
    return !q || [m.name, m.mobile, m.memberId].some(v => v && v.toLowerCase().includes(q));
  });
  return (
    <>
      <PageHeader title="Customers" sub="Registered members" />
      <input className="search" placeholder="Search name, mobile, member ID…" style={{ marginBottom: 14 }} value={search} onChange={e => setSearch(e.target.value)} />
      {loading ? (
        <div className="panel pad" style={{ textAlign:'center', padding:48 }}><p className="muted">Loading…</p></div>
      ) : filtered.length === 0 ? (
        <div className="panel pad" style={{ textAlign:'center', padding:48 }}>
          <p className="muted">{search ? 'No members match.' : 'No members yet.'}</p>
          <Link to="/app/loan-collection/new-member" className="btn gold" style={{ marginTop:16, display:'inline-block' }}>+ Register New Member</Link>
        </div>
      ) : (
        <div className="panel scroll-x">
          <table className="dtable">
            <thead><tr><th>Member ID</th><th>Name</th><th>Mobile</th><th>Village/City</th><th>District</th></tr></thead>
            <tbody>{filtered.map(m => (
              <tr key={m.memberId}>
                <td className="mono" style={{ fontSize:13 }}>{m.memberId}</td>
                <td><b>{m.name}</b></td>
                <td className="mono">{m.mobile}</td>
                <td>{m.village}</td>
                <td>{m.district}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </>
  );
}

/* ---------- 3. Record collection ---------- */
const DAILY_EMI = 100;

export function Record() {
  const [apps, setApps] = useState([]);
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});
  const [mode, setMode] = useState('Cash');
  const [reference, setReference] = useState('');
  const [search, setSearch] = useState('');
  const user = JSON.parse(localStorage.getItem('mlc_user') || '{"name":"Collector","id":"COL-001"}');
  const todayKey = new Date().toLocaleDateString('en-IN');

  function load() {
    Promise.all([
      api.getApplications({ collectorId: user.id }),
      api.getCollections({ collectorId: user.id, date: todayKey }),
    ]).then(([a, c]) => { setApps(a.filter(x => x.status === 'Disbursed')); setCollections(c); })
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  const todayPaidSet = new Set(collections.map(c => c.appId));

  const filtered = apps.filter(a => {
    const q = search.toLowerCase();
    return !q || [a.memberName, a.memberId, a.mobile].some(v => v && v.toLowerCase().includes(q));
  });

  const paidCount = filtered.filter(a => todayPaidSet.has(a.appId)).length;
  const pendingCount = filtered.length - paidCount;

  async function handleCollect(app) {
    if (todayPaidSet.has(app.appId)) return;
    if (mode === 'PhonePe' && !reference.trim()) { alert('Enter UTR / transaction ID for PhonePe'); return; }
    setSaving(p => ({ ...p, [app.appId]: true }));
    try {
      const saved = await api.saveCollection({
        collectorId: user.id,
        collectorName: user.name,
        memberName: app.memberName,
        memberId: app.memberId,
        appId: app.appId,
        amount: DAILY_EMI,
        mode,
        reference: mode === 'PhonePe' ? reference : '',
        date: todayKey,
        collectionDate: new Date().toISOString().slice(0, 10),
      });
      setCollections(p => [...p, saved]);
    } catch (e) { alert('Error: ' + e.message); }
    finally { setSaving(p => ({ ...p, [app.appId]: false })); }
  }

  if (loading) return <div className="panel pad" style={{ textAlign:'center', padding:48 }}><p className="muted">Loading…</p></div>;

  return (
    <>
      <PageHeader title="Record Collection" sub={`${user.name} · ${todayKey}`} />

      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14, marginBottom:18 }}>
        <div className="panel pad" style={{ textAlign:'center' }}>
          <div className="eyebrow" style={{ fontSize:11 }}>Total Due Today</div>
          <div className="mono" style={{ fontSize:28, fontWeight:700 }}>₹{(filtered.length * DAILY_EMI).toLocaleString('en-IN')}</div>
          <div className="muted" style={{ fontSize:12 }}>{filtered.length} loans × ₹{DAILY_EMI}</div>
        </div>
        <div className="panel pad" style={{ textAlign:'center', background:'var(--green-bg)' }}>
          <div className="eyebrow" style={{ fontSize:11 }}>Collected</div>
          <div className="mono" style={{ fontSize:28, fontWeight:700, color:'var(--green-tx)' }}>₹{(paidCount * DAILY_EMI).toLocaleString('en-IN')}</div>
          <div className="muted" style={{ fontSize:12 }}>{paidCount} paid</div>
        </div>
        <div className="panel pad" style={{ textAlign:'center', background: pendingCount > 0 ? 'var(--yellow-bg)' : 'var(--soft)' }}>
          <div className="eyebrow" style={{ fontSize:11 }}>Pending</div>
          <div className="mono" style={{ fontSize:28, fontWeight:700, color: pendingCount > 0 ? 'var(--yellow-tx)' : 'inherit' }}>₹{(pendingCount * DAILY_EMI).toLocaleString('en-IN')}</div>
          <div className="muted" style={{ fontSize:12 }}>{pendingCount} remaining</div>
        </div>
      </div>

      <div className="panel pad" style={{ marginBottom:18, display:'flex', gap:18, alignItems:'center', flexWrap:'wrap' }}>
        <div>
          <div className="lbl" style={{ marginBottom:6 }}>Payment mode</div>
          <div className="toggle2">
            {['Cash', 'PhonePe'].map(m => (
              <button key={m} className={mode === m ? 'on' : ''} onClick={() => setMode(m)}>{m}</button>
            ))}
          </div>
        </div>
        {mode === 'PhonePe' && (
          <div style={{ flex:1, minWidth:200 }}>
            <div className="lbl" style={{ marginBottom:6 }}>UTR / Transaction ID</div>
            <input className="input mono" value={reference} onChange={e => setReference(e.target.value)} placeholder="e.g. T2610081842" />
          </div>
        )}
        <div style={{ flex:1, minWidth:200 }}>
          <div className="lbl" style={{ marginBottom:6 }}>Search member</div>
          <input className="input" value={search} onChange={e => setSearch(e.target.value)} placeholder="Name, mobile, member ID…" />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="panel pad" style={{ textAlign:'center', padding:48 }}>
          <p className="muted">{apps.length === 0 ? 'No disbursed loans assigned to you.' : 'No members match your search.'}</p>
        </div>
      ) : (
        <div className="panel scroll-x">
          <table className="dtable">
            <thead>
              <tr>
                <th>Member</th>
                <th>Mobile</th>
                <th>App ID</th>
                <th className="r">Daily EMI</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(a => {
                const paid = todayPaidSet.has(a.appId);
                return (
                  <tr key={a.appId} style={{ background: paid ? 'var(--green-bg)' : 'transparent' }}>
                    <td><b>{a.memberName}</b><div className="muted" style={{ fontSize:12 }}>{a.memberId}</div></td>
                    <td className="mono">{a.mobile}</td>
                    <td className="mono" style={{ fontSize:12 }}>{a.appId}</td>
                    <td className="r mono" style={{ fontWeight:700 }}>₹{DAILY_EMI}</td>
                    <td>
                      {paid
                        ? <span className="pill green">✓ Paid</span>
                        : <span className="pill yellow">Pending</span>}
                    </td>
                    <td>
                      {!paid && (
                        <button
                          className="btn sm gold"
                          onClick={() => handleCollect(a)}
                          disabled={saving[a.appId]}
                        >
                          {saving[a.appId] ? 'Saving…' : `Collect ₹${DAILY_EMI}`}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

/* ---------- 5. Loan account ---------- */
export function LoanAccount() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const user = JSON.parse(localStorage.getItem('mlc_user') || '{"name":"Collector","id":"COL-001"}');
  useEffect(() => { Promise.resolve().then(() => api.getLoanAccounts({ collectorId: user.id }).then(setAccounts).finally(() => setLoading(false))); }, []);
  return (
    <>
      <PageHeader title="Loan Accounts" sub="All active loan accounts" />
      {loading ? (
        <div className="panel pad" style={{ textAlign:'center', padding:48 }}><p className="muted">Loading…</p></div>
      ) : accounts.length === 0 ? (
        <div className="panel pad" style={{ textAlign:'center', padding:48 }}><p className="muted">No loan accounts yet.</p></div>
      ) : (
        <div className="panel scroll-x">
          <table className="dtable">
            <thead><tr><th>Loan ID</th><th>Member</th><th>Loan Type</th><th className="r">Amount</th><th>Date</th></tr></thead>
            <tbody>{accounts.map(a => (
              <tr key={a.id}>
                <td className="mono" style={{ fontSize:13 }}>{a.id}</td>
                <td><b>{a.memberName}</b></td>
                <td>{a.loanType}</td>
                <td className="r mono">Rs.{a.loanAmount}</td>
                <td className="mono" style={{ fontSize:13 }}>{a.date}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </>
  );
}

/* ---------- 6. Deposit ---------- */
export function Deposit() {
  const [how, setHow] = useState('Bank counter');
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const [collectedFrom, setCollectedFrom] = useState('');
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [location, setLocation] = useState(null);
  const [locLoading, setLocLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const user = JSON.parse(localStorage.getItem('mlc_user') || '{"name":"Collector","id":"COL-001"}');

  function captureLocation() {
    if (!navigator.geolocation) { alert('Geolocation not supported'); return; }
    setLocLoading(true);
    navigator.geolocation.getCurrentPosition(
      pos => { setLocation({ lat: pos.coords.latitude.toFixed(6), lng: pos.coords.longitude.toFixed(6) }); setLocLoading(false); },
      () => { alert('Could not get location. Please allow location access.'); setLocLoading(false); }
    );
  }

  function handlePhoto(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (!['image/jpeg','image/png'].includes(file.type)) { alert('Only JPG/PNG allowed'); return; }
    if (file.size > 5 * 1024 * 1024) { alert('Max 5 MB'); return; }
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  async function handleSubmit() {
    if (!amount || !reference.trim()) { alert('Enter amount and reference'); return; }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('collectorId', user.id);
      fd.append('collectorName', user.name);
      fd.append('amount', amount);
      fd.append('method', how);
      fd.append('reference', reference);
      fd.append('collectedFrom', collectedFrom);
      fd.append('date', new Date().toLocaleDateString('en-IN'));
      fd.append('status', 'To verify');
      if (location) fd.append('location', JSON.stringify(location));
      if (photo) fd.append('photo', photo);
      await api.saveDepositForm(fd);
      setSubmitted(true);
    } catch (e) { alert('Error: ' + e.message); }
    finally { setSubmitting(false); }
  }

  if (submitted) return (
    <div style={{ maxWidth:500, margin:'60px auto', textAlign:'center' }}>
      <div style={{ fontSize:64 }}>&#10003;</div>
      <h2 style={{ marginTop:16 }}>Deposit Submitted!</h2>
      <p className='muted'>Accountable Officer will verify your deposit.</p>
    </div>
  );

  return (
    <>
      <PageHeader title="Deposit to society" sub={`Collection date ${new Date().toLocaleDateString('en-IN')}`} />
      <div className="cols">
        <div>
          <div className="panel pad" style={{ marginBottom: 18, background: 'var(--g900)', color: '#fff', borderColor: 'transparent' }}>
            <div style={{ color: 'var(--gold)', fontWeight: 700, fontSize: 13, letterSpacing: '.08em' }}>MAHALAXMI CO-OPERATIVE SOCIETY LTD</div>
            <div style={{ margin: '6px 0', color: '#cfe3d9' }}>Society current account (shown for reference)</div>
            <div className="mono" style={{ fontSize: 16 }}>A/c XXXXXX7731 · IFSC KVGB0001234</div>
          </div>
          <div className="panel pad" style={{ marginBottom: 18 }}>
            <div className="lbl">Collected from (person name)</div>
            <input className="input" value={collectedFrom} onChange={e => setCollectedFrom(e.target.value)} placeholder="Name of person who paid" style={{ marginBottom: 18 }} />
            <div className="lbl">Live location</div>
            {location ? (
              <div style={{ display:'flex', alignItems:'center', gap:10, border:'1px solid var(--g800)', borderRadius:12, padding:'10px 14px', background:'var(--green-bg)', marginBottom:14 }}>
                <span style={{ fontSize:13, flex:1 }}>📍 {location.lat}, {location.lng}</span>
                <button style={{ border:0, background:'none', color:'var(--red-tx)', cursor:'pointer', fontSize:12 }} onClick={() => setLocation(null)}>✕</button>
              </div>
            ) : (
              <button className="btn outline" style={{ marginBottom:14, width:'100%' }} onClick={captureLocation} disabled={locLoading}>
                {locLoading ? 'Getting location…' : '📍 Capture Live Location'}
              </button>
            )}
            <div className="lbl">Photo proof</div>
            {photoPreview ? (
              <div style={{ marginBottom:14 }}>
                <img src={photoPreview} alt="proof" style={{ width:'100%', maxHeight:200, objectFit:'cover', borderRadius:12, border:'1px solid var(--line)' }} />
                <button style={{ border:0, background:'none', color:'var(--red-tx)', cursor:'pointer', fontSize:13, marginTop:6 }} onClick={() => { setPhoto(null); setPhotoPreview(null); }}>✕ Remove photo</button>
              </div>
            ) : (
              <label style={{ display:'block', border:'1.5px dashed var(--line)', borderRadius:12, padding:14, textAlign:'center', cursor:'pointer', fontSize:13, color:'var(--muted)', marginBottom:14 }}>
                📷 Take / Upload Photo (JPG/PNG, max 5MB)
                <input type="file" accept="image/jpeg,image/png" capture="environment" style={{ display:'none' }} onChange={handlePhoto} />
              </label>
            )}
          </div>
        </div>
        <div>
          <div className="panel pad">
            <div className="lbl">Amount deposited (₹)</div>
            <div className="amt-input"><span>₹</span><input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" /></div>
            <div className="chips" style={{ marginBottom: 18 }}>
              {['Bank counter', 'CDM', 'UPI to society', 'Handed to office'].map((h) => (
                <button key={h} className={`chip ${how === h ? 'active' : ''}`} onClick={() => setHow(h)}>{h}</button>
              ))}
            </div>
            <div className="lbl">Bank reference / slip number</div>
            <input className="input mono" value={reference} onChange={e => setReference(e.target.value)} placeholder="e.g. KVGB/HBL/081026/0087" style={{ marginBottom: 18 }} />
            <button className="btn block" style={{ padding: 18, fontSize: 18 }} onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Submitting…' : 'Submit for verification'}
            </button>
            <p className="muted" style={{ textAlign: 'center', fontSize: 14, margin: '10px 0 0' }}>Accountable Officer is emailed · today's entries lock</p>
          </div>
        </div>
      </div>
    </>
  );
}

/* ---------- 7. Targets ---------- */
export function Targets() {
  const [targets, setTargets] = useState([]);
  const user = JSON.parse(localStorage.getItem('mlc_user') || '{"name":"Collector","id":"COL-001"}');
  useEffect(() => { Promise.resolve().then(() => api.getTargets().then(setTargets).catch(() => {})); }, []);
  const myTarget = targets.find(t => t.collectorId === user.id) || null;
  return (
    <>
      <PageHeader title="My targets" sub={new Date().toLocaleDateString('en-IN', { month:'long', year:'numeric' })} />
      {myTarget ? (
        <div className="panel pad">
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:18 }}>
            {[['New applicants', myTarget.newApplicants],['Approvals', myTarget.approvals],['Approved value', myTarget.approvedValue ? '₹'+myTarget.approvedValue : '–'],['Collection', myTarget.collection ? '₹'+myTarget.collection : '–'],['Efficiency target', myTarget.efficiency ? myTarget.efficiency+'%' : '–']].map(([k,v]) => (
              <div key={k}>
                <div className="eyebrow" style={{ fontSize:11 }}>{k}</div>
                <div className="mono" style={{ fontSize:28, fontWeight:700 }}>{v || '–'}</div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="panel pad" style={{ textAlign:'center', padding:48 }}>
          <p className="muted">No targets set for you yet. Contact your admin.</p>
        </div>
      )}
    </>
  );
}
