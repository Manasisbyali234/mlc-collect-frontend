import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';
export { LoanApplications, ApplicationDetail } from './LoanApplicationScreens.jsx';

const Pill = ({ c, children }) => <span className={`pill ${c}`}>{children}</span>;
const Switch = ({ on: initial = false }) => {
  const [on, setOn] = useState(initial);
  return <button className={`switch ${on ? 'on' : ''}`} onClick={() => setOn(!on)} aria-pressed={on} />;
};

/* =============== Dashboard =============== */
export function Dashboard() {
  const [stats, setStats] = useState(null);
  const [apps, setApps] = useState([]);
  const nav = useNavigate();
  useEffect(() => {
    api.getDashboard().then(setStats).catch(() => {});
    api.getApplications().then(setApps).catch(() => {});
  }, []);

  async function handleAutoNpa() {
    try {
      const r = await api.autoNpa();
      alert(r.count > 0 ? `${r.count} loan(s) flagged as NPA: ${r.flagged.join(', ')}` : 'No new NPA accounts found.');
      api.getDashboard().then(setStats).catch(() => {});
    } catch (e) { alert('Error: ' + e.message); }
  }

  const kpis = [
    ['Members (CIF)', stats ? stats.totalMembers : '–', 'registered members', '/admin/customers'],
    ['Loan Applications', stats ? stats.totalApplications : '–', 'all time', '/admin/loan-applications'],
    ['Pending Approval', stats ? stats.pendingApproval : '–', 'awaiting review', '/admin/loan-applications?status=Pending+Admin+Approval'],
    ['Approved', stats ? stats.approved : '–', 'approved loans', '/admin/loan-applications?status=Approved'],
    ['Disbursed', stats ? stats.disbursed : '–', 'disbursed loans', '/admin/loan-applications?status=Disbursed'],
    ['Total Collected', stats ? '₹' + stats.totalCollected.toLocaleString('en-IN') : '–', 'all collections', '/admin/collections'],
    ['Deposits to verify', stats ? stats.pendingDeposits : '–', 'pending verification', '/admin/deposits'],
    ['Collectors', stats ? stats.totalCollectors : '–', 'active collectors', '/admin/settings'],
    ['NPA Accounts', stats ? stats.totalNPA : '–', '>10 missed EMIs', '/admin/loan-applications?status=NPA'],
  ];

  return (
    <>
      <div className="a-title">
        <div><h1>Organisation dashboard</h1><p>All branches · live data</p></div>
        <div style={{ display:'flex', gap:10, alignItems:'center' }}>
          <button className="btn sm outline-red" onClick={handleAutoNpa}>⚑ Auto-flag NPA</button>
          <select className="sel"><option>All branches</option></select>
        </div>
      </div>

      <div className="kpis">
        {kpis.map(([a, b, c, route]) => (
          <div className="kpi stat-card" key={a} onClick={() => nav(route)} role="button" tabIndex={0} onKeyDown={e => e.key === 'Enter' && nav(route)}>
            <div className="eb">{a}</div><div className="v">{b}</div><small>{c}</small>
          </div>
        ))}
      </div>

      <div className="panel scroll-x" style={{ marginTop: 18 }}>
        <div className="panel-head"><h3>Recent Loan Applications</h3><Link to="/admin/loan-applications" className="link" style={{ fontSize:13 }}>View all</Link></div>
        {apps.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center' }}><p className="muted">No applications yet.</p></div>
        ) : (
          <table className="dtable">
            <thead><tr><th>App ID</th><th>Member</th><th>Collector</th><th>Loan Type</th><th className="r">Amount</th><th>Date</th><th>Status</th></tr></thead>
            <tbody>{apps.slice(-10).reverse().map(a => {
              const sc = { Draft:'grey', 'Pending Admin Approval':'yellow', 'Under Review':'yellow', Approved:'green', Rejected:'red', Disbursed:'green', NPA:'red', Recovery:'red', Recovered:'green', 'Written Off':'grey' };
              return (
                <tr key={a.appId}>
                  <td className="mono" style={{ fontSize:13 }}>{a.appId}</td>
                  <td><b>{a.memberName}</b><div className="muted" style={{ fontSize:12 }}>{a.memberId}</div></td>
                  <td>{a.collectorName}</td>
                  <td>{a.loanType}</td>
                  <td className="r mono">Rs.{a.loanAmount}</td>
                  <td className="mono" style={{ fontSize:13 }}>{a.date}</td>
                  <td><span className={'pill ' + (sc[a.status] || 'grey')}>{a.status}</span></td>
                </tr>
              );
            })}</tbody>
          </table>
        )}
      </div>
    </>
  );
}

/* =============== Alerts =============== */
export function Alerts() {
  const [apps, setApps] = useState([]);
  useEffect(() => {
    api.getApplications().then(d => setApps(d.filter(a => a.status === 'Pending Admin Approval' || a.status === 'Under Review'))).catch(() => {});
  }, []);
  return (
    <>
      <div className="a-title">
        <div>
          <h1>Pending Review <span style={{ color: 'var(--yellow-tx)' }}>{apps.length}</span></h1>
          <p>Applications awaiting admin action</p>
        </div>
      </div>
      <div className="panel scroll-x">
        {apps.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center' }}><p className="muted">No pending applications.</p></div>
        ) : (
          <table className="dtable">
            <thead><tr><th>App ID</th><th>Member</th><th>Collector</th><th className="r">Amount</th><th>Date</th><th>Status</th><th></th></tr></thead>
            <tbody>{apps.map(a => (
              <tr key={a.appId}>
                <td className="mono" style={{ fontSize:13 }}>{a.appId}</td>
                <td><b>{a.memberName}</b><div className="muted" style={{ fontSize:12 }}>{a.memberId}</div></td>
                <td>{a.collectorName}</td>
                <td className="r mono">Rs.{a.loanAmount}</td>
                <td className="mono" style={{ fontSize:13 }}>{a.date}</td>
                <td><Pill c="yellow">{a.status}</Pill></td>
                <td><Link to={'/admin/loan-applications/' + a.appId} className="btn sm">Review</Link></td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>
    </>
  );
}

/* =============== Customer profile =============== */
export function CustomerProfile() {
  const [members, setMembers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const nav = useNavigate();
  useEffect(() => { api.getMembers().then(setMembers).finally(() => setLoading(false)); }, []);
  const filtered = members.filter(m => {
    const q = search.toLowerCase();
    return !q || [m.name, m.mobile, m.memberId, m.aadhaar].some(v => v && v.toLowerCase().includes(q));
  });
  return (
    <>
      <div className="a-title">
        <div><h1>Customers (CIF)</h1><p>{members.length} registered members</p></div>
      </div>
      <input className="search" style={{ marginBottom: 16 }} placeholder="Search name, mobile, member ID, Aadhaar…" value={search} onChange={e => setSearch(e.target.value)} />
      {loading ? (
        <div className="panel pad" style={{ textAlign:'center', padding:48 }}><p className="muted">Loading…</p></div>
      ) : filtered.length === 0 ? (
        <div className="panel pad" style={{ textAlign:'center', padding:48 }}><p className="muted">{search ? 'No members match your search.' : 'No members registered yet.'}</p></div>
      ) : (
        <div className="panel scroll-x">
          <table className="dtable">
            <thead><tr><th>Member ID</th><th>Name</th><th>Mobile</th><th>Aadhaar</th><th>PAN</th><th>Village/City</th><th>District</th><th></th></tr></thead>
            <tbody>{filtered.map(m => (
              <tr key={m.memberId} style={{ cursor:'pointer' }} onClick={() => nav('/admin/customers/' + m.memberId)}>
                <td className="mono" style={{ fontSize:13 }}>{m.memberId}</td>
                <td><b>{m.name}</b></td>
                <td className="mono">{m.mobile}</td>
                <td className="mono">XXXX XXXX {(m.aadhaar || '').slice(-4)}</td>
                <td className="mono">{m.pan}</td>
                <td>{m.village}</td>
                <td>{m.district}</td>
                <td><button className="btn sm" onClick={e => { e.stopPropagation(); nav('/admin/customers/' + m.memberId); }}>View Loans</button></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </>
  );
}

/* =============== Member Loan Detail =============== */
export function MemberDetail() {
  const { memberId } = useParams();
  const [member, setMember] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const nav = useNavigate();
  const SC = { Draft:'grey', 'Pending Admin Approval':'yellow', 'Under Review':'yellow', Sanctioned:'yellow', Approved:'green', Rejected:'red', Disbursed:'green', NPA:'red', Recovery:'red', Recovered:'green', 'Written Off':'grey' };

  useEffect(() => {
    Promise.all([api.getMember(memberId), api.getMemberLoans(memberId)])
      .then(([m, d]) => { setMember(m); setData(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [memberId]);

  if (loading) return <div className="panel pad" style={{ textAlign:'center', padding:48 }}><p className="muted">Loading…</p></div>;
  if (!member) return <div><p className="muted">Member not found.</p><button className="btn outline sm" onClick={() => nav('/admin/customers')}>Back</button></div>;

  return (
    <>
      <div className="a-title">
        <div>
          <h1>{member.name}</h1>
          <p>{member.memberId} · {member.mobile} · {member.village}{member.district ? ', ' + member.district : ''}</p>
        </div>
        <button className="btn outline sm" onClick={() => nav('/admin/customers')}>← Back</button>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:20 }}>
        {[
          ['Total Loans', data.count, 'all time'],
          ['Total Loan Amount', '₹' + data.totalLoanAmount.toLocaleString('en-IN'), 'sanctioned'],
          ['Total Paid', '₹' + data.totalPaidAll.toLocaleString('en-IN'), 'collected'],
          ['Outstanding', '₹' + (data.totalLoanAmount - data.totalPaidAll).toLocaleString('en-IN'), 'pending'],
        ].map(([label, val, sub]) => (
          <div key={label} className="panel pad" style={{ textAlign:'center' }}>
            <div className="eyebrow" style={{ fontSize:11 }}>{label}</div>
            <div className="mono" style={{ fontSize:26, fontWeight:700, margin:'6px 0 2px' }}>{val}</div>
            <div className="muted" style={{ fontSize:12 }}>{sub}</div>
          </div>
        ))}
      </div>

      {data.loans.length === 0 ? (
        <div className="panel pad" style={{ textAlign:'center', padding:48 }}><p className="muted">No loans found for this member.</p></div>
      ) : (
        <div className="panel scroll-x">
          <div className="panel-head"><h3>Loan History</h3></div>
          <table className="dtable">
            <thead><tr><th>App ID</th><th>Loan ID</th><th>Loan Type</th><th className="r">Amount</th><th className="r">Paid</th><th className="r">Pending</th><th>Date</th><th>Disbursal</th><th>Status</th><th></th></tr></thead>
            <tbody>{data.loans.map(l => (
              <tr key={l.appId}>
                <td className="mono" style={{ fontSize:12 }}>{l.appId}</td>
                <td className="mono" style={{ fontSize:12 }}>{l.loanId || '–'}</td>
                <td>{l.loanType}</td>
                <td className="r mono">₹{l.loanAmount.toLocaleString('en-IN')}</td>
                <td className="r mono" style={{ color:'var(--green-tx)' }}>₹{l.totalPaid.toLocaleString('en-IN')}</td>
                <td className="r mono" style={{ color: l.pending > 0 ? 'var(--red-tx)' : 'inherit' }}>₹{l.pending.toLocaleString('en-IN')}</td>
                <td className="mono" style={{ fontSize:12 }}>{l.date}</td>
                <td className="mono" style={{ fontSize:12 }}>{l.disbursalDate || '–'}</td>
                <td><span className={'pill ' + (SC[l.status] || 'grey')}>{l.status}</span></td>
                <td><Link to={'/admin/loan-applications/' + l.appId} className="btn sm">View</Link></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </>
  );
}

/* =============== Open a loan account =============== */
export function OpenLoan() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { api.getLoanAccounts().then(setAccounts).finally(() => setLoading(false)); }, []);
  return (
    <>
      <div className="a-title"><div><h1>Loan accounts</h1><p>{accounts.length} total loan accounts</p></div></div>
      {loading ? (
        <div className="panel pad" style={{ textAlign:'center', padding:48 }}><p className="muted">Loading…</p></div>
      ) : accounts.length === 0 ? (
        <div className="panel pad" style={{ textAlign:'center', padding:48 }}><p className="muted">No loan accounts yet. Approve and disburse applications to create loan accounts.</p></div>
      ) : (
        <div className="panel scroll-x">
          <table className="dtable">
            <thead><tr><th>Loan ID</th><th>Member</th><th>Loan Type</th><th className="r">Amount</th><th>Collector</th><th>Date</th></tr></thead>
            <tbody>{accounts.map(a => (
              <tr key={a.id}>
                <td className="mono" style={{ fontSize:13 }}>{a.id}</td>
                <td><b>{a.memberName}</b></td>
                <td>{a.loanType}</td>
                <td className="r mono">Rs.{a.loanAmount}</td>
                <td>{a.collectorName}</td>
                <td className="mono" style={{ fontSize:13 }}>{a.date}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </>
  );
}

/* =============== Collection grid =============== */
export function CollectionGrid() {
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterCollector, setFilterCollector] = useState('');
  const [filterMode, setFilterMode] = useState('');
  const [viewPhoto, setViewPhoto] = useState(null);

  useEffect(() => { api.getCollections().then(setCollections).finally(() => setLoading(false)); }, []);

  const collectors = [...new Set(collections.map(c => c.collectorName).filter(Boolean))];
  const modes = [...new Set(collections.map(c => c.mode).filter(Boolean))];

  const filtered = collections.filter(c => {
    const q = search.toLowerCase();
    if (q && ![
      c.memberName, c.memberId, c.appId, c.collectorName, c.reference
    ].some(v => v && v.toLowerCase().includes(q))) return false;
    if (filterDate && c.date !== filterDate && c.collectionDate !== filterDate) return false;
    if (filterCollector && c.collectorName !== filterCollector) return false;
    if (filterMode && c.mode !== filterMode) return false;
    return true;
  });

  const total = filtered.reduce((s, c) => s + (Number(c.amount) || 0), 0);
  const cash = filtered.filter(c => c.mode === 'Cash').reduce((s, c) => s + (Number(c.amount) || 0), 0);
  const upi = filtered.filter(c => c.mode !== 'Cash').reduce((s, c) => s + (Number(c.amount) || 0), 0);

  return (
    <>
      <div className="a-title">
        <div><h1>Daily Collections</h1><p>{filtered.length} entries · ₹{total.toLocaleString('en-IN')} total</p></div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14, marginBottom:18 }}>
        {[['Total Collected','₹'+total.toLocaleString('en-IN'),filtered.length+' entries'],['Cash','₹'+cash.toLocaleString('en-IN'),filtered.filter(c=>c.mode==='Cash').length+' entries'],['PhonePe / UPI','₹'+upi.toLocaleString('en-IN'),filtered.filter(c=>c.mode!=='Cash').length+' entries']].map(([l,v,s]) => (
          <div key={l} className="panel pad" style={{ textAlign:'center' }}>
            <div className="eyebrow" style={{ fontSize:11 }}>{l}</div>
            <div className="mono" style={{ fontSize:26, fontWeight:700, margin:'4px 0 2px' }}>{v}</div>
            <div className="muted" style={{ fontSize:12 }}>{s}</div>
          </div>
        ))}
      </div>

      <div className="panel pad" style={{ marginBottom:18, display:'flex', gap:12, flexWrap:'wrap', alignItems:'flex-end' }}>
        <div style={{ flex:'1 1 180px' }}>
          <div style={{ fontSize:12, fontWeight:600, color:'var(--muted)', marginBottom:5 }}>Search</div>
          <input className="input" style={{ padding:'9px 12px', fontSize:13 }} placeholder="Member, App ID, collector…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div style={{ flex:'0 0 160px' }}>
          <div style={{ fontSize:12, fontWeight:600, color:'var(--muted)', marginBottom:5 }}>Date</div>
          <input className="input" type="date" style={{ padding:'9px 12px', fontSize:13 }} value={filterDate} onChange={e => setFilterDate(e.target.value)} />
        </div>
        <div style={{ flex:'0 0 160px' }}>
          <div style={{ fontSize:12, fontWeight:600, color:'var(--muted)', marginBottom:5 }}>Collector</div>
          <select className="input" style={{ padding:'9px 12px', fontSize:13 }} value={filterCollector} onChange={e => setFilterCollector(e.target.value)}>
            <option value=''>All collectors</option>
            {collectors.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div style={{ flex:'0 0 130px' }}>
          <div style={{ fontSize:12, fontWeight:600, color:'var(--muted)', marginBottom:5 }}>Mode</div>
          <select className="input" style={{ padding:'9px 12px', fontSize:13 }} value={filterMode} onChange={e => setFilterMode(e.target.value)}>
            <option value=''>All modes</option>
            {modes.map(m => <option key={m}>{m}</option>)}
          </select>
        </div>
        {(search || filterDate || filterCollector || filterMode) && (
          <button className="btn outline sm" style={{ alignSelf:'flex-end' }} onClick={() => { setSearch(''); setFilterDate(''); setFilterCollector(''); setFilterMode(''); }}>Clear</button>
        )}
      </div>

      {loading ? (
        <div className="panel pad" style={{ textAlign:'center', padding:48 }}><p className="muted">Loading…</p></div>
      ) : filtered.length === 0 ? (
        <div className="panel pad" style={{ textAlign:'center', padding:48 }}><p className="muted">{collections.length === 0 ? 'No collections recorded yet.' : 'No entries match your filters.'}</p></div>
      ) : (
        <div className="panel scroll-x">
          <table className="dtable">
            <thead>
              <tr>
                <th>Member</th>
                <th>App ID</th>
                <th>Collector</th>
                <th className="r">Amount</th>
                <th>Mode</th>
                <th>Remarks</th>
                <th>Date</th>
                <th>Location</th>
                <th>Photo</th>
              </tr>
            </thead>
            <tbody>{filtered.map(c => (
              <tr key={c.id}>
                <td><b>{c.memberName}</b><div className="muted" style={{ fontSize:12 }}>{c.memberId}</div></td>
                <td className="mono" style={{ fontSize:12 }}>{c.appId || '–'}</td>
                <td style={{ fontSize:13 }}>{c.collectorName}</td>
                <td className="r mono" style={{ fontWeight:700 }}>₹{Number(c.amount).toLocaleString('en-IN')}</td>
                <td><span className={'pill ' + (c.mode === 'Cash' ? 'green' : 'yellow')}>{c.mode}</span></td>
                <td style={{ fontSize:13, color:'var(--muted)' }}>{c.reference || '–'}</td>
                <td className="mono" style={{ fontSize:13 }}>{c.date}</td>
                <td style={{ fontSize:12 }}>
                  {c.location ? (
                    <a href={`https://maps.google.com/?q=${c.location.lat},${c.location.lng}`} target="_blank" rel="noreferrer" style={{ color:'var(--green-tx)' }}>📍 View</a>
                  ) : '–'}
                </td>
                <td>
                  {c.photo ? (
                    <button className="btn sm" onClick={() => setViewPhoto(c.photo)}>View</button>
                  ) : '–'}
                </td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}

      {viewPhoto && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.7)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center' }} onClick={() => setViewPhoto(null)}>
          <div style={{ background:'#fff', borderRadius:16, padding:16, maxWidth:'90vw', maxHeight:'90vh' }} onClick={e => e.stopPropagation()}>
            <img src={viewPhoto} alt="payment proof" style={{ maxWidth:'80vw', maxHeight:'80vh', borderRadius:10, display:'block' }} />
            <button className="btn outline" style={{ marginTop:12, width:'100%' }} onClick={() => setViewPhoto(null)}>Close</button>
          </div>
        </div>
      )}
    </>
  );
}

/* =============== Deposit verification =============== */
export function DepositVerification() {
  const [deposits, setDeposits] = useState([]);
  const [viewPhoto, setViewPhoto] = useState(null);
  useEffect(() => { api.getDeposits().then(setDeposits).catch(() => {}); }, []);
  const pending = deposits.filter(d => d.status === 'To verify').length;
  const mismatches = deposits.filter(d => d.status === 'Mismatch').length;
  return (
    <>
      <div className="a-title"><div><h1>Deposit verification</h1><p>Match each collector's deposit to the customer-wise collections for that day</p></div></div>
      <div className="panel" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', padding: 22, marginBottom: 18 }}>
        {[['Waiting to verify', pending, ''], ['Mismatches', mismatches, '', 'var(--red-tx)'], ['Total deposits', deposits.length, 'all time']].map(([a, b, c, col]) => (
          <div key={a}><div className="eyebrow" style={{ fontSize: 11 }}>{a}</div><div className="mono" style={{ fontSize: 28, fontWeight: 700, color: col }}>{b}</div><small className="muted">{c}</small></div>
        ))}
      </div>
      <div className="panel scroll-x">
        <div className="panel-head"><h3>All deposits</h3></div>
        {deposits.length === 0 ? (
          <div style={{ padding:32, textAlign:'center' }}><p className="muted">No deposits submitted yet.</p></div>
        ) : (
          <table className="dtable">
            <thead><tr><th>Collector</th><th>Collected From</th><th>Date</th><th className="r">Amount</th><th>Method</th><th>Reference</th><th>Location</th><th>Photo</th><th>Status</th></tr></thead>
            <tbody>
              {deposits.map((d) => (
                <tr key={d.id}>
                  <td><b>{d.collectorName}</b></td>
                  <td>{d.collectedFrom || '–'}</td>
                  <td className="mono">{d.date}</td>
                  <td className="r mono">₹{Number(d.amount).toLocaleString('en-IN')}</td>
                  <td>{d.method}</td>
                  <td className="mono" style={{ fontSize:13 }}>{d.reference}</td>
                  <td style={{ fontSize:12 }}>
                    {d.location ? (
                      <a href={`https://maps.google.com/?q=${d.location.lat},${d.location.lng}`} target="_blank" rel="noreferrer" style={{ color:'var(--green-tx)' }}>
                        📍 {d.location.lat}, {d.location.lng}
                      </a>
                    ) : '–'}
                  </td>
                  <td>
                    {d.photo ? (
                      <button className="btn sm" onClick={() => setViewPhoto(d.photo)}>View</button>
                    ) : '–'}
                  </td>
                  <td><Pill c={d.status === 'Verified' ? 'green' : d.status === 'Mismatch' ? 'red' : 'yellow'}>{d.status}</Pill></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {viewPhoto && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.7)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center' }} onClick={() => setViewPhoto(null)}>
          <div style={{ background:'#fff', borderRadius:16, padding:16, maxWidth:'90vw', maxHeight:'90vh' }} onClick={e => e.stopPropagation()}>
            <img src={viewPhoto} alt="deposit proof" style={{ maxWidth:'80vw', maxHeight:'80vh', borderRadius:10, display:'block' }} />
            <button className="btn outline" style={{ marginTop:12, width:'100%' }} onClick={() => setViewPhoto(null)}>Close</button>
          </div>
        </div>
      )}
    </>
  );
}

/* =============== Settings =============== */
export function Settings() {
  const [users, setUsers] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ name: '', role: 'collector', mobile: '', branch: '', password: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function load() { api.getUsers().then(setUsers).catch(() => {}); }
  useEffect(load, []);

  function openAdd() { setForm({ name: '', role: 'collector', mobile: '', branch: '', password: '' }); setError(''); setModal(true); }

  async function handleSave() {
    if (!form.name || !form.mobile || !form.password) return setError('Name, mobile and password are required.');
    setSaving(true); setError('');
    try {
      await api.createUser(form);
      load();
      setModal(false);
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  }

  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));
  const side = ['Users & roles', 'Loan products', 'Numbering (CIF, account)', 'Status rules & alerts', 'Targets', 'Holidays', 'Email & OTP', 'Branches & areas', 'Reports', 'Audit log'];
  const Card = ({ t, children }) => (
    <div className="panel pad kv-list"><h3 style={{ fontSize: 18, marginBottom: 6 }}>{t}</h3>{children}</div>
  );
  const KV = ({ k, v }) => <div className="kv"><span className="sans">{k}</span><span className="sans" style={{ fontFamily: v && /^[\d≥<>]/.test(v) ? 'var(--mono)' : undefined }}>{v}</span></div>;
  const SW = ({ k, on }) => <div className="kv" style={{ alignItems: 'center' }}><span className="sans">{k}</span><Switch on={on} /></div>;
  return (
    <div className="settings">
      <aside className="side">
        <div className="eyebrow" style={{ fontSize: 11, padding: '0 14px 10px' }}>Settings</div>
        {side.map((s, i) => <a key={s} href="#" className={i === 0 ? 'active' : ''}>{s}</a>)}
      </aside>
      <div>
        <div className="a-title">
          <div><h1>Users &amp; roles</h1><p>{users.length} users</p></div>
          <button className="btn sm" onClick={openAdd}>+ Add user</button>
        </div>
        <div className="panel scroll-x">
          <table className="dtable">
            <thead><tr><th>Name</th><th>Role</th><th>Branch / Area</th><th>Mobile</th><th>Status</th></tr></thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td><b>{u.name}</b></td><td>{u.role}</td><td>{u.branch}</td><td className="mono">{u.mobile}</td>
                  <td><Pill c="green">Active</Pill></td>
                </tr>
              ))}
              {users.length === 0 && <tr><td colSpan={5} style={{ textAlign:'center', padding:24 }} className="muted">No users found</td></tr>}
            </tbody>
          </table>
        </div>

        <div className="cards2">
          <Card t="Loan product · Daily 55">
            <KV k="Interest" v="10% flat" /><KV k="Default tenure" v="55 days" />
            <KV k="Max active loans per CIF" v="3" /><KV k="Max exposure per CIF" v="₹25,000" /><SW k="Late fee" />
          </Card>
          <Card t="Status rules">
            <KV k="Collector Green" v="≥ 90% of target" /><KV k="Collector Red" v="< 70%" /><KV k="Account Yellow" v="2–5 days behind" />
            <KV k="Account Red" v="> 5 days or 4 missed in a row" /><KV k="Deposit due within" v="2 days" />
          </Card>
        </div>
      </div>

      {modal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.45)', zIndex:100, display:'flex', alignItems:'center', justifyContent:'center' }} onClick={() => setModal(false)}>
          <div style={{ background:'#fff', borderRadius:18, padding:28, minWidth:360, maxWidth:460, width:'90%' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin:'0 0 18px' }}>Add user</h3>
            {error && <div style={{ color:'var(--red-tx)', background:'var(--red-bg)', padding:'8px 12px', borderRadius:8, marginBottom:14, fontSize:14 }}>{error}</div>}
            <div style={{ display:'grid', gap:12 }}>
              {[['name','Name *','text'],['mobile','Mobile *','tel'],['password','Password *','password'],['branch','Branch / Area','text']].map(([k, lbl, type]) => (
                <div key={k}>
                  <label style={{ fontSize:13, fontWeight:600, color:'var(--muted)', display:'block', marginBottom:5 }}>{lbl}</label>
                  <input className="input" type={type} style={{ padding:'10px 12px' }} value={form[k]} onChange={set(k)} />
                </div>
              ))}
              <div>
                <label style={{ fontSize:13, fontWeight:600, color:'var(--muted)', display:'block', marginBottom:5 }}>Role *</label>
                <select className="input" style={{ padding:'10px 12px' }} value={form.role} onChange={set('role')}>
                  <option value="collector">Collector</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:20 }}>
              <button className="btn outline" onClick={() => setModal(false)}>Cancel</button>
              <button className="btn gold" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* =============== Collector targets =============== */
export function CollectorTargets() {
  const [targets, setTargets] = useState([]);
  const [users, setUsers] = useState([]);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ collectorId:'', newApplicants:'', approvals:'', approvedValue:'', collection:'', efficiency:'', loanAdvance:'', renewalLoans:'' });
  const [saving, setSaving] = useState(false);

  function load() {
    api.getTargets().then(setTargets).catch(() => {});
    api.getUsers().then(u => setUsers(u.filter(x => x.role === 'collector'))).catch(() => {});
  }
  useEffect(load, []);

  function openAdd() {
    setEditing(null);
    setForm({ collectorId:'', newApplicants:'', approvals:'', approvedValue:'', collection:'', efficiency:'', loanAdvance:'', renewalLoans:'' });
    setModal(true);
  }

  function openEdit(u, t) {
    setEditing(t);
    setForm({ collectorId: u.id, newApplicants: t.newApplicants||'', approvals: t.approvals||'', approvedValue: t.approvedValue||'', collection: t.collection||'', efficiency: t.efficiency||'', loanAdvance: t.loanAdvance||'', renewalLoans: t.renewalLoans||'' });
    setModal(true);
  }

  async function handleSave() {
    if (!form.collectorId) return;
    setSaving(true);
    try {
      const user = users.find(u => u.id === form.collectorId);
      await api.saveTarget({ ...form, collectorName: user?.name || '' });
      load();
      setModal(false);
    } catch (e) { alert(e.message); }
    finally { setSaving(false); }
  }

  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));
  const head = ['New applicants', 'Approvals', 'Approved value ₹', 'Collection ₹', 'Efficiency %', 'Loan Advance', 'Renewal Loans'];
  return (
    <>
      <div className="a-title">
        <div><h1>Collector targets</h1><p>Set monthly targets for collectors.</p></div>
        <button className="btn sm" onClick={openAdd}>+ Add target</button>
      </div>
      <div className="panel scroll-x">
        {targets.length === 0 && users.length === 0 ? (
          <div style={{ padding:32, textAlign:'center' }}><p className="muted">No targets set yet.</p></div>
        ) : (
          <table className="dtable">
            <thead><tr><th>Collector</th><th>Branch</th>{head.map(h => <th key={h} className="r">{h}</th>)}<th></th></tr></thead>
            <tbody>
              {users.map(u => {
                const t = targets.find(x => x.collectorId === u.id) || {};
                return (
                  <tr key={u.id}>
                    <td><b>{u.name}</b></td>
                    <td>{u.branch}</td>
                    {['newApplicants','approvals','approvedValue','collection','efficiency','loanAdvance','renewalLoans'].map(k => (
                      <td key={k} className="r mono">{t[k] || '–'}</td>
                    ))}
                    <td><button className="btn sm" onClick={() => openEdit(u, t)}>Edit</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.45)', zIndex:100, display:'flex', alignItems:'center', justifyContent:'center' }} onClick={() => setModal(false)}>
          <div style={{ background:'#fff', borderRadius:18, padding:28, minWidth:360, maxWidth:480, width:'90%' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin:'0 0 18px' }}>{editing?.id ? 'Edit target' : 'Add target'}</h3>
            <div style={{ display:'grid', gap:12 }}>
              <div>
                <label style={{ fontSize:13, fontWeight:600, color:'var(--muted)', display:'block', marginBottom:5 }}>Collector *</label>
                <select className="input" style={{ padding:'10px 12px' }} value={form.collectorId} onChange={set('collectorId')} disabled={!!editing?.id}>
                  <option value=''>Select collector</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.name} — {u.branch}</option>)}
                </select>
              </div>
              {[['newApplicants','New applicants'],['approvals','Approvals'],['approvedValue','Approved value (₹)'],['collection','Collection (₹)'],['efficiency','Efficiency (%)'],['loanAdvance','Loan Advance Target'],['renewalLoans','Renewal Loans']].map(([k, lbl]) => (
                <div key={k}>
                  <label style={{ fontSize:13, fontWeight:600, color:'var(--muted)', display:'block', marginBottom:5 }}>{lbl}</label>
                  <input className="input mono" style={{ padding:'10px 12px' }} value={form[k]} onChange={set(k)} placeholder='0' />
                </div>
              ))}
            </div>
            <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:20 }}>
              <button className="btn outline" onClick={() => setModal(false)}>Cancel</button>
              <button className="btn gold" onClick={handleSave} disabled={saving || !form.collectorId}>{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
