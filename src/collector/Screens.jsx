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
  const user = JSON.parse(localStorage.getItem('mlc_user') || '{"name":"Collector","id":"COL-001"}');
  useEffect(() => {
    Promise.resolve().then(() => api.getCollections({ collectorId: user.id })
      .then(setCollections).finally(() => setLoading(false)));
  }, []);
  const total = collections.reduce((s, c) => s + (Number(c.amount) || 0), 0);
  return (
    <>
      <PageHeader title="Today's collections" sub={new Date().toLocaleDateString('en-IN', { weekday:'short', day:'2-digit', month:'short', year:'numeric' })} />
      {loading ? (
        <div className="panel pad" style={{ textAlign:'center', padding:48 }}><p className="muted">Loading…</p></div>
      ) : collections.length === 0 ? (
        <div className="panel pad" style={{ textAlign:'center', padding:48 }}>
          <p className="muted">No collections recorded yet. Use <b>Record</b> to add entries.</p>
        </div>
      ) : (
        <div className="panel scroll-x" style={{ marginBottom: 18 }}>
          <table className="dtable">
            <thead><tr><th>Member</th><th className="r">Amount</th><th>Mode</th><th>Reference</th><th>Date</th></tr></thead>
            <tbody>{collections.map(c => (
              <tr key={c.id}>
                <td><b>{c.memberName}</b></td>
                <td className="r mono">₹{Number(c.amount).toLocaleString('en-IN')}</td>
                <td>{c.mode}</td>
                <td className="mono" style={{ fontSize:12 }}>{c.reference || '–'}</td>
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
    </>
  );
}

/* ---------- 4. Customer profile ---------- */
export function Customer() {
  const [members, setMembers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
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
export function Record() {
  const [mode, setMode] = useState('Cash');
  const [amount, setAmount] = useState('');
  const [memberName, setMemberName] = useState('');
  const [memberSearch, setMemberSearch] = useState('');
  const [members, setMembers] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [reference, setReference] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const nav = useNavigate();
  const user = JSON.parse(localStorage.getItem('mlc_user') || '{"name":"Collector","id":"COL-001"}');

  useEffect(() => { api.getMembers({ collectorId: user.id }).then(setMembers).catch(() => {}); }, []);

  const suggestions = memberSearch.length > 0
    ? members.filter(m => [m.name, m.mobile, m.memberId].some(v => v && v.toLowerCase().includes(memberSearch.toLowerCase()))).slice(0, 6)
    : [];

  async function handleSave() {
    if (!amount || !memberName.trim()) { alert('Enter member name and amount'); return; }
    setSaving(true);
    try {
      await Promise.resolve().then(() => api.saveCollection({
        collectorId: user.id,
        collectorName: user.name,
        memberName,
        amount,
        mode,
        reference,
        date: new Date().toLocaleDateString('en-IN'),
      }));
      setSaved(true);
    } catch (e) { alert('Error: ' + e.message); }
    finally { setSaving(false); }
  }

  if (saved) return (
    <div style={{ maxWidth:500, margin:'60px auto', textAlign:'center' }}>
      <div style={{ fontSize:64 }}>&#10003;</div>
      <h2 style={{ marginTop:16 }}>Collection Saved!</h2>
      <p className='muted'>₹{amount} recorded for {memberName}</p>
      <button className='btn gold' style={{ marginTop:20 }} onClick={() => { setSaved(false); setAmount(''); setMemberName(''); setMemberSearch(''); setReference(''); }}>Record Another</button>
      <Link to='/app/collect' className='btn outline' style={{ marginTop:10, display:'block' }}>Back to Collections</Link>
    </div>
  );

  return (
    <>
      <PageHeader title="Record collection" sub={user.name} />
      <div className="cols">
        <div>
          <div className="panel pad" style={{ marginBottom: 18 }}>
            <div className="lbl">Member name</div>
            <div style={{ position: 'relative', marginBottom: 14 }}>
              {memberName ? (
                <div style={{ display:'flex', alignItems:'center', gap:10, border:'1px solid var(--g800)', borderRadius:14, padding:'10px 14px', background:'var(--green-bg)' }}>
                  <span style={{ flex:1, fontSize:15, fontWeight:600 }}>{memberName}</span>
                  <button style={{ border:0, background:'none', color:'var(--red-tx)', cursor:'pointer', fontSize:13, fontWeight:700 }} onClick={() => { setMemberName(''); setMemberSearch(''); }}>✕ Change</button>
                </div>
              ) : (
                <>
                  <input className="input" value={memberSearch} onChange={e => { setMemberSearch(e.target.value); setShowSuggestions(true); }} onFocus={() => setShowSuggestions(true)} onBlur={() => setTimeout(() => setShowSuggestions(false), 150)} placeholder="Search member name, mobile, ID…" />
                  {showSuggestions && suggestions.length > 0 && (
                    <div style={{ position:'absolute', top:'100%', left:0, right:0, background:'#fff', border:'1px solid var(--line)', borderRadius:14, boxShadow:'0 8px 24px rgba(0,0,0,.12)', zIndex:20, overflow:'hidden', marginTop:4 }}>
                      {suggestions.map(m => (
                        <div key={m.memberId} style={{ padding:'12px 16px', cursor:'pointer', borderBottom:'1px solid var(--line)', fontSize:14 }}
                          onMouseDown={() => { setMemberName(m.name); setMemberSearch(''); setShowSuggestions(false); }}>
                          <b>{m.name}</b>
                          <span style={{ color:'var(--muted)', fontSize:12, marginLeft:10 }}>{m.memberId} · {m.mobile}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {showSuggestions && memberSearch.length > 0 && suggestions.length === 0 && (
                    <div style={{ position:'absolute', top:'100%', left:0, right:0, background:'#fff', border:'1px solid var(--line)', borderRadius:14, padding:'12px 16px', zIndex:20, marginTop:4, fontSize:14, color:'var(--muted)' }}>No members found</div>
                  )}
                </>
              )}
            </div>
            <div className="lbl">Amount received (₹)</div>
            <div className="amt-input"><span>₹</span><input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" /></div>
          </div>
        </div>
        <div>
          <div className="panel pad" style={{ marginBottom: 18 }}>
            <div className="lbl">Payment mode</div>
            <div className="toggle2">
              {['Cash', 'PhonePe'].map((m) => (
                <button key={m} className={mode === m ? 'on' : ''} onClick={() => setMode(m)}>{m}</button>
              ))}
            </div>
            {mode === 'PhonePe' && (
              <>
                <div className="lbl" style={{ marginTop:14 }}>UTR / transaction ID</div>
                <input className="input mono" value={reference} onChange={e => setReference(e.target.value)} placeholder="e.g. T2610081842" />
              </>
            )}
          </div>
          <div className="panel pad">
            <button className="btn block" style={{ padding: 18, fontSize: 18 }} onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : `Save ₹${amount || 0} · ${mode}`}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

/* ---------- 5. Loan account ---------- */
export function LoanAccount() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
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
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const user = JSON.parse(localStorage.getItem('mlc_user') || '{"name":"Collector","id":"COL-001"}');

  async function handleSubmit() {
    if (!amount || !reference.trim()) { alert('Enter amount and reference'); return; }
    setSubmitting(true);
    try {
      await Promise.resolve().then(() => api.saveDeposit({
        collectorId: user.id,
        collectorName: user.name,
        amount,
        method: how,
        reference,
        date: new Date().toLocaleDateString('en-IN'),
        status: 'To verify',
      }));
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
