import { useState, useEffect } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';

const STATUS_ORDER = ['Pending Admin Approval','Under Review','Sanctioned','Approved','Rejected','Disbursed','NPA','Recovery','Recovered','Written Off'];
const SC = { 'Pending Admin Approval':'yellow', 'Under Review':'yellow', Sanctioned:'yellow', Approved:'green', Rejected:'red', Disbursed:'green', Draft:'grey', NPA:'red', Recovery:'red', Recovered:'green', 'Written Off':'grey' };
const Pill = ({ c, children }) => <span className={'pill ' + c}>{children}</span>;
function calcFee(amount) { return Math.floor(Number(amount) / 5000) * 250; }

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
        <div><h1>Loan Applications</h1><p>All collector-submitted applications &middot; {apps.length} total</p></div>
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
  const [sanctionAmount, setSanctionAmount] = useState('');
  const [sanctionRemark, setSanctionRemark] = useState('');
  const [approvedAmount, setApprovedAmount] = useState('');
  const [approvedTenure, setApprovedTenure] = useState('');
  const [confirmedRate, setConfirmedRate] = useState('');
  const [disbursalRef, setDisbursalRef] = useState('');
  const [showReject, setShowReject] = useState(false);
  const [recoveryNote, setRecoveryNote] = useState('');

  useEffect(() => {
    api.getApplication(appId).then(d => {
      setApp(d);
      setApprovedTenure(d.tenure || '');
      setConfirmedRate(d.rate || '');
    }).catch(() => setApp(null)).finally(() => setLoading(false));
  }, [appId]);

  if (loading) return <div className='panel pad' style={{ textAlign:'center', padding:48 }}><p className='muted'>Loading…</p></div>;
  if (!app) return (
    <div><p className='muted'>Application not found.</p><Link to='/admin/loan-applications' className='btn outline sm'>Back</Link></div>
  );

  const member = {};

  async function updateStatus(newStatus, extra) {
    const updated = { ...app, status: newStatus, ...extra, statusHistory: [...(app.statusHistory || []), { status: newStatus, date: new Date().toLocaleString(), by: 'Admin' }] };
    try {
      const saved = await api.updateApplication(appId, updated);
      setApp(saved);
    } catch (e) { alert('Error: ' + e.message); }
  }

  function handleSanction() {
    if (!sanctionAmount) { alert('Enter sanction amount'); return; }
    const fee = calcFee(sanctionAmount);
    const net = Number(sanctionAmount) - fee;
    if (net <= 0) { alert('Sanction amount must be greater than Rs.5,000'); return; }
    const loanId = 'MCS-' + new Date().getFullYear().toString().slice(-2) + '-' + Math.random().toString(36).slice(2,8).toUpperCase();
    updateStatus('Sanctioned', { sanctionAmount, processingFee: fee, netDisbursalAmount: net, sanctionRemark, loanId });
  }

  function handleApprove() {
    if (!approvedTenure || Number(approvedTenure) <= 0) { alert('Approved Tenure (days) is required'); return; }
    if (!confirmedRate || Number(confirmedRate) <= 0) { alert('Interest Rate is required'); return; }
    updateStatus('Approved', {
      approvedAmount: app.sanctionAmount,
      approvedTenure,
      confirmedRate,
      adminRemark: remark,
    });
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
          <div className='row' style={{ gap:12 }}>
            <h1>Application {app.appId}</h1>
            <Pill c={SC[app.status] || 'grey'}>{app.status}</Pill>
          </div>
          <p>{app.memberName} &middot; {app.memberId} &middot; Submitted {app.date}</p>
        </div>
        <Link to='/admin/loan-applications' className='btn outline sm'>Back</Link>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 320px', gap:18, alignItems:'start' }}>
        <div>
          <div className='panel pad' style={{ marginBottom:14 }}>
            <div className='eyebrow' style={{ fontSize:11, marginBottom:10 }}>1 &middot; Member Personal Information</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              {[['Name',app.memberName],['Member ID',app.memberId],['Mobile',app.mobile],['Alt Mobile',member.altMobile],['DOB',member.dob],['Gender',member.gender],['Aadhaar','XXXX XXXX '+(member.aadhaar||'').slice(-4)],['PAN',member.pan],['Occupation',member.occupation],['Address',member.address],['Village',member.village],['District',member.district],['State',member.state],['PIN',member.pin]].filter(([,v])=>v).map(([k,v]) => (
                <div key={k} className='kv'><span className='sans'>{k}</span><span>{v}</span></div>
              ))}
            </div>
            {member.nomName && (
              <div style={{ marginTop:12, borderTop:'1px dashed var(--line)', paddingTop:10 }}>
                <div className='eyebrow' style={{ fontSize:11, marginBottom:8 }}>Nominee</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                  {[['Name',member.nomName],['Relationship',member.nomRel],['Mobile',member.nomMobile],['Address',member.nomAddress]].filter(([,v])=>v).map(([k,v]) => (
                    <div key={k} className='kv'><span className='sans'>{k}</span><span>{v}</span></div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className='panel pad' style={{ marginBottom:14 }}>
            <div className='eyebrow' style={{ fontSize:11, marginBottom:10 }}>2 &middot; Loan Application Information</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              {[['Loan Type',app.loanType],['Requested Amount','Rs.'+app.loanAmount],['Tenure',app.tenure+' days'],['Interest Rate',app.rate+'%'],['Interest','Rs.'+app.interest],['Total Repayable','Rs.'+app.total],['EMI','Rs.'+app.emi],['Purpose',app.purpose],['Application Date',app.date]].map(([k,v]) => (
                <div key={k} className='kv'><span className='sans'>{k}</span><span className='mono'>{v}</span></div>
              ))}
            </div>
            {app.pending > 0 && app.penalty > 0 && (
              <div style={{ background:'var(--red-bg)', border:'1.5px solid var(--red-tx)', borderRadius:10, padding:12, marginTop:12 }}>
                <div className='eyebrow' style={{ fontSize:11, marginBottom:6, color:'var(--red-tx)' }}>⚠ Overdue Penalty (3% per day)</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                  {[['Pending','Rs.'+app.pending],['Penalty','Rs.'+app.penalty],['Total Payable','Rs.'+app.totalPayable]].map(([k,v]) => (
                    <div key={k} className='kv'><span className='sans'>{k}</span><span className='mono' style={{ color:'var(--red-tx)', fontWeight:700 }}>{v}</span></div>
                  ))}
                </div>
              </div>
            )}
            {app.sanctionAmount && (
              <div style={{ background:'var(--yellow-bg)', border:'1px solid var(--yellow-tx)', borderRadius:10, padding:12, marginTop:12 }}>
                <div className='eyebrow' style={{ fontSize:11, marginBottom:6 }}>Sanction Details</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                  {[['Total Amount','Rs.'+Number(app.sanctionAmount).toLocaleString('en-IN')],['Deduction','- Rs.'+(app.processingFee ?? calcFee(app.sanctionAmount)).toLocaleString('en-IN')],['Payable Amount','Rs.'+Number(app.netDisbursalAmount).toLocaleString('en-IN')],['Loan ID',app.loanId]].map(([k,v]) => (
                    <div key={k} className='kv'><span className='sans'>{k}</span><span className='mono' style={k==='Net Disbursal Amount'?{fontWeight:700,color:'var(--green-tx)'}:{}}>{v}</span></div>
                  ))}
                </div>
              </div>
            )}
            {app.approvedAmount && (
              <div style={{ background:'var(--green-bg)', borderRadius:10, padding:12, marginTop:12 }}>
                <div className='eyebrow' style={{ fontSize:11, marginBottom:6 }}>Approved Details</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                  {[['Approved Amount','Rs.'+app.approvedAmount],['Approved Tenure',app.approvedTenure+' days'],['Confirmed Rate',app.confirmedRate+'%']].map(([k,v]) => (
                    <div key={k} className='kv'><span className='sans'>{k}</span><span className='mono'>{v}</span></div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className='panel pad' style={{ marginBottom:14 }}>
            <div className='eyebrow' style={{ fontSize:11, marginBottom:10 }}>3 &middot; Bank Details</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              {[['Account Holder',app.bank?.holderName],['Bank',app.bank?.bankName],['Branch',app.bank?.branch],['Account No.','XXXX'+(app.bank?.accNo||'').slice(-4)],['IFSC',app.bank?.ifsc],['Account Type',app.bank?.accType],['UPI',app.bank?.upi]].filter(([,v])=>v).map(([k,v]) => (
                <div key={k} className='kv'><span className='sans'>{k}</span><span className='mono'>{v}</span></div>
              ))}
            </div>
          </div>

          <div className='panel pad' style={{ marginBottom:14 }}>
            <div className='eyebrow' style={{ fontSize:11, marginBottom:10 }}>4 &middot; Uploaded Documents</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
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
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
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
              <button className='btn block' style={{ marginBottom:10, background:'rgba(255,255,255,.15)' }} onClick={() => updateStatus('Under Review')}>Start Verification</button>
            )}
            {(app.status === 'Pending Admin Approval' || app.status === 'Under Review') && (
              <>
                <label style={{ color:'#cfe3d9', fontSize:12, display:'block', marginBottom:4 }}>Sanction Amount (Rs.) *</label>
                <input className='input mono' style={{ padding:'8px 12px', fontSize:14, marginBottom:4 }} value={sanctionAmount} onChange={e => setSanctionAmount(e.target.value)} placeholder={app.loanAmount} />
                {sanctionAmount > 0 && (() => { const fee = calcFee(sanctionAmount); const net = Number(sanctionAmount) - fee; return (
                  <div style={{ background:'rgba(255,255,255,.08)', borderRadius:8, padding:'8px 12px', marginBottom:8, fontSize:13 }}>
                    <div style={{ color:'#cfe3d9' }}>Total amount: <b className='mono'>Rs.{Number(sanctionAmount).toLocaleString('en-IN')}</b></div>
                    <div style={{ color:'#cfe3d9', marginTop:2 }}>Deduction: <b className='mono'>- Rs.{fee.toLocaleString('en-IN')}</b></div>
                    <div style={{ color:'#fff', fontWeight:700, marginTop:4, fontSize:14 }}>Payable amount: <b className='mono'>Rs.{net.toLocaleString('en-IN')}</b></div>
                  </div>
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
