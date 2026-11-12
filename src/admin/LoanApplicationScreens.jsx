import { useState, useEffect } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';

const STATUS_ORDER = ['Pending Admin Approval','Under Review','Sanctioned','Approved','Rejected','Disbursed','NPA','Recovery','Recovered','Written Off'];
const SC = { 'Pending Admin Approval':'yellow', 'Under Review':'yellow', Sanctioned:'yellow', Approved:'green', Rejected:'red', Disbursed:'green', Draft:'grey', NPA:'red', Recovery:'red', Recovered:'green', 'Written Off':'grey' };
const Pill = ({ c, children }) => <span className={'pill ' + c}>{children}</span>;
function calcFee(amount) { return Math.floor(Number(amount) / 5000) * 250; }

function fmtINR(n) { return '₹' + Number(n || 0).toLocaleString('en-IN'); }

function printApprovalLetter(app) {
  const w = window.open('', '_blank', 'width=900,height=750');
  const sanctionAmount = Number(app.sanctionAmount);
  const fee = app.processingFee ?? calcFee(sanctionAmount);
  const net = app.netDisbursalAmount ?? (sanctionAmount - fee);
  w.document.write(`<!DOCTYPE html><html><head><title>Approval Letter - ${app.appId}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:Arial,sans-serif;font-size:13px;color:#111;padding:40px;max-width:800px;margin:0 auto}
    .hdr{text-align:center;border-bottom:3px double #1a5c35;padding-bottom:16px;margin-bottom:20px}
    .hdr h1{font-size:20px;color:#1a5c35;font-weight:800;margin-bottom:4px}
    .hdr p{font-size:12px;color:#555}
    .meta{display:flex;justify-content:space-between;margin-bottom:18px;font-size:12px;color:#555}
    h2{font-size:15px;font-weight:700;margin:18px 0 10px;color:#1a5c35;border-bottom:1px solid #c5ddc9;padding-bottom:4px}
    .grid{display:grid;grid-template-columns:1fr 1fr;gap:6px 20px;margin-bottom:10px}
    .kv{display:flex;gap:8px;font-size:12px;padding:4px 0;border-bottom:1px dashed #e0e0e0}
    .kv span{color:#555;min-width:160px;flex:none}
    .kv b{color:#111}
    .terms{background:#f8faf8;border:1px solid #c5ddc9;border-radius:6px;padding:14px;margin:14px 0;font-size:12px;line-height:1.7}
    .terms li{margin-bottom:4px}
    .sig-row{display:flex;justify-content:space-between;margin-top:40px}
    .sig-box{text-align:center;min-width:180px}
    .sig-line{border-top:1px solid #333;margin-bottom:6px}
    .footer{margin-top:24px;text-align:center;font-size:10px;color:#888;border-top:1px solid #ddd;padding-top:10px}
    @media print{body{padding:20px}}
  </style></head><body>
  <div class="hdr">
    <h1>Mahalaxmi Co-Operative Society Ltd</h1>
    <p>Loan Approval Letter</p>
  </div>
  <div class="meta">
    <div><b>Application ID:</b> ${app.appId}</div>
    <div><b>Date:</b> ${new Date().toLocaleDateString('en-IN')}</div>
  </div>
  <p style="margin-bottom:14px">To,<br><b>${app.memberName}</b><br>Member ID: ${app.memberId}</p>
  <p style="margin-bottom:14px">Dear ${app.memberName},</p>
  <p style="margin-bottom:14px;line-height:1.7">We are pleased to inform you that your loan application <b>${app.appId}</b> has been <b>Approved</b> by Mahalaxmi Co-Operative Society Ltd. The details are as follows:</p>
  <h2>Loan Details</h2>
  <div class="grid">
    <div class="kv"><span>Application ID</span><b>${app.appId}</b></div>
    <div class="kv"><span>Loan ID</span><b>${app.loanId || '–'}</b></div>
    <div class="kv"><span>Loan Type</span><b>${app.loanType}</b></div>
    <div class="kv"><span>Sanctioned Amount</span><b>${fmtINR(sanctionAmount)}</b></div>
    <div class="kv"><span>Processing Fee Deduction</span><b>- ${fmtINR(fee)}</b></div>
    <div class="kv"><span>Net Disbursal Amount</span><b>${fmtINR(net)}</b></div>
    <div class="kv"><span>Approved Tenure</span><b>${app.approvedTenure} days</b></div>
    <div class="kv"><span>Interest Rate</span><b>${app.confirmedRate}% per annum</b></div>
    <div class="kv"><span>Collector</span><b>${app.collectorName}</b></div>
    ${app.adminRemark ? `<div class="kv" style="grid-column:1/-1"><span>Admin Remark</span><b>${app.adminRemark}</b></div>` : ''}
  </div>
  <h2>Terms and Conditions</h2>
  <div class="terms"><ol>
    <li>The loan amount must be repaid as per the agreed repayment schedule.</li>
    <li>A penalty of 3% per day will be charged on overdue amounts after the loan tenure ends.</li>
    <li>The borrower must inform the society of any change in contact details or address.</li>
    <li>The society reserves the right to recall the loan in case of default or misuse of funds.</li>
    <li>This approval letter is valid only for the loan amount and tenure mentioned above.</li>
    <li>Any dispute shall be subject to the jurisdiction of local courts.</li>
  </ol></div>
  <div class="sig-row">
    <div class="sig-box"><div class="sig-line"></div><div>Borrower Signature</div><div style="font-size:11px;color:#555;margin-top:2px">${app.memberName}</div></div>
    <div class="sig-box"><div class="sig-line"></div><div>Authorized Signatory</div><div style="font-size:11px;color:#555;margin-top:2px">Mahalaxmi Co-Operative Society Ltd</div></div>
  </div>
  <div class="footer">Generated on ${new Date().toLocaleString('en-IN')} &nbsp;|&nbsp; Mahalaxmi Co-Operative Society Ltd &nbsp;|&nbsp; Confidential</div>
  </body></html>`);
  w.document.close(); w.focus(); w.print();
}

/* ===== Admin: Loan Applications List ===== */
export function LoanApplications() {
  const [search, setSearch] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const sf = searchParams.get('status') || 'All';
  const setSf = v => setSearchParams(v === 'All' ? {} : { status: v });
  useEffect(() => { api.getApplications().then(d => setApps(d.filter(a => a.status !== 'Draft'))).finally(() => setLoading(false)); }, []);
  const filtered = apps.filter(a => {
    const q = search.toLowerCase();
    const ms = !q || [a.memberName, a.memberId, a.appId, a.mobile, a.collectorName].some(v => v && v.toLowerCase().includes(q));
    return ms && (sf === 'All' || a.status === sf);
  });
  if (loading) return <div className='panel pad' style={{ textAlign:'center', padding:48 }}><p className='muted'>Loading…</p></div>;
  return (
    <>
      <div className='a-title'>
        <div>
          <h1>{sf === 'NPA' ? '🔴 NPA Accounts' : 'Loan Applications'}</h1>
          <p>{sf === 'NPA' ? `Borrowers who have not paid on time · ${filtered.length} accounts` : `All collector-submitted applications · ${apps.length} total`}</p>
        </div>
      </div>
      <div style={{ display:'flex', gap:12, marginBottom:16, flexWrap:'wrap' }}>
        <input className='search' style={{ flex:1, minWidth:220, marginBottom:0 }} placeholder='Search name, ID, mobile, collector...' value={search} onChange={e => setSearch(e.target.value)} />
        <select className='sel' value={sf} onChange={e => setSf(e.target.value)}>
          <option>All</option>
          {STATUS_ORDER.map(s => <option key={s}>{s}</option>)}
        </select>
      </div>
      {filtered.length === 0 ? (
        <div className='panel pad' style={{ textAlign:'center', padding:48 }}><p className='muted'>No applications found.</p></div>
      ) : (
        <div className='panel scroll-x'>
          <table className='dtable'>
            <thead><tr><th>App ID</th><th>Member</th><th>Mobile</th><th>Collector</th><th>Loan Type</th><th className='r'>Amount</th><th>Date</th><th>Status</th><th></th></tr></thead>
            <tbody>{filtered.map(a => (
              <tr key={a.appId}>
                <td className='mono' style={{ fontSize:13 }}>{a.appId}</td>
                <td><b>{a.memberName}</b><div className='muted' style={{ fontSize:12 }}>{a.memberId}</div></td>
                <td className='mono'>{a.mobile}</td>
                <td>{a.collectorName}</td>
                <td>{a.loanType}</td>
                <td className='r mono'>Rs.{a.loanAmount}</td>
                <td className='mono' style={{ fontSize:13 }}>{a.date}</td>
                <td><Pill c={SC[a.status] || 'grey'}>{a.status}</Pill></td>
                <td><Link to={'/admin/loan-applications/' + a.appId} className='btn sm'>View</Link></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </>
  );
}

/* ===== Admin: Application Detail ===== */
export function ApplicationDetail() {
  const { appId } = useParams();
  const [app, setApp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [remark, setRemark] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [member, setMember] = useState({});
  const [sanctionAmount, setSanctionAmount] = useState('');
  const [serviceCharge, setServiceCharge] = useState('');
  const [sanctionRemark, setSanctionRemark] = useState('');
  const [approvedAmount, setApprovedAmount] = useState('');
  const [approvedTenure, setApprovedTenure] = useState('');
  const [confirmedRate, setConfirmedRate] = useState('');
  const [disbursalRef, setDisbursalRef] = useState('');
  const [showReject, setShowReject] = useState(false);
  const [recoveryNote, setRecoveryNote] = useState('');
  const [quickDisbursalRef, setQuickDisbursalRef] = useState('');

  useEffect(() => {
    api.getApplication(appId).then(d => {
      setApp(d);
      setApprovedTenure(d.tenure || '');
      setConfirmedRate(d.rate || '');
      setSanctionAmount(d.sanctionAmount || d.loanAmount || '');
      setServiceCharge(String(calcFee(d.sanctionAmount || d.loanAmount || 0)));
      if (d.memberId) api.getMember(d.memberId).then(setMember).catch(() => {});
    }).catch(() => setApp(null)).finally(() => setLoading(false));
  }, [appId]);

  if (loading) return <div className='panel pad' style={{ textAlign:'center', padding:48 }}><p className='muted'>Loading…</p></div>;
  if (!app) return (
    <div><p className='muted'>Application not found.</p><Link to='/admin/loan-applications' className='btn outline sm'>Back</Link></div>
  );

  async function updateStatus(newStatus, extra) {
    const updated = { ...app, status: newStatus, ...extra, statusHistory: [...(app.statusHistory || []), { status: newStatus, date: new Date().toLocaleString(), by: 'Admin' }] };
    try {
      const saved = await api.updateApplication(appId, updated);
      setApp(saved);
    } catch (e) { alert('Error: ' + e.message); }
  }

  function handleSanction() {
    if (!sanctionAmount) { alert('Enter sanction amount'); return; }
    if (Number(sanctionAmount) < 5000 || Number(sanctionAmount) % 5000 !== 0) { alert('Sanction amount must be a multiple of Rs.5,000 (e.g. 5000, 10000, 15000)'); return; }
    const fee = serviceCharge !== '' ? Number(serviceCharge) : calcFee(sanctionAmount);
    if (isNaN(fee) || fee < 0) { alert('Enter a valid service charge'); return; }
    const net = Number(sanctionAmount) - fee;
    if (net <= 0) { alert('Payable amount must be greater than 0'); return; }
    const loanId = 'MCS-' + new Date().getFullYear().toString().slice(-2) + '-' + Math.random().toString(36).slice(2,8).toUpperCase();
    updateStatus('Sanctioned', { sanctionAmount, processingFee: fee, netDisbursalAmount: net, sanctionRemark, loanId });
  }

  async function handleApprove() {
    if (!approvedTenure || Number(approvedTenure) <= 0) { alert('Approved Tenure (days) is required'); return; }
    if (!confirmedRate || Number(confirmedRate) <= 0) { alert('Interest Rate is required'); return; }
    const extra = { approvedAmount: app.sanctionAmount, approvedTenure, confirmedRate, adminRemark: remark };
    const updated = { ...app, status: 'Approved', ...extra, statusHistory: [...(app.statusHistory || []), { status: 'Approved', date: new Date().toLocaleString(), by: 'Admin' }] };
    try {
      const saved = await api.updateApplication(appId, updated);
      setApp(saved);
      printApprovalLetter(saved);
    } catch (e) { alert('Error: ' + e.message); }
  }

  function handleReject() {
    if (!rejectReason.trim()) { alert('Rejection reason is required'); return; }
    updateStatus('Rejected', { rejectReason, adminRemark: remark });
    setShowReject(false);
  }

  function handleDisburse() {
    if (!disbursalRef.trim()) { alert('Enter disbursal reference'); return; }
    updateStatus('Disbursed', { disbursalRef, disbursalDate: new Date().toLocaleDateString('en-IN') });
  }

  return (
    <>
      <div className='a-title'>
        <div>
          <div className='app-detail-title-row'>
            <h1>Application {app.appId}</h1>
            <Pill c={SC[app.status] || 'grey'}>{app.status}</Pill>
          </div>
          <p>{app.memberName} &middot; {app.memberId} &middot; Submitted {app.date}</p>
        </div>
        <Link to='/admin/loan-applications' className='btn outline sm'>Back</Link>
      </div>

      <div className='app-detail-layout'>
        <div>
          <div className='panel pad' style={{ marginBottom:14 }}>
            <div className='eyebrow' style={{ fontSize:11, marginBottom:10 }}>1 &middot; Member Personal Information</div>
            {(member.photo || member.shopImage) && (
              <div style={{ marginBottom:12, paddingBottom:12, borderBottom:'1px dashed var(--line)', display:'flex', gap:20, flexWrap:'wrap' }}>
                {member.photo && (
                  <div>
                    <div style={{ fontSize:11, color:'var(--muted)', marginBottom:6 }}>Person Photo</div>
                    <img src={member.photo} alt='Member' style={{ width:200, height:240, objectFit:'cover', borderRadius:10, border:'1px solid var(--line)' }} />
                  </div>
                )}
                {member.shopImage && (
                  <div>
                    <div style={{ fontSize:11, color:'var(--muted)', marginBottom:6 }}>Shop Image</div>
                    <img src={member.shopImage} alt='Shop' style={{ width:320, height:240, objectFit:'cover', borderRadius:10, border:'1px solid var(--line)' }} />
                  </div>
                )}
              </div>
            )}
            <div className='info-grid'>
              {[['Name',app.memberName],['Member ID',app.memberId],['Mobile',app.mobile],['Alt Mobile',member.altMobile],['DOB',member.dob],['Gender',member.gender],['Aadhaar','XXXX XXXX '+(member.aadhaar||'').slice(-4)],['PAN',member.pan],['Occupation',member.occupation],['Address',member.address],['Village',member.village],['District',member.district],['State',member.state],['PIN',member.pin]].filter(([,v])=>v).map(([k,v]) => (
                <div key={k} className='kv'><span className='sans'>{k}</span><span>{v}</span></div>
              ))}
            </div>
            {member.nomName && (
              <div style={{ marginTop:12, borderTop:'1px dashed var(--line)', paddingTop:10 }}>
                <div className='eyebrow' style={{ fontSize:11, marginBottom:8 }}>Nominee</div>
                <div className='info-grid'>
                  {[['Name',member.nomName],['Relationship',member.nomRel],['Mobile',member.nomMobile],['Address',member.nomAddress]].filter(([,v])=>v).map(([k,v]) => (
                    <div key={k} className='kv'><span className='sans'>{k}</span><span>{v}</span></div>
                  ))}
                </div>
              </div>
            )}

          </div>

          <div className='panel pad' style={{ marginBottom:14 }}>
            <div className='eyebrow' style={{ fontSize:11, marginBottom:10 }}>2 &middot; Loan Application Information</div>
            <div className='info-grid'>
              {[['Loan Type',app.loanType],['Requested Amount','Rs.'+app.loanAmount],['Tenure',app.tenure+' days'],['Interest Rate',app.rate+'%'],['Interest','Rs.'+app.interest],['Total Repayable','Rs.'+app.total],['EMI','Rs.'+app.emi],['Purpose',app.purpose],['Application Date',app.date]].map(([k,v]) => (
                <div key={k} className='kv'><span className='sans'>{k}</span><span className='mono'>{v}</span></div>
              ))}
            </div>
            {app.pending > 0 && app.penalty > 0 && (
              <div style={{ background:'var(--red-bg)', border:'1.5px solid var(--red-tx)', borderRadius:10, padding:12, marginTop:12 }}>
                <div className='eyebrow' style={{ fontSize:11, marginBottom:6, color:'var(--red-tx)' }}>⚠ Overdue Penalty (3% per day)</div>
                <div className='info-grid'>
                  {[['Pending','Rs.'+app.pending],['Penalty','Rs.'+app.penalty],['Total Payable','Rs.'+app.totalPayable]].map(([k,v]) => (
                    <div key={k} className='kv'><span className='sans'>{k}</span><span className='mono' style={{ color:'var(--red-tx)', fontWeight:700 }}>{v}</span></div>
                  ))}
                </div>
              </div>
            )}
            {app.sanctionAmount && (
              <div style={{ background:'var(--yellow-bg)', border:'1px solid var(--yellow-tx)', borderRadius:10, padding:12, marginTop:12 }}>
                <div className='eyebrow' style={{ fontSize:11, marginBottom:6 }}>Sanction Details</div>
                <div className='info-grid'>
                  {[['Total Amount','Rs.'+Number(app.sanctionAmount).toLocaleString('en-IN')],['Deduction','- Rs.'+(app.processingFee ?? calcFee(app.sanctionAmount)).toLocaleString('en-IN')],['Payable Amount','Rs.'+Number(app.netDisbursalAmount).toLocaleString('en-IN')],['Loan ID',app.loanId]].map(([k,v]) => (
                    <div key={k} className='kv'><span className='sans'>{k}</span><span className='mono' style={k==='Payable Amount'?{fontWeight:700,color:'var(--green-tx)'}:{}}>{v}</span></div>
                  ))}
                </div>
              </div>
            )}
            {app.approvedAmount && (
              <div style={{ background:'var(--green-bg)', borderRadius:10, padding:12, marginTop:12 }}>
                <div className='eyebrow' style={{ fontSize:11, marginBottom:6 }}>Approved Details</div>
                <div className='info-grid'>
                  {[['Sanctioned Amount','Rs.'+Number(app.sanctionAmount).toLocaleString('en-IN')],['Deduction','- Rs.'+(app.processingFee ?? calcFee(app.sanctionAmount)).toLocaleString('en-IN')],['Payable Amount','Rs.'+Number(app.netDisbursalAmount).toLocaleString('en-IN')],['Approved Tenure',app.approvedTenure+' days'],['Confirmed Rate',app.confirmedRate+'%']].map(([k,v]) => (
                    <div key={k} className='kv'><span className='sans'>{k}</span><span className='mono' style={k==='Payable Amount'?{fontWeight:700,color:'var(--green-tx)'}:{}}>{v}</span></div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className='panel pad' style={{ marginBottom:14 }}>
            <div className='eyebrow' style={{ fontSize:11, marginBottom:10 }}>3 &middot; Bank Details</div>
            <div className='info-grid'>
              {[['Account Holder',app.bank?.holderName],['Bank',app.bank?.bankName],['Branch',app.bank?.branch],['Account No.','XXXX'+(app.bank?.accNo||'').slice(-4)],['IFSC',app.bank?.ifsc],['Account Type',app.bank?.accType],['UPI',app.bank?.upi]].filter(([,v])=>v).map(([k,v]) => (
                <div key={k} className='kv'><span className='sans'>{k}</span><span className='mono'>{v}</span></div>
              ))}
            </div>
          </div>

          <div className='panel pad' style={{ marginBottom:14 }}>
            <div className='eyebrow' style={{ fontSize:11, marginBottom:10 }}>4 &middot; Uploaded Documents</div>
            <div className='docs-grid'>
              {app.docs && Object.entries(app.docs).filter(([,v])=>v).map(([k,v]) => (
                <div key={k} style={{ border:'1px solid var(--line)', borderRadius:10, padding:12 }}>
                  <div style={{ fontSize:12, color:'var(--muted)', marginBottom:4 }}>{k}</div>
                  <div style={{ fontSize:13, fontWeight:600 }}>{v.name}</div>
                  <div style={{ fontSize:12, color:'var(--muted)' }}>{(v.size/1024).toFixed(1)} KB</div>
                </div>
              ))}
              {(!app.docs || Object.values(app.docs).every(v=>!v)) && <p className='muted'>No documents uploaded</p>}
            </div>
          </div>

          <div className='panel pad' style={{ marginBottom:14 }}>
            <div className='eyebrow' style={{ fontSize:11, marginBottom:10 }}>5 &middot; Collector Information</div>
            <div className='info-grid'>
              {[['Collector Name',app.collectorName],['Collector ID',app.collectorId],['Submitted On',app.date]].map(([k,v]) => (
                <div key={k} className='kv'><span className='sans'>{k}</span><span>{v}</span></div>
              ))}
            </div>
          </div>

          {app.schedule && app.schedule.length > 0 && (
            <div className='panel pad' style={{ marginBottom:14 }}>
              <div className='eyebrow' style={{ fontSize:11, marginBottom:10 }}>Daily Payment Schedule &middot; Rs.100/day</div>
              <div style={{ maxHeight:280, overflowY:'auto' }}>
                <table className='dtable'>
                  <thead><tr><th>Day</th><th>Date</th><th className='r'>Due</th><th className='r'>Paid</th><th>Status</th></tr></thead>
                  <tbody>{app.schedule.map((s,i) => (
                    <tr key={i} style={{ background: s.status === 'Missed' ? 'var(--red-bg)' : 'transparent' }}>
                      <td className='mono'>{s.day}</td>
                      <td className='mono' style={{ fontSize:13 }}>{s.date}</td>
                      <td className='r mono'>Rs.{s.due}</td>
                      <td className='r mono'>Rs.{s.paid}</td>
                      <td><span className={'pill ' + (s.status === 'Paid' ? 'green' : s.status === 'Missed' ? 'red' : 'grey')}>{s.status}</span></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </div>
          )}

          <div className='panel pad' style={{ marginBottom:14 }}>
            <div className='eyebrow' style={{ fontSize:11, marginBottom:10 }}>6 &middot; Status History</div>
            {(app.statusHistory || []).map((h, i) => (
              <div key={i} style={{ display:'flex', gap:12, padding:'8px 0', borderBottom:'1px dashed var(--line)' }}>
                <Pill c={SC[h.status] || 'grey'}>{h.status}</Pill>
                <span className='muted' style={{ fontSize:13 }}>{h.date} &middot; {h.by}</span>
              </div>
            ))}
            {app.adminRemark && <p style={{ marginTop:10, fontSize:14 }}><b>Admin Remark:</b> {app.adminRemark}</p>}
            {app.rejectReason && <p style={{ marginTop:6, fontSize:14, color:'var(--red-tx)' }}><b>Rejection Reason:</b> {app.rejectReason}</p>}
            {app.disbursalRef && <p style={{ marginTop:6, fontSize:14, color:'var(--green-tx)' }}><b>Disbursal Ref:</b> {app.disbursalRef} &middot; {app.disbursalDate}</p>}
          </div>
        </div>

        <div>
          <div className='summary' style={{ position:'sticky', top:20 }}>
            <div className='t'>ACTIONS</div>
            <div style={{ marginTop:14 }}><Pill c={SC[app.status] || 'grey'}>{app.status}</Pill></div>
            {app.loanId && <div style={{ marginTop:10, fontSize:13, color:'#cfe3d9' }}>Loan ID: <b className='mono'>{app.loanId}</b></div>}
            <hr style={{ border:0, borderTop:'1px solid rgba(255,255,255,.15)', margin:'16px 0' }} />
            {app.status === 'Pending Admin Approval' && (
              <>
                <div style={{ background:'rgba(255,255,255,.08)', borderRadius:8, padding:'10px 12px', marginBottom:10, fontSize:13 }}>
                  <div style={{ color:'#cfe3d9', fontWeight:700, marginBottom:6 }}>⚡ Quick Approve</div>
                  <div style={{ color:'#cfe3d9', fontSize:12, marginBottom:8 }}>Sanction full requested amount and disburse immediately.</div>
                  <label style={{ color:'#cfe3d9', fontSize:12, display:'block', marginBottom:4 }}>Disbursal Reference <span style={{ color:'#f87171' }}>*</span></label>
                  <input className='input mono' style={{ padding:'8px 12px', fontSize:14, marginBottom:8 }} value={quickDisbursalRef} onChange={e => setQuickDisbursalRef(e.target.value)} placeholder='UTR / cheque no.' />
                  <button className='btn gold block' onClick={async () => {
                    if (!quickDisbursalRef.trim()) { alert('Enter disbursal reference'); return; }
                    const amt = Number(app.loanAmount);
                    const fee = calcFee(amt);
                    const net = amt - fee;
                    const loanId = 'MCS-' + new Date().getFullYear().toString().slice(-2) + '-' + Math.random().toString(36).slice(2,8).toUpperCase();
                    const now = new Date().toLocaleString();
                    const today = new Date().toLocaleDateString('en-IN');
                    const history = [
                      ...(app.statusHistory || []),
                      { status: 'Sanctioned', date: now, by: 'Admin' },
                      { status: 'Approved', date: now, by: 'Admin' },
                      { status: 'Disbursed', date: now, by: 'Admin' },
                    ];
                    try {
                      const saved = await api.updateApplication(appId, {
                        status: 'Disbursed',
                        sanctionAmount: String(amt),
                        processingFee: fee,
                        netDisbursalAmount: net,
                        loanId,
                        approvedAmount: String(amt),
                        approvedTenure: app.tenure,
                        confirmedRate: app.rate,
                        disbursalRef: quickDisbursalRef,
                        disbursalDate: today,
                        statusHistory: history,
                      });
                      setApp(saved);
                    } catch (e) { alert('Error: ' + e.message); }
                  }}>⚡ Approve &amp; Disburse</button>
                </div>
                <hr style={{ border:0, borderTop:'1px solid rgba(255,255,255,.1)', margin:'12px 0' }} />
                <button className='btn block' style={{ marginBottom:10, background:'rgba(255,255,255,.15)' }} onClick={() => updateStatus('Under Review')}>Start Verification (Manual)</button>
              </>
            )}
            {(app.status === 'Pending Admin Approval' || app.status === 'Under Review') && (
              <>
                <label style={{ color:'#cfe3d9', fontSize:12, display:'block', marginBottom:4 }}>Sanction Amount (Rs.) *</label>
                <div className='input mono' style={{ padding:'8px 12px', fontSize:14, marginBottom:8, opacity:.7, cursor:'not-allowed' }}>{sanctionAmount || app.loanAmount}</div>
                {sanctionAmount > 0 && (() => { const fee = serviceCharge !== '' ? Number(serviceCharge) : calcFee(sanctionAmount); const net = Number(sanctionAmount) - fee; return (
                  <>
                    <label style={{ color:'#cfe3d9', fontSize:12, display:'block', marginBottom:4 }}>Service Charge (Rs.)</label>
                    <input className='input mono' style={{ padding:'8px 12px', fontSize:14, marginBottom:8 }} type='number' min='0' value={serviceCharge} onChange={e => setServiceCharge(e.target.value)} />
                    <div style={{ background:'rgba(255,255,255,.08)', borderRadius:8, padding:'8px 12px', marginBottom:8, fontSize:13 }}>
                      <div style={{ color:'#cfe3d9' }}>Total amount: <b className='mono'>Rs.{Number(sanctionAmount).toLocaleString('en-IN')}</b></div>
                      <div style={{ color:'#cfe3d9', marginTop:2 }}>Service charge: <b className='mono'>- Rs.{fee.toLocaleString('en-IN')}</b></div>
                      <div style={{ color:'#fff', fontWeight:700, marginTop:4, fontSize:14 }}>Payable amount: <b className='mono'>Rs.{net.toLocaleString('en-IN')}</b></div>
                    </div>
                  </>
                ); })()}
                <label style={{ color:'#cfe3d9', fontSize:12, display:'block', marginBottom:4 }}>Sanction Remarks</label>
                <textarea className='input' style={{ padding:'8px 12px', fontSize:13, marginBottom:10, minHeight:50, resize:'vertical' }} value={sanctionRemark} onChange={e => setSanctionRemark(e.target.value)} placeholder='Optional remarks' />
                <button className='btn gold block' style={{ marginBottom:8 }} onClick={handleSanction}>Sanction Loan</button>
                <button className='btn outline-red block' onClick={() => setShowReject(true)}>Reject Application</button>
              </>
            )}
            {app.status === 'Sanctioned' && (
              <>
                <div style={{ background:'rgba(255,255,255,.08)', borderRadius:8, padding:'10px 12px', marginBottom:10, fontSize:13 }}>
                  <div style={{ color:'#cfe3d9' }}>Total amount: <b className='mono'>Rs.{Number(app.sanctionAmount).toLocaleString('en-IN')}</b></div>
                  <div style={{ color:'#cfe3d9', marginTop:4 }}>Deduction: <b className='mono'>- Rs.{(app.processingFee ?? calcFee(app.sanctionAmount)).toLocaleString('en-IN')}</b></div>
                  <div style={{ color:'#fff', fontWeight:700, marginTop:4, fontSize:15 }}>Payable amount: <b className='mono'>Rs.{Number(app.netDisbursalAmount).toLocaleString('en-IN')}</b></div>
                </div>
                <label style={{ color:'#cfe3d9', fontSize:12, display:'block', marginBottom:4 }}>Approved Tenure (days) <span style={{ color:'#f87171' }}>*</span></label>
                <input className='input mono' style={{ padding:'8px 12px', fontSize:14, marginBottom:8 }} value={approvedTenure} onChange={e => setApprovedTenure(e.target.value)} placeholder='e.g. 55' />
                <label style={{ color:'#cfe3d9', fontSize:12, display:'block', marginBottom:4 }}>Confirm Interest Rate (%) <span style={{ color:'#f87171' }}>*</span></label>
                <input className='input mono' style={{ padding:'8px 12px', fontSize:14, marginBottom:8 }} value={confirmedRate} onChange={e => setConfirmedRate(e.target.value)} placeholder='e.g. 10' />
                <label style={{ color:'#cfe3d9', fontSize:12, display:'block', marginBottom:4 }}>Verification Remarks</label>
                <textarea className='input' style={{ padding:'8px 12px', fontSize:13, marginBottom:10, minHeight:50, resize:'vertical' }} value={remark} onChange={e => setRemark(e.target.value)} placeholder='Optional remarks' />
                <button className='btn gold block' style={{ marginBottom:8 }} onClick={handleApprove}>Approve Loan</button>
                <button className='btn outline-red block' onClick={() => setShowReject(true)}>Reject Application</button>
              </>
            )}
            {app.status === 'NPA' && (
              <>
                <div style={{ background:'rgba(248,113,113,.2)', border:'1px solid rgba(248,113,113,.5)', borderRadius:8, padding:'10px 12px', marginBottom:10, fontSize:13, color:'#fca5a5' }}>
                  🔴 NPA — {app.missedStreak || '10+'} consecutive missed EMIs.
                  {app.npaDate && <div style={{ marginTop:4, fontSize:12 }}>Flagged on: {app.npaDate}</div>}
                </div>
                <label style={{ color:'#cfe3d9', fontSize:12, display:'block', marginBottom:4 }}>Recovery Note</label>
                <textarea className='input' style={{ padding:'8px 12px', fontSize:13, marginBottom:10, minHeight:60, resize:'vertical' }} value={recoveryNote} onChange={e => setRecoveryNote(e.target.value)} placeholder='Action taken / remarks' />
                <button className='btn gold block' style={{ marginBottom:8 }} onClick={() => updateStatus('Recovered', { recoveryNote })}>Mark as Recovered</button>
                <button className='btn outline-red block' onClick={() => updateStatus('Written Off', { recoveryNote })}>Write Off</button>
              </>
            )}
            {app.status === 'Recovery' && (
              <>
                <div style={{ background:'rgba(248,113,113,.15)', border:'1px solid rgba(248,113,113,.4)', borderRadius:8, padding:'10px 12px', marginBottom:10, fontSize:13, color:'#fca5a5' }}>
                  ⚠ Collector has flagged this loan for recovery.
                </div>
                <label style={{ color:'#cfe3d9', fontSize:12, display:'block', marginBottom:4 }}>Recovery Note</label>
                <textarea className='input' style={{ padding:'8px 12px', fontSize:13, marginBottom:10, minHeight:60, resize:'vertical' }} value={recoveryNote} onChange={e => setRecoveryNote(e.target.value)} placeholder='Action taken / remarks' />
                <button className='btn gold block' style={{ marginBottom:8 }} onClick={() => updateStatus('Recovered', { recoveryNote })}>Mark as Recovered</button>
                <button className='btn outline-red block' onClick={() => updateStatus('Written Off', { recoveryNote })}>Write Off</button>
              </>
            )}
            {app.status === 'Approved' && !app.disbursalRef && (
              <>
                <div style={{ background:'rgba(255,255,255,.08)', borderRadius:8, padding:'10px 12px', marginBottom:10, fontSize:13 }}>
                  <div style={{ color:'#cfe3d9' }}>Total amount: <b className='mono'>Rs.{Number(app.sanctionAmount).toLocaleString('en-IN')}</b></div>
                  <div style={{ color:'#cfe3d9', marginTop:4 }}>Deduction: <b className='mono'>- Rs.{(app.processingFee ?? calcFee(app.sanctionAmount)).toLocaleString('en-IN')}</b></div>
                  <div style={{ color:'#fff', fontWeight:700, marginTop:4, fontSize:15 }}>Payable amount: <b className='mono'>Rs.{Number(app.netDisbursalAmount).toLocaleString('en-IN')}</b></div>
                </div>
                <label style={{ color:'#cfe3d9', fontSize:12, display:'block', marginBottom:4 }}>Disbursal Reference</label>
                <input className='input mono' style={{ padding:'8px 12px', fontSize:14, marginBottom:10 }} value={disbursalRef} onChange={e => setDisbursalRef(e.target.value)} placeholder='UTR / cheque no.' />
                <button className='btn gold block' onClick={handleDisburse}>Record Disbursement</button>
              </>
            )}
          </div>
        </div>
      </div>

      {showReject && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.5)', display:'grid', placeItems:'center', zIndex:100 }}>
          <div className='panel pad' style={{ maxWidth:440, width:'90%' }}>
            <h3 style={{ marginBottom:14 }}>Reject Application</h3>
            <label style={{ fontSize:13, fontWeight:600, color:'var(--muted)', display:'block', marginBottom:6 }}>Rejection Reason <span style={{ color:'var(--red-tx)' }}>*</span></label>
            <textarea className='input' style={{ minHeight:80, padding:'10px 12px', fontSize:14, marginBottom:14, resize:'vertical' }} value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder='Mandatory: state reason for rejection' />
            <div className='row' style={{ gap:10, justifyContent:'flex-end' }}>
              <button className='btn outline' onClick={() => setShowReject(false)}>Cancel</button>
              <button className='btn outline-red' onClick={handleReject}>Confirm Rejection</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
