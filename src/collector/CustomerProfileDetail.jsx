import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { api } from '../api.js';

function maskAadhaar(a) {
  if (!a) return '-';
  const s = String(a).replace(/\s/g, '');
  return 'XXXX XXXX ' + s.slice(-4);
}

function initials(name) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function fmt(n) { return Number(n || 0).toLocaleString('en-IN'); }

function ProgressBar({ pct, color }) {
  const bg = color === 'green' ? '#1f7a45' : color === 'yellow' ? '#D9A02E' : color === 'red' ? '#a61f1a' : '#c5ccc7';
  return (
    <div style={{ height: 8, borderRadius: 99, background: '#e8ebe8', overflow: 'hidden', marginTop: 6 }}>
      <div style={{ height: '100%', width: Math.min(100, pct) + '%', background: bg, borderRadius: 99, transition: 'width .4s' }} />
    </div>
  );
}

function PaymentHistoryTable({ collections, loanTotalDue }) {
  if (!collections || !collections.length) return (
    <div style={{ textAlign: 'center', padding: '18px 0', color: 'var(--muted)', fontSize: 13 }}>No payments recorded yet.</div>
  );
  let running = Number(loanTotalDue || 0);
  const rows = [...collections]
    .sort((a, b) => new Date(a.collectionDate || a.date || 0) - new Date(b.collectionDate || b.date || 0))
    .map((c, i) => {
      const amt = Number(c.amount || 0);
      running = Math.max(0, running - amt);
      return { ...c, _bal: running, _sl: i + 1 };
    });
  return (
    <div style={{ overflowX: 'auto', marginTop: 12 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ background: '#f6f8f6' }}>
            {['#', 'Date', 'Amount', 'Mode', 'Collected By', 'Balance After', 'Status'].map(h => (
              <th key={h} style={{ padding: '9px 10px', textAlign: (h === 'Amount' || h === 'Balance After') ? 'right' : 'left', fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.08em', color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.id || r._sl} style={{ borderTop: '1px solid var(--line)' }}>
              <td style={{ padding: '9px 10px', color: 'var(--muted)', fontSize: 12 }}>{r._sl}</td>
              <td style={{ padding: '9px 10px', fontFamily: 'var(--mono)', fontSize: 12, whiteSpace: 'nowrap' }}>{r.date || r.collectionDate || '-'}</td>
              <td style={{ padding: '9px 10px', fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--green-tx)', textAlign: 'right' }}>&#8377;{fmt(r.amount)}</td>
              <td style={{ padding: '9px 10px', fontSize: 12 }}>{r.mode || 'Cash'}</td>
              <td style={{ padding: '9px 10px', fontSize: 12 }}>{r.collectorName || '-'}</td>
              <td style={{ padding: '9px 10px', fontFamily: 'var(--mono)', fontSize: 12, textAlign: 'right', color: r._bal > 0 ? 'var(--red-tx)' : 'var(--green-tx)', fontWeight: 600 }}>&#8377;{fmt(r._bal)}</td>
              <td style={{ padding: '9px 10px' }}><span className={'pill ' + (r._bal <= 0 ? 'green' : 'yellow')} style={{ fontSize: 11 }}>{r._bal <= 0 ? 'Cleared' : 'Partial'}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LoanDetailCard({ loan, loanIndex, collections, todayCollected, onCollectEmi, onPayBalance }) {
  const [expanded, setExpanded] = useState(false);
  const loanAmt = Number(loan.loanAmount || 0);
  const totalPaid = Number(loan.totalPaid || 0);
  const pending = Number(loan.pending || 0);
  const totalDue = totalPaid + pending;
  const emi = Number(loan.emi || 100);
  const tenure = Number(loan.tenure || 55);
  const paidInstallments = emi > 0 ? Math.floor(totalPaid / emi) : 0;
  const pendingInstallments = Math.max(0, tenure - paidInstallments);
  const pct = totalDue > 0 ? Math.round((totalPaid / totalDue) * 100) : 0;
  const isClosed = ['Closed', 'Recovered', 'Written Off'].includes(loan.status);
  const isNPA = loan.status === 'NPA';
  const loanCols = collections.filter(c => c.appId === loan.appId);
  const todayIso = new Date().toISOString().slice(0, 10);
  const todayKey = new Date().toLocaleDateString('en-IN');
  const todayAmt = loanCols.filter(c => c.date === todayKey || c.collectionDate === todayIso).reduce((s, c) => s + Number(c.amount || 0), 0);

  let statusColor = 'green', statusLabel = 'Active';
  if (isClosed) { statusColor = 'grey'; statusLabel = loan.status; }
  else if (isNPA) { statusColor = 'red'; statusLabel = 'NPA / Overdue'; }
  else if (pending <= 0) { statusColor = 'green'; statusLabel = 'Completed'; }
  else if (pending > loanAmt * 0.5) { statusColor = 'yellow'; statusLabel = 'Active'; }

  const headerBg = isClosed ? '#f0f3f0' : isNPA ? 'var(--red-bg)' : 'var(--g800)';
  const headerColor = isClosed ? 'var(--ink)' : isNPA ? 'var(--red-tx)' : '#fff';

  const summaryRows = [
    { label: 'Original Loan Amount', val: '&#8377;' + fmt(loanAmt) },
    { label: 'Total Amount to Repay', val: '&#8377;' + fmt(totalDue) },
    { label: 'Total Paid', val: '&#8377;' + fmt(totalPaid), color: 'var(--green-tx)', bold: true },
    { label: 'Pending Amount', val: '&#8377;' + fmt(pending), color: pending > 0 ? 'var(--red-tx)' : 'var(--green-tx)', bold: true },
    { label: "Today's Collection", val: todayAmt > 0 ? '&#8377;' + fmt(todayAmt) : '-', color: todayAmt > 0 ? 'var(--green-tx)' : 'var(--muted)' },
  ];

  return (
    <div style={{ border: '2px solid ' + (isClosed ? 'var(--line)' : isNPA ? 'var(--red-tx)' : 'var(--g800)'), borderRadius: 18, marginBottom: 24, overflow: 'hidden', background: isClosed ? '#f9fbf9' : '#fff' }}>
      {/* Header */}
      <div style={{ background: headerBg, color: headerColor, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: isClosed ? 'var(--soft)' : isNPA ? 'var(--red-tx)' : 'var(--gold)', color: isClosed ? 'var(--muted)' : 'var(--g900)', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 16, flexShrink: 0 }}>{loanIndex}</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16 }}>Loan {loanIndex}</div>
            <div style={{ fontSize: 12, opacity: 0.8, marginTop: 2 }}>{loan.loanType || 'Daily Loan'}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 13, opacity: 0.85 }}>{loan.loanId || loan.appId}</span>
          <span className={'pill ' + statusColor} style={{ fontSize: 12 }}>{statusLabel}</span>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '18px 20px' }}>
        {/* Meta grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '8px 16px', marginBottom: 16 }}>
          {[
            ['Loan ID', loan.loanId || loan.appId],
            ['Loan Date', loan.disbursalDate || loan.date || '-'],
            ['Daily EMI', '&#8377;' + fmt(emi)],
            ['Total Installments', tenure],
            ['Paid Installments', paidInstallments],
            ['Pending Installments', pendingInstallments],
          ].map(([k, v]) => (
            <div key={k} style={{ borderLeft: '2px solid var(--line)', paddingLeft: 10 }}>
              <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em' }}>{k}</div>
              <div style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 14, marginTop: 2 }} dangerouslySetInnerHTML={{ __html: String(v) }} />
            </div>
          ))}
        </div>

        {/* Payment Summary */}
        <div style={{ background: 'var(--soft)', borderRadius: 12, overflow: 'hidden', marginBottom: 14 }}>
          <div style={{ padding: '10px 14px', fontWeight: 700, fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.08em', borderBottom: '1px solid var(--line)' }}>Payment Summary</div>
          {summaryRows.map(r => (
            <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 14px', borderBottom: '1px solid var(--line)', background: r.bold ? '#fff' : 'transparent' }}>
              <span style={{ fontSize: 13, color: 'var(--muted)' }}>{r.label}</span>
              <span style={{ fontFamily: 'var(--mono)', fontWeight: r.bold ? 800 : 600, fontSize: 14, color: r.color || 'var(--ink)' }} dangerouslySetInnerHTML={{ __html: r.val }} />
            </div>
          ))}
        </div>

        {/* Progress */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>
            <span>Repayment Progress</span>
            <span style={{ fontWeight: 700, color: pct >= 80 ? 'var(--green-tx)' : pct >= 40 ? 'var(--yellow-tx)' : 'var(--red-tx)' }}>{pct}% repaid</span>
          </div>
          <ProgressBar pct={pct} color={pct >= 80 ? 'green' : pct >= 40 ? 'yellow' : 'red'} />
        </div>

        {/* Pending highlight */}
        {pending > 0 && !isClosed && (
          <div style={{ background: 'var(--red-bg)', border: '1px solid var(--red-tx)', borderRadius: 10, padding: '10px 14px', marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: 'var(--red-tx)', fontWeight: 600 }}>Pending Balance</span>
            <span style={{ fontFamily: 'var(--mono)', fontWeight: 800, fontSize: 18, color: 'var(--red-tx)' }}>&#8377;{fmt(pending)}</span>
          </div>
        )}

        {/* Action buttons */}
        {!isClosed && (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', paddingTop: 12, borderTop: '1px dashed var(--line)' }}>
            {todayCollected
              ? <span className="pill green nodot" style={{ fontSize: 13, padding: '8px 16px' }}>&#10003; Collected today</span>
              : (
                <button className="btn sm" style={{ fontSize: 13, padding: '8px 18px', borderRadius: 10, fontWeight: 700, background: 'var(--g800)' }} onClick={() => onCollectEmi(loan)}>
                  Collect &#8377;{fmt(emi)} EMI
                </button>
              )
            }
            {pending > 0 && (
              <button className="btn outline sm" style={{ fontSize: 13, padding: '8px 18px', borderRadius: 10, fontWeight: 700 }} onClick={() => onPayBalance(loan)}>
                Pay Balance &#8377;{fmt(pending)}
              </button>
            )}
          </div>
        )}

        {/* Expandable history */}
        <div style={{ marginTop: 14, borderTop: '1px solid var(--line)', paddingTop: 12 }}>
          <button onClick={() => setExpanded(e => !e)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: 'var(--g800)', padding: 0 }}>
            <span>{expanded ? '▼' : '▶'}</span>
            Payment History ({loanCols.length} records)
          </button>
          {expanded && <PaymentHistoryTable collections={loanCols} loanTotalDue={totalDue} />}
        </div>
      </div>
    </div>
  );
}

export default function CustomerProfileDetail() {
  const { memberId } = useParams();
  const nav = useNavigate();
  const [member, setMember] = useState(null);
  const [loans, setLoans] = useState([]);
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalLoan, setModalLoan] = useState(null);
  const [modalMode, setModalMode] = useState('emi');
  const [amountPaid, setAmountPaid] = useState('');
  const [remarks, setRemarks] = useState('');
  const [saving, setSaving] = useState(false);
  const [formErr, setFormErr] = useState('');
  const user = JSON.parse(localStorage.getItem('mlc_user') || '{"name":"Collector","id":"COL-001"}');
  const todayKey = new Date().toLocaleDateString('en-IN');
  const todayIso = new Date().toISOString().slice(0, 10);

  async function load() {
    setLoading(true);
    try {
      const [mem, loansData, cols] = await Promise.all([
        api.getMember(memberId),
        api.getMemberLoans(memberId),
        api.getCollections({ memberId }),
      ]);
      setMember(mem);
      const rawLoans = loansData.loans || [];
      const enriched = await Promise.all(rawLoans.map(async l => {
        try {
          const detail = await api.getApplication(l.appId);
          return {
            ...l,
            emi: Number(l.emi || detail.emi || detail.dailyEmi || 100),
            tenure: Number(l.tenure || detail.approvedTenure || detail.tenure || 55),
            loanType: l.loanType || detail.loanType,
            totalPaid: Number(detail.totalPaid ?? l.totalPaid ?? 0),
            pending: Number(detail.pending ?? l.pending ?? 0),
            loanAmount: Number(l.loanAmount || detail.loanAmount || 0),
            disbursalDate: l.disbursalDate || detail.disbursalDate || '',
            date: l.date || detail.date || '',
          };
        } catch { return { ...l, emi: Number(l.emi || 100), tenure: Number(l.tenure || 55) }; }
      }));
      setLoans(enriched);
      setCollections(cols || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [memberId]);

  const activeLoans = loans.filter(l => ['Disbursed', 'Approved', 'NPA'].includes(l.status));
  const totalLoanAmt = loans.reduce((s, l) => s + Number(l.loanAmount || 0), 0);
  const totalPaidAll = loans.reduce((s, l) => s + Number(l.totalPaid || 0), 0);
  const totalPendingAll = loans.reduce((s, l) => s + Number(l.pending || 0), 0);
  const todayCollectedSet = new Set(collections.filter(c => c.date === todayKey || c.collectionDate === todayIso).map(c => c.appId));
  const todayTotalAmt = collections.filter(c => c.date === todayKey || c.collectionDate === todayIso).reduce((s, c) => s + Number(c.amount || 0), 0);
  const activeWithBalance = activeLoans.filter(l => Number(l.pending || 0) > 0 && l.status !== 'NPA');
  const allCollectedToday = activeWithBalance.length > 0 && activeWithBalance.every(l => todayCollectedSet.has(l.appId));
  const dueToday = activeWithBalance.filter(l => !todayCollectedSet.has(l.appId)).reduce((s, l) => s + Number(l.emi || 100), 0);

  async function handleCollect() {
    setFormErr('');
    const amt = Number(amountPaid);
    if (!amt || amt <= 0) { setFormErr('Enter a valid amount.'); return; }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('collectorId', user.id);
      fd.append('collectorName', user.name);
      fd.append('memberName', member.name);
      fd.append('memberId', memberId);
      fd.append('appId', modalLoan.appId);
      fd.append('amount', amt);
      fd.append('mode', 'Cash');
      fd.append('reference', remarks);
      fd.append('date', todayKey);
      fd.append('collectionDate', todayIso);
      await api.saveCollectionForm(fd);
      setShowModal(false);
      setModalLoan(null);
      setAmountPaid('');
      setRemarks('');
      await load();
    } catch (e) { setFormErr('Error: ' + e.message); }
    finally { setSaving(false); }
  }

  if (loading) return <div style={{ textAlign: 'center', padding: 60 }}><p className="muted">Loading profile...</p></div>;
  if (!member) return <div style={{ textAlign: 'center', padding: 60 }}><p className="muted">Member not found.</p><button className="btn outline sm" onClick={() => nav('/app/collect')} style={{ marginTop: 16 }}>Back</button></div>;

  const memberSince = member.createdAt ? new Date(member.createdAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : '-';

  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>

      {/* Profile Header */}
      <div style={{ background: 'var(--g800)', color: '#fff', borderRadius: 20, padding: '24px 28px', marginBottom: 20 }}>
        <button onClick={() => nav('/app/collect')} style={{ background: 'rgba(255,255,255,.15)', border: 0, color: '#fff', borderRadius: 10, padding: '8px 14px', fontSize: 14, fontWeight: 600, cursor: 'pointer', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 6 }}>
          &#8592; Back
        </button>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.1em', color: '#cfe3d9', textTransform: 'uppercase', marginBottom: 16 }}>Customer Profile</div>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 18, flexWrap: 'wrap' }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--gold)', color: 'var(--g900)', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 26, flexShrink: 0 }}>
            {initials(member.name)}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.2 }}>{member.name}</div>
            {member.occupation && <div style={{ color: '#cfe3d9', fontSize: 14, marginTop: 4 }}>{member.occupation}</div>}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 10, fontSize: 13, color: '#cfe3d9' }}>
              {(member.village || member.district) && <span>&#128205; {[member.village, member.district].filter(Boolean).join(', ')}</span>}
              {memberSince !== '-' && <span>&#128197; Member since {memberSince}</span>}
            </div>
            <div style={{ marginTop: 12 }}>
              <span style={{ background: 'var(--gold)', color: 'var(--g900)', borderRadius: 999, padding: '4px 14px', fontSize: 12, fontWeight: 800 }}>{member.memberId}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Full Loan Report Button — below profile card */}
      <Link
        to={`/app/collect/member/${memberId}/report`}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'var(--gold)', color: 'var(--g900)', borderRadius: 12, padding: '13px 20px', fontSize: 15, fontWeight: 800, textDecoration: 'none', marginBottom: 20, boxShadow: '0 2px 8px rgba(0,0,0,.10)' }}
      >
        📊 Full Loan Report
      </Link>

      {/* Overall Loan Summary */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 10 }}>Overall Loan Summary</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10 }}>
          {[
            { label: 'Total Loans', val: loans.length, bg: '#fff', tx: 'var(--ink)' },
            { label: 'Active Loans', val: activeLoans.length, bg: 'var(--green-bg)', tx: 'var(--green-tx)' },
            { label: 'Total Loan Amount', val: '&#8377;' + fmt(totalLoanAmt), bg: '#fff', tx: 'var(--ink)' },
            { label: 'Total Repaid', val: '&#8377;' + fmt(totalPaidAll), bg: 'var(--green-bg)', tx: 'var(--green-tx)' },
            { label: 'Outstanding Balance', val: '&#8377;' + fmt(totalPendingAll), bg: totalPendingAll > 0 ? 'var(--red-bg)' : 'var(--green-bg)', tx: totalPendingAll > 0 ? 'var(--red-tx)' : 'var(--green-tx)' },
            { label: 'Collected Today', val: todayTotalAmt > 0 ? '&#8377;' + fmt(todayTotalAmt) : allCollectedToday ? '&#10003; Done' : dueToday > 0 ? '&#8377;' + fmt(dueToday) + ' due' : '-', bg: allCollectedToday ? 'var(--green-bg)' : todayTotalAmt > 0 ? 'var(--yellow-bg)' : '#fff', tx: allCollectedToday ? 'var(--green-tx)' : todayTotalAmt > 0 ? 'var(--yellow-tx)' : 'var(--ink)' },
          ].map(c => (
            <div key={c.label} className="panel pad" style={{ background: c.bg, padding: '12px 14px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.08em' }}>{c.label}</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 18, fontWeight: 800, marginTop: 5, color: c.tx }} dangerouslySetInnerHTML={{ __html: String(c.val) }} />
            </div>
          ))}
        </div>
      </div>

      {/* Individual Loan Cards */}
      {loans.length === 0 && (
        <div className="panel pad" style={{ textAlign: 'center', padding: 40, marginBottom: 18 }}>
          <p className="muted">No loan records found for this member.</p>
        </div>
      )}

      {loans.length > 0 && (
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontWeight: 700, fontSize: 11, marginBottom: 14, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.08em' }}>
            Loan Details ({loans.length} {loans.length === 1 ? 'Loan' : 'Loans'})
          </div>
          {loans.map((loan, idx) => (
            <LoanDetailCard
              key={loan.appId}
              loan={loan}
              loanIndex={idx + 1}
              collections={collections}
              todayCollected={todayCollectedSet.has(loan.appId)}
              onCollectEmi={l => { setModalLoan(l); setModalMode('emi'); setAmountPaid(String(l.emi || 100)); setFormErr(''); setShowModal(true); }}
              onPayBalance={l => { setModalLoan(l); setModalMode('balance'); setAmountPaid(String(l.pending || '')); setFormErr(''); setShowModal(true); }}
            />
          ))}
        </div>
      )}

      {/* KYC Section */}
      <div className="panel pad" style={{ marginBottom: 18 }}>
        <div style={{ fontWeight: 700, fontSize: 11, marginBottom: 14, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.08em' }}>KYC - Identity Details</div>
        <div>
          {[
            ['Mobile', member.mobile || '-'],
            ['Aadhaar', maskAadhaar(member.aadhaar)],
            ['PAN', member.pan || '-'],
            ['Address', [member.address, member.village, member.district, member.state, member.pin].filter(Boolean).join(', ') || '-'],
          ].map(([k, v]) => (
            <div key={k} className="kv" style={{ borderBottom: '1px dashed var(--line)', padding: '10px 0' }}>
              <span style={{ color: 'var(--muted)', fontSize: 14 }}>{k}</span>
              <span style={{ fontFamily: k === 'Address' ? 'inherit' : 'var(--mono)', fontSize: 14, textAlign: 'right', maxWidth: '60%' }}>{v}</span>
            </div>
          ))}
        </div>
      </div>

      {allCollectedToday && activeWithBalance.length > 0 && (
        <div style={{ textAlign: 'center', padding: '16px 0 32px' }}>
          <span className="pill green" style={{ fontSize: 14, padding: '10px 20px' }}>&#10003; All collections done for today</span>
        </div>
      )}

      {/* Collect Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={() => setShowModal(false)}>
          <div style={{ background: '#fff', borderRadius: 20, padding: 28, width: '100%', maxWidth: 460 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>{modalMode === 'emi' ? 'Collect EMI' : 'Pay Balance'}</h3>
              <button onClick={() => setShowModal(false)} style={{ border: 0, background: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--muted)' }}>&#10005;</button>
            </div>

            {modalLoan && (
              <div style={{ background: 'var(--g800)', color: '#fff', borderRadius: 12, padding: '12px 16px', marginBottom: 16 }}>
                <div style={{ fontSize: 11, color: '#cfe3d9', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 6 }}>Selected Loan</div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{member.name}</div>
                <div style={{ fontSize: 13, color: '#cfe3d9', marginTop: 4, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                  <span>{modalLoan.loanId || modalLoan.appId}</span>
                  <span>{modalLoan.loanType || 'Daily Loan'}</span>
                </div>
              </div>
            )}

            {modalLoan && (
              <div style={{ background: 'var(--soft)', borderRadius: 10, padding: '10px 14px', marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, color: 'var(--muted)' }}>Total Due</span>
                  <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 14 }}>&#8377;{fmt(Number(modalLoan.totalPaid || 0) + Number(modalLoan.pending || 0))}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, color: 'var(--muted)' }}>Already Paid</span>
                  <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 14, color: 'var(--green-tx)' }}>&#8377;{fmt(modalLoan.totalPaid)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13, color: 'var(--muted)' }}>Pending Balance</span>
                  <span style={{ fontFamily: 'var(--mono)', fontWeight: 800, fontSize: 15, color: 'var(--red-tx)' }}>&#8377;{fmt(modalLoan.pending)}</span>
                </div>
              </div>
            )}

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--muted)', marginBottom: 6 }}>Amount (&#8377;) *</label>
              <input className="input mono" style={{ padding: '10px 12px', fontSize: 16 }} type="number" min="1" value={amountPaid} onChange={e => setAmountPaid(e.target.value)} />
            </div>
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--muted)', marginBottom: 6 }}>Remarks (optional)</label>
              <input className="input" style={{ padding: '10px 12px', fontSize: 14 }} value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="e.g. Cash collected at door" />
            </div>
            {formErr && <div style={{ background: 'var(--red-bg)', color: 'var(--red-tx)', borderRadius: 10, padding: '10px 14px', fontSize: 13, marginBottom: 14 }}>{formErr}</div>}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn outline" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn" style={{ background: 'var(--g800)' }} onClick={handleCollect} disabled={saving}>
                {saving ? 'Saving...' : 'Save Payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
