import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';

function SectionHead({ n, title }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, margin:'24px 0 14px' }}>
      <span style={{ width:28,height:28,borderRadius:'50%',background:'var(--g800)',color:'#fff',display:'grid',placeItems:'center',fontWeight:700,fontSize:14,flexShrink:0 }}>{n}</span>
      <h3 style={{ margin:0, fontSize:18 }}>{title}</h3>
    </div>
  );
}

function Field({ label, children, required }) {
  return (
    <div>
      <label style={{ display:'block', fontSize:13, fontWeight:600, color:'var(--muted)', marginBottom:6 }}>
        {label}{required && <span style={{ color:'var(--red-tx)' }}> *</span>}
      </label>
      {children}
    </div>
  );
}

function Inp({ value, onChange, placeholder, type, readOnly, mono }) {
  return (
    <input
      className={'input' + (mono ? ' mono' : '') + (readOnly ? ' ro' : '')}
      style={{ padding:'10px 12px', fontSize:14 }}
      type={type || 'text'} value={value} onChange={onChange}
      placeholder={placeholder} readOnly={readOnly}
    />
  );
}

function Sel({ value, onChange, children }) {
  return <select className='input' style={{ padding:'10px 12px', fontSize:14 }} value={value} onChange={onChange}>{children}</select>;
}

/* ===== Loan Collection Dashboard ===== */
export function LoanCollection() {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const [closingRows, setClosingRows] = useState([]);
  const [closingLoading, setClosingLoading] = useState(false);
  const [mainTab, setMainTab] = useState('loans');
  const activeFilter = searchParams.get('status') || 'All';
  const nav = useNavigate();
  const user = JSON.parse(localStorage.getItem('mlc_user') || '{"name":"Collector","id":"COL-001"}');

  useEffect(() => { api.getApplications({ collectorId: user.id }).then(setApps).finally(() => setLoading(false)); }, []);

  function loadClosing() {
    setClosingLoading(true);
    api.getReportClosing({ collectorId: user.id }).then(setClosingRows).catch(() => setClosingRows([])).finally(() => setClosingLoading(false));
  }
  useEffect(() => { if (mainTab === 'closing') loadClosing(); }, [mainTab]);
  const counts = {
    total: apps.length,
    draft: apps.filter(a => a.status === 'Draft').length,
    pending: apps.filter(a => a.status === 'Pending Admin Approval').length,
    review: apps.filter(a => a.status === 'Under Review').length,
    approved: apps.filter(a => a.status === 'Approved').length,
    rejected: apps.filter(a => a.status === 'Rejected').length,
    disbursed: apps.filter(a => a.status === 'Disbursed').length,
    npa: apps.filter(a => a.status === 'NPA').length,
  };
  const sc = { Draft:'grey', 'Pending Admin Approval':'yellow', 'Under Review':'yellow', Approved:'green', Rejected:'red', Disbursed:'green', NPA:'red', Recovery:'red', Recovered:'green', 'Written Off':'grey' };
  const filteredApps = activeFilter === 'All' ? apps : apps.filter(a => a.status === activeFilter);
  function setFilter(status) { setSearchParams(status === 'All' ? {} : { status }); }
  if (loading) return <div className='panel pad' style={{ textAlign:'center', padding:48 }}><p className='muted'>Loading…</p></div>;
  return (
    <>
      <div className='page-header'>
        <div><h1>Loan Collection</h1><p>Ravi Naik &middot; Collector &middot; Hubballi East</p></div>
        <div className='right'>
          <Link to='/app/loan-collection/new-member' className='btn gold'>+ New Application</Link>
        </div>
      </div>

      <div style={{ display:'flex', gap:0, borderBottom:'2px solid var(--line)', marginBottom:20 }}>
        {[['loans','Loan Applications'],['closing','🔒 Closing Report']].map(([k,l]) => (
          <button key={k} onClick={() => setMainTab(k)}
            style={{ padding:'10px 18px', border:0, borderBottom: mainTab===k ? '2px solid var(--g800)' : '2px solid transparent', background:'transparent', fontWeight: mainTab===k ? 700 : 400, cursor:'pointer', fontSize:13, marginBottom:-2 }}>
            {l}
          </button>
        ))}
      </div>

      {mainTab === 'closing' && (
        closingLoading ? <div className='panel pad' style={{ textAlign:'center', padding:48 }}><p className='muted'>Loading…</p></div> :
        closingRows.length === 0 ? <div className='panel pad' style={{ textAlign:'center', padding:48 }}><p className='muted'>No closed loans yet.</p></div> :
        <div className='panel scroll-x'>
          <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--line)', display:'flex', gap:24 }}>
            <div><div style={{ fontSize:11, color:'var(--muted)' }}>Closed Loans</div><div style={{ fontWeight:700, fontSize:20 }}>{closingRows.length}</div></div>
            <div><div style={{ fontSize:11, color:'var(--muted)' }}>Total Amount</div><div style={{ fontWeight:700, fontSize:20 }}>&#8377;{closingRows.reduce((s,r)=>s+Number(r.loanAmount||0),0).toLocaleString('en-IN')}</div></div>
          </div>
          <table className='dtable'>
            <thead><tr><th>Loan ID</th><th>Member</th><th>Loan Type</th><th className='r'>Amount</th><th className='r'>Total Paid</th><th>Disbursal</th><th>Closed On</th><th>Status</th></tr></thead>
            <tbody>{closingRows.map((r,i) => (
              <tr key={i}>
                <td className='mono' style={{ fontSize:12 }}>{r.loanId}</td>
                <td><b>{r.memberName}</b><div className='muted' style={{ fontSize:12 }}>{r.memberId}</div></td>
                <td>{r.loanType}</td>
                <td className='r mono'>&#8377;{Number(r.loanAmount).toLocaleString('en-IN')}</td>
                <td className='r mono' style={{ color:'var(--green-tx)', fontWeight:700 }}>&#8377;{Number(r.totalPaid).toLocaleString('en-IN')}</td>
                <td className='mono' style={{ fontSize:12 }}>{r.disbursalDate}</td>
                <td className='mono' style={{ fontSize:12 }}>{r.closeDate}</td>
                <td><span className='pill green'>{r.status}</span></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}

      {mainTab === 'loans' && (<>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:14 }}>
        {[['Total','All',counts.total,'#fff'],['Draft','Draft',counts.draft,'var(--soft)'],['Pending','Pending Admin Approval',counts.pending,'var(--yellow-bg)'],['Approved','Approved',counts.approved,'var(--green-bg)']].map(([l,s,v,bg]) => (
          <div key={l} className={'panel pad stat-card' + (activeFilter === s ? ' stat-card-active' : '')} style={{ background:bg }} onClick={() => setFilter(s)} role='button' tabIndex={0} onKeyDown={e => e.key === 'Enter' && setFilter(s)}>
            <div className='eyebrow' style={{ fontSize:11 }}>{l}</div>
            <div className='stat-num'>{v}</div>
          </div>
        ))}
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14, marginBottom:24 }}>
        {[['Under Review','Under Review',counts.review,'var(--yellow-bg)'],['Rejected','Rejected',counts.rejected,'var(--red-bg)'],['Disbursed','Disbursed',counts.disbursed,'var(--green-bg)'],['NPA','NPA',counts.npa,'var(--red-bg)']].map(([l,s,v,bg]) => (
          <div key={l} className={'panel pad stat-card' + (activeFilter === s ? ' stat-card-active' : '')} style={{ background:bg }} onClick={() => setFilter(s)} role='button' tabIndex={0} onKeyDown={e => e.key === 'Enter' && setFilter(s)}>
            <div className='eyebrow' style={{ fontSize:11 }}>{l}</div>
            <div className='stat-num'>{v}</div>
          </div>
        ))}
      </div>
      {activeFilter !== 'All' && (
        <div style={{ marginBottom:14, display:'flex', alignItems:'center', gap:10 }}>
          <span className='pill yellow'>Filtered: {activeFilter}</span>
          <button className='btn sm outline' onClick={() => setFilter('All')}>Clear filter</button>
        </div>
      )}
      {filteredApps.length === 0 ? (
        <div className='panel pad' style={{ textAlign:'center', padding:48 }}>
          <p className='muted'>{apps.length === 0 ? <>No applications yet. Click <b>+ New Application</b> to get started.</> : 'No applications match this filter.'}</p>
        </div>
      ) : (
        <div className='panel scroll-x'>
          <table className='dtable'>
            <thead><tr><th>App ID</th><th>Member</th><th>Mobile</th><th>Loan Type</th><th className='r'>Amount</th><th>Date</th><th>Status</th><th>Loan ID</th><th></th></tr></thead>
            <tbody>{filteredApps.map(a => (
              <tr key={a.appId}>
                <td className='mono' style={{ fontSize:13 }}>{a.appId}</td>
                <td><b>{a.memberName}</b><div className='muted' style={{ fontSize:12 }}>{a.memberId}</div></td>
                <td className='mono'>{a.mobile}</td>
                <td>{a.loanType}</td>
                <td className='r mono'>Rs.{a.loanAmount}</td>
                <td className='mono' style={{ fontSize:13 }}>{a.date}</td>
                <td><span className={'pill ' + (sc[a.status] || 'grey')}>{a.status}</span></td>
                <td className='mono' style={{ fontSize:13 }}>{a.loanId || '--'}</td>
                <td>
                  {a.status === 'Disbursed' && (
                    <button className='btn sm outline-red' onClick={async () => {
                      if (!window.confirm('Mark this loan for recovery? Admin will be notified.')) return;
                      try {
                        await api.updateApplication(a.appId, { status: 'Recovery', statusHistory: [...(a.statusHistory || []), { status: 'Recovery', date: new Date().toLocaleString(), by: user.name }] });
                        setApps(prev => prev.map(x => x.appId === a.appId ? { ...x, status: 'Recovery' } : x));
                      } catch (e) { alert('Error: ' + e.message); }
                    }}>Recovery</button>
                  )}
                </td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </>)}
    </>
  );
}

/* ===== New Member Registration ===== */
function ImageUpload({ label, value, onChange, error, required }) {
  return (
    <Field label={label} required={required}>
      {value ? (
        <div style={{ border:'1px solid var(--g800)', borderRadius:12, padding:'10px 14px', background:'var(--green-bg)' }}>
          <img src={URL.createObjectURL(value)} alt={label} style={{ width:'100%', maxHeight:120, objectFit:'cover', borderRadius:8, marginBottom:6 }} />
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <span style={{ fontSize:13, color:'var(--green-tx)' }}>&#10003; {value.name}</span>
            <button type='button' style={{ border:0, background:'none', color:'var(--red-tx)', cursor:'pointer', fontSize:13 }} onClick={() => onChange(null)}>Remove</button>
          </div>
        </div>
      ) : (
        <label style={{ display:'block', border:'1.5px dashed var(--line)', borderRadius:12, padding:14, textAlign:'center', cursor:'pointer', fontSize:13, color:'var(--muted)' }}>
          + Upload Photo (JPG/PNG, max 5MB)
          <input type='file' accept='.jpg,.jpeg,.png' style={{ display:'none' }} onChange={e => { const file = e.target.files[0]; if (file) onChange(file); }} />
        </label>
      )}
      {error && <span style={{ color:'var(--red-tx)', fontSize:12, display:'block', marginTop:3 }}>{error}</span>}
    </Field>
  );
}

export function NewMemberForm() {
  const nav = useNavigate();
  const [f, setF] = useState({ name:'', mobile:'', altMobile:'', dob:'', gender:'', aadhaar:'', pan:'', occupation:'', address:'', village:'', district:'', state:'', pin:'', nomName:'', nomRel:'', nomMobile:'', nomAddress:'' });
  const [photo, setPhoto] = useState(null);
  const [shopImage, setShopImage] = useState(null);
  const [err, setErr] = useState({});
  const set = k => e => setF(p => ({ ...p, [k]: e.target.value }));
  const E = ({ k }) => err[k] ? <span style={{ color:'var(--red-tx)', fontSize:12, display:'block', marginTop:3 }}>{err[k]}</span> : null;

  function validate() {
    const e = {};
    if (!f.name.trim()) e.name = 'Required';
    if (!/^\d{10}$/.test(f.mobile)) e.mobile = '10-digit mobile required';
    if (!f.dob) e.dob = 'Required';
    if (!f.gender) e.gender = 'Required';
    if (!/^\d{12}$/.test(f.aadhaar)) e.aadhaar = '12-digit Aadhaar required';
    if (!/^[A-Z]{5}\d{4}[A-Z]$/.test(f.pan.toUpperCase())) e.pan = 'Valid PAN required (e.g. ABCDE1234F)';
    if (!f.address.trim()) e.address = 'Required';
    if (!f.pin || f.pin.length !== 6) e.pin = '6-digit PIN required';
    if (!f.nomName.trim()) e.nomName = 'Required';
    if (!f.nomRel.trim()) e.nomRel = 'Required';
    return e;
  }

  async function handleNext(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErr(errs); return; }
    try {
      const formData = new FormData();
      Object.entries({ ...f, pan: f.pan.toUpperCase() }).forEach(([k, v]) => formData.append(k, v));
      if (photo) formData.append('photo', photo);
      if (shopImage) formData.append('shopImage', shopImage);
      const member = await api.createMemberForm(formData);
      nav('/app/loan-collection/apply/' + member.memberId);
    } catch (err) {
      setErr({ aadhaar: err.message });
    }
  }

  return (
    <form onSubmit={handleNext}>
      <div className='page-header'>
        <div><h1>New Member Registration</h1><p>Fill all details to proceed to loan application</p></div>
        <div className='right'><Link to='/app/loan-collection' className='btn outline sm'>Cancel</Link></div>
      </div>
      <div style={{ maxWidth:900 }}>
        <SectionHead n='1' title='Personal Details' />
        <div className='panel pad' style={{ marginBottom:18 }}>
          <div className='form-grid fg3' style={{ gap:14 }}>
            <Field label='Member Name' required><Inp value={f.name} onChange={set('name')} placeholder='Full name' /><E k='name' /></Field>
            <Field label='Mobile Number' required><Inp value={f.mobile} onChange={set('mobile')} placeholder='10 digits' mono /><E k='mobile' /></Field>
            <Field label='Alternative Mobile'><Inp value={f.altMobile} onChange={set('altMobile')} placeholder='Optional' mono /></Field>
            <Field label='Date of Birth' required><Inp type='date' value={f.dob} onChange={set('dob')} /><E k='dob' /></Field>
            <Field label='Gender' required><Sel value={f.gender} onChange={set('gender')}><option value=''>Select</option><option>Male</option><option>Female</option><option>Other</option></Sel><E k='gender' /></Field>
            <Field label='Occupation'><Inp value={f.occupation} onChange={set('occupation')} placeholder='e.g. Kirana shop' /></Field>
            <Field label='Aadhaar Number' required><Inp value={f.aadhaar} onChange={set('aadhaar')} placeholder='12 digits' mono /><E k='aadhaar' /></Field>
            <Field label='PAN Number' required><Inp value={f.pan} onChange={set('pan')} placeholder='ABCDE1234F' mono /><E k='pan' /></Field>
            <ImageUpload label='Person Photo' value={photo} onChange={setPhoto} error={err.photo} />
            <ImageUpload label='Shop Image' value={shopImage} onChange={setShopImage} error={err.shopImage} />
            <Field label='Address' required><Inp value={f.address} onChange={set('address')} placeholder='House no, street, area' /><E k='address' /></Field>
            <Field label='Village / City'><Inp value={f.village} onChange={set('village')} /></Field>
            <Field label='District'><Inp value={f.district} onChange={set('district')} /></Field>
            <Field label='State'><Inp value={f.state} onChange={set('state')} /></Field>
            <Field label='PIN Code' required><Inp value={f.pin} onChange={set('pin')} placeholder='6 digits' mono /><E k='pin' /></Field>
          </div>
        </div>
        <SectionHead n='2' title='Nominee Details' />
        <div className='panel pad' style={{ marginBottom:24 }}>
          <div className='form-grid fg3' style={{ gap:14 }}>
            <Field label='Nominee Name' required><Inp value={f.nomName} onChange={set('nomName')} /><E k='nomName' /></Field>
            <Field label='Relationship' required><Inp value={f.nomRel} onChange={set('nomRel')} placeholder='e.g. Spouse' /><E k='nomRel' /></Field>
            <Field label='Nominee Mobile'><Inp value={f.nomMobile} onChange={set('nomMobile')} mono /></Field>
            <Field label='Nominee Address'><Inp value={f.nomAddress} onChange={set('nomAddress')} /></Field>
          </div>
        </div>
        <div className='row' style={{ gap:12, justifyContent:'flex-end' }}>
          <Link to='/app/loan-collection' className='btn outline'>Cancel</Link>
          <button type='submit' className='btn gold' style={{ padding:'14px 32px' }}>Save Member &amp; Continue</button>
        </div>
      </div>
    </form>
  );
}

/* ===== Loan Application Form ===== */
const LOAN_TYPES = ['Daily 55 - 10% flat', 'Weekly 12 - 12% flat', 'Monthly 12 - 14% flat', 'Gold Loan - 9% flat'];

function calcEmi(amount, rate, tenure) {
  const p = parseFloat(amount) || 0, r = parseFloat(rate) || 0, t = parseInt(tenure) || 1;
  const interest = Math.round(p * r / 100), total = p + interest, emi = Math.ceil(total / t);
  return { interest, total, emi };
}

export function LoanApplicationForm() {
  const nav = useNavigate();
  const pathParts = window.location.pathname.split('/');
  const memberId = pathParts[pathParts.length - 1];
  const [member, setMember] = useState({});
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [appId] = useState(() => 'APP-' + Math.random().toString(36).slice(2,8).toUpperCase());
  const [loan, setLoan] = useState({ loanType: LOAN_TYPES[0], amount:'', tenure:'55', rate:'10', purpose:'' });
  const [bank, setBank] = useState({ holderName:'', bankName:'', branch:'', accNo:'', accNoConfirm:'', ifsc:'', accType:'Savings', upi:'' });
  const [docs, setDocs] = useState({ aadhaarFront:null, aadhaarBack:null, pan:null, passbook:null, photo:null, addressProof:null, nomineeId:null, other:null });
  const [err, setErr] = useState({});
  const setL = k => e => setLoan(p => ({ ...p, [k]: e.target.value }));
  const setB = k => e => setBank(p => ({ ...p, [k]: e.target.value }));
  const { interest, total, emi } = calcEmi(loan.amount, loan.rate, loan.tenure);
  const E = ({ k }) => err[k] ? <span style={{ color:'var(--red-tx)', fontSize:12, display:'block', marginTop:3 }}>{err[k]}</span> : null;

  useEffect(() => { api.getMember(memberId).then(setMember).catch(() => {}); }, [memberId]);

  const user = JSON.parse(localStorage.getItem('mlc_user') || '{"name":"Collector","id":"COL-001"}');

  function handleDoc(k, e) {
    const file = e.target.files[0];
    if (!file) return;
    if (!['image/jpeg','image/png','application/pdf'].includes(file.type)) { setErr(p => ({ ...p, [k]:'Only JPG, PNG, PDF allowed' })); return; }
    if (file.size > 5 * 1024 * 1024) { setErr(p => ({ ...p, [k]:'Max 5 MB' })); return; }
    setErr(p => { const n = { ...p }; delete n[k]; return n; });
    setDocs(p => ({ ...p, [k]: file }));
  }

  function validateLoan() {
    const e = {};
    if (!loan.amount || isNaN(loan.amount) || +loan.amount <= 0) e.amount = 'Valid amount required';
    if (!loan.tenure || +loan.tenure <= 0) e.tenure = 'Required';
    if (!loan.purpose.trim()) e.purpose = 'Required';
    return e;
  }

  function validateBank() {
    const e = {};
    if (!bank.holderName.trim()) e.holderName = 'Required';
    if (!bank.bankName.trim()) e.bankName = 'Required';
    if (!bank.accNo.trim()) e.accNo = 'Required';
    if (bank.accNo !== bank.accNoConfirm) e.accNoConfirm = 'Account numbers do not match';
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(bank.ifsc.toUpperCase())) e.ifsc = 'Valid IFSC required (e.g. KVGB0001234)';
    return e;
  }

  function validateDocs() {
    const e = {};
    if (!docs.aadhaarFront) e.aadhaarFront = 'Required';
    if (!docs.aadhaarBack) e.aadhaarBack = 'Required';
    if (!docs.pan) e.pan = 'Required';
    if (!docs.photo) e.photo = 'Required';
    return e;
  }

  function buildRecord(status) {
    return { appId, memberId: member.memberId, memberName: member.name, mobile: member.mobile, loanType: loan.loanType, loanAmount: loan.amount, tenure: loan.tenure, rate: loan.rate, purpose: loan.purpose, interest, total, emi, bank, docs: Object.fromEntries(Object.entries(docs).filter(([,v])=>v).map(([k,v])=>[k,{name:v.name,size:v.size}])), date: new Date().toLocaleDateString('en-IN'), status, collectorName: user.name, collectorId: user.id, statusHistory:[{ status, date: new Date().toLocaleString(), by: user.name }] };
  }

  async function saveDraft() {
    try {
      await api.saveApplication(buildRecord('Draft'));
      alert('Draft saved. App ID: ' + appId);
    } catch (e) { alert('Error: ' + e.message); }
  }

  async function handleSubmit() {
    const de = validateDocs();
    if (Object.keys(de).length) { setErr(de); return; }
    if (submitting) return;
    setSubmitting(true);
    try {
      await api.saveApplication(buildRecord('Pending Admin Approval'));
      setSubmitted(true);
    } catch (e) {
      alert(e.message || 'Submission failed');
    }
    finally { setSubmitting(false); }
  }

  if (submitted) return (
    <div style={{ maxWidth:600, margin:'60px auto', textAlign:'center' }}>
      <div style={{ fontSize:64 }}>&#10003;</div>
      <h2 style={{ marginTop:16 }}>Application Submitted!</h2>
      <p className='muted'>Application ID: <b className='mono'>{appId}</b></p>
      <p className='muted'>Status: <span className='pill yellow'>Pending Admin Approval</span></p>
      <p className='muted' style={{ fontSize:14 }}>Admin will review your application. Track status in Loan Collection.</p>
      <Link to='/app/loan-collection' className='btn gold' style={{ display:'inline-block', marginTop:20 }}>Back to Loan Collection</Link>
    </div>
  );

  const steps = ['Loan Details', 'Bank Details', 'Documents', 'Review & Submit'];
  return (
    <div style={{ maxWidth:900 }}>
      <div className='page-header'>
        <div><h1>Loan Application</h1><p>{member.name || 'Member'} &middot; {member.memberId || memberId} &middot; App: {appId}</p></div>
        <div className='right'><Link to='/app/loan-collection' className='btn outline sm'>Cancel</Link></div>
      </div>
      <div className='lc-steps'>
        {steps.map((s, i) => <div key={s} className={'lc-step' + (step === i+1 ? ' active' : step > i+1 ? ' done' : '')}><span>{i+1}</span>{s}</div>)}
      </div>

      {step === 1 && (
        <div className='panel pad' style={{ marginTop:18 }}>
          <SectionHead n='1' title='Loan Details' />
          <div className='form-grid fg3' style={{ gap:14 }}>
            <Field label='Application ID'><Inp value={appId} readOnly mono /></Field>
            <Field label='Member ID'><Inp value={member.memberId || memberId} readOnly mono /></Field>
            <Field label='Member Name'><Inp value={member.name || ''} readOnly /></Field>
            <Field label='Loan Type' required><Sel value={loan.loanType} onChange={setL('loanType')}>{LOAN_TYPES.map(t => <option key={t}>{t}</option>)}</Sel></Field>
            <Field label='Loan Amount (Rs.)' required><Inp value={loan.amount} onChange={setL('amount')} placeholder='e.g. 10000' mono /><E k='amount' /></Field>
            <Field label='Tenure (days)' required><Inp value={loan.tenure} onChange={setL('tenure')} mono /><E k='tenure' /></Field>
            <Field label='Interest Rate (%)'><Inp value={loan.rate} onChange={setL('rate')} mono /></Field>
            <Field label='EMI / Daily Due (Rs.)'><Inp value={loan.amount ? emi : ''} readOnly mono /></Field>
            <Field label='Loan Purpose' required><Inp value={loan.purpose} onChange={setL('purpose')} placeholder='e.g. Business expansion' /><E k='purpose' /></Field>
            <Field label='Collector'><Inp value={user.name} readOnly /></Field>
            <Field label='Collector ID'><Inp value={user.id} readOnly mono /></Field>
            <Field label='Date'><Inp value={new Date().toLocaleDateString('en-IN')} readOnly /></Field>
          </div>
          {loan.amount > 0 && (
            <div style={{ background:'var(--green-bg)', borderRadius:12, padding:14, marginTop:18, display:'flex', gap:32 }}>
              <div><div className='eyebrow' style={{ fontSize:11 }}>Interest</div><b className='mono'>Rs.{interest}</b></div>
              <div><div className='eyebrow' style={{ fontSize:11 }}>Total Repayable</div><b className='mono'>Rs.{total}</b></div>
              <div><div className='eyebrow' style={{ fontSize:11 }}>Daily EMI</div><b className='mono'>Rs.{emi}</b></div>
            </div>
          )}
          <div className='row' style={{ gap:12, justifyContent:'flex-end', marginTop:20 }}>
            <button type='button' className='btn outline' onClick={saveDraft}>Save Draft</button>
            <button type='button' className='btn gold' onClick={() => { const e = validateLoan(); if (Object.keys(e).length) { setErr(e); return; } setErr({}); setStep(2); }}>Next: Bank Details</button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className='panel pad' style={{ marginTop:18 }}>
          <SectionHead n='2' title='Bank Account Details' />
          <div className='form-grid fg3' style={{ gap:14 }}>
            <Field label='Account Holder Name' required><Inp value={bank.holderName} onChange={setB('holderName')} /><E k='holderName' /></Field>
            <Field label='Bank Name' required><Inp value={bank.bankName} onChange={setB('bankName')} /><E k='bankName' /></Field>
            <Field label='Branch Name'><Inp value={bank.branch} onChange={setB('branch')} /></Field>
            <Field label='Account Number' required><Inp value={bank.accNo} onChange={setB('accNo')} mono /><E k='accNo' /></Field>
            <Field label='Confirm Account Number' required><Inp value={bank.accNoConfirm} onChange={setB('accNoConfirm')} mono /><E k='accNoConfirm' /></Field>
            <Field label='IFSC Code' required><Inp value={bank.ifsc} onChange={setB('ifsc')} mono placeholder='e.g. KVGB0001234' /><E k='ifsc' /></Field>
            <Field label='Account Type'><Sel value={bank.accType} onChange={setB('accType')}><option>Savings</option><option>Current</option></Sel></Field>
            <Field label='UPI ID (optional)'><Inp value={bank.upi} onChange={setB('upi')} mono /></Field>
          </div>
          <div className='row' style={{ gap:12, justifyContent:'flex-end', marginTop:20 }}>
            <button type='button' className='btn outline' onClick={() => setStep(1)}>Back</button>
            <button type='button' className='btn outline' onClick={saveDraft}>Save Draft</button>
            <button type='button' className='btn gold' onClick={() => { const e = validateBank(); if (Object.keys(e).length) { setErr(e); return; } setErr({}); setStep(3); }}>Next: Documents</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className='panel pad' style={{ marginTop:18 }}>
          <SectionHead n='3' title='Document Upload' />
          <div className='form-grid fg3' style={{ gap:14 }}>
            {[['aadhaarFront','Aadhaar Card - Front',true],['aadhaarBack','Aadhaar Card - Back',true],['pan','PAN Card',true],['passbook','Bank Passbook - First Page',false],['photo','Member Passport Photo',true],['addressProof','Address Proof',false],['nomineeId','Nominee ID Proof',false],['other','Other Documents',false]].map(([key, label, req]) => (
              <Field key={key} label={label} required={req}>
                {docs[key] ? (
                  <div style={{ border:'1px solid var(--g800)', borderRadius:12, padding:'10px 14px', display:'flex', alignItems:'center', justifyContent:'space-between', background:'var(--green-bg)' }}>
                    <span style={{ fontSize:13, color:'var(--green-tx)' }}>&#10003; {docs[key].name}</span>
                    <button type='button' style={{ border:0, background:'none', color:'var(--red-tx)', cursor:'pointer', fontSize:13 }} onClick={() => setDocs(p => ({ ...p, [key]:null }))}>Remove</button>
                  </div>
                ) : (
                  <label style={{ display:'block', border:'1.5px dashed var(--line)', borderRadius:12, padding:14, textAlign:'center', cursor:'pointer', fontSize:13, color:'var(--muted)' }}>
                    + Upload (JPG/PNG/PDF, max 5MB)
                    <input type='file' accept='.jpg,.jpeg,.png,.pdf' style={{ display:'none' }} onChange={e => handleDoc(key, e)} />
                  </label>
                )}
                <E k={key} />
              </Field>
            ))}
          </div>
          <div className='row' style={{ gap:12, justifyContent:'flex-end', marginTop:20 }}>
            <button type='button' className='btn outline' onClick={() => setStep(2)}>Back</button>
            <button type='button' className='btn outline' onClick={saveDraft}>Save Draft</button>
            <button type='button' className='btn gold' onClick={() => { const e = validateDocs(); if (Object.keys(e).length) { setErr(e); return; } setErr({}); setStep(4); }}>Next: Review</button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div style={{ marginTop:18 }}>
          <div className='panel pad' style={{ marginBottom:14 }}>
            <div className='eyebrow' style={{ fontSize:11, marginBottom:10 }}>Member Details</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              {[['Name',member.name],['Member ID',member.memberId],['Mobile',member.mobile],['Aadhaar','XXXX XXXX '+(member.aadhaar||'').slice(-4)],['PAN',member.pan],['Address',member.address]].map(([k,v]) => (
                <div key={k} className='kv'><span className='sans'>{k}</span><span>{v}</span></div>
              ))}
            </div>
          </div>
          <div className='panel pad' style={{ marginBottom:14 }}>
            <div className='eyebrow' style={{ fontSize:11, marginBottom:10 }}>Loan Details</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              {[['Loan Type',loan.loanType],['Amount','Rs.'+loan.amount],['Tenure',loan.tenure+' days'],['Rate',loan.rate+'%'],['Interest','Rs.'+interest],['Total','Rs.'+total],['EMI','Rs.'+emi],['Purpose',loan.purpose]].map(([k,v]) => (
                <div key={k} className='kv'><span className='sans'>{k}</span><span className='mono'>{v}</span></div>
              ))}
            </div>
          </div>
          <div className='panel pad' style={{ marginBottom:14 }}>
            <div className='eyebrow' style={{ fontSize:11, marginBottom:10 }}>Bank Details</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              {[['Holder',bank.holderName],['Bank',bank.bankName],['Branch',bank.branch],['Account','XXXX'+bank.accNo.slice(-4)],['IFSC',bank.ifsc],['Type',bank.accType]].map(([k,v]) => (
                <div key={k} className='kv'><span className='sans'>{k}</span><span className='mono'>{v}</span></div>
              ))}
            </div>
          </div>
          <div className='panel pad' style={{ marginBottom:18 }}>
            <div className='eyebrow' style={{ fontSize:11, marginBottom:10 }}>Documents</div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:10 }}>
              {Object.entries(docs).filter(([,v]) => v).map(([k,v]) => <span key={k} className='pill green'>{v.name}</span>)}
              {Object.values(docs).every(v => !v) && <span className='muted'>No documents uploaded</span>}
            </div>
          </div>
          <div className='row' style={{ gap:12, justifyContent:'flex-end' }}>
            <button type='button' className='btn outline' onClick={() => setStep(3)}>Back</button>
            <button type='button' className='btn outline' onClick={saveDraft}>Save Draft</button>
            <button type='button' className='btn gold' style={{ padding:'14px 32px' }} onClick={handleSubmit} disabled={submitting}>{submitting ? 'Submitting...' : 'Submit Application'}</button>
          </div>
        </div>
      )}
    </div>
  );
}
