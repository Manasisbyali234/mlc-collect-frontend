import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api.js';

function fmt(n) { return Number(n || 0).toLocaleString('en-IN'); }

const STATUS_COLOR = { Paid: '#1f7a45', Missed: '#a61f1a', Upcoming: '#D9A02E' };
const STATUS_BG = { Paid: '#e6f4ec', Missed: '#fdecea', Upcoming: '#fdf6e3' };

function Badge({ status }) {
  return (
    <span style={{
      display: 'inline-block', padding: '2px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700,
      background: STATUS_BG[status] || '#f0f0f0', color: STATUS_COLOR[status] || '#555'
    }}>{status}</span>
  );
}

function SummaryCard({ label, value, sub, bg, color }) {
  return (
    <div style={{ background: bg || '#fff', border: '1px solid #e0e7e0', borderRadius: 14, padding: '14px 16px' }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 4 }}>{label}</div>
      <div style={{ fontFamily: 'var(--mono, monospace)', fontWeight: 800, fontSize: 20, color: color || '#1a2e1a' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: '#888', marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

export default function LoanReportPage() {
  const { memberId } = useParams();
  const nav = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('schedule');
  const [expandedLoan, setExpandedLoan] = useState(null);

  useEffect(() => {
    api.getCustomerReport(memberId)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [memberId]);

  if (loading) return (
    <div style={{ textAlign: 'center', padding: 80 }}>
      <p style={{ color: '#888' }}>Loading full loan report...</p>
    </div>
  );

  if (!data) return (
    <div style={{ textAlign: 'center', padding: 80 }}>
      <p style={{ color: '#888' }}>Could not load report.</p>
      <button onClick={() => nav(-1)} style={{ marginTop: 16, padding: '10px 20px', borderRadius: 10, border: '1px solid #ccc', cursor: 'pointer' }}>← Back</button>
    </div>
  );

  const { member, summary, loans, payments, latePaymentSummary } = data;

  // Build full schedule across all loans
  const allScheduleRows = [];
  loans.forEach((loan, li) => {
    const loanSummary = latePaymentSummary.find(l => l.loanId === loan.loanId) || {};
    const schedule = loanSummary.lateDetails ? [] : []; // schedule comes from payments
    // We'll use the per-loan schedule from latePaymentSummary
    allScheduleRows.push({ loan, loanSummary });
  });

  const tabs = [
    { key: 'schedule', label: '📅 EMI Schedule' },
    { key: 'payments', label: '💰 Payment History' },
    { key: 'missed', label: '⚠️ Missed / Late' },
    { key: 'upcoming', label: '🔔 Upcoming' },
  ];

  // For schedule tab: use getApplication schedule data via payments
  // Group payments by loan
  const paymentsByLoan = {};
  payments.forEach(p => {
    if (!paymentsByLoan[p.loanIdDisplay]) paymentsByLoan[p.loanIdDisplay] = [];
    paymentsByLoan[p.loanIdDisplay].push(p);
  });

  // Build schedule per loan from latePaymentSummary
  // We need actual day-by-day schedule — fetch from getApplication for each loan
  const [schedules, setSchedules] = useState({});
  useEffect(() => {
    if (!data) return;
    const fetchAll = async () => {
      const result = {};
      for (const loan of data.loans) {
        try {
          const detail = await api.getApplication(loan.appId);
          result[loan.appId] = detail.schedule || [];
        } catch { result[loan.appId] = []; }
      }
      setSchedules(result);
    };
    fetchAll();
  }, [data]);

  const allDays = Object.values(schedules).flat();
  const paidDays = allDays.filter(d => d.status === 'Paid');
  const missedDays = allDays.filter(d => d.status === 'Missed');
  const upcomingDays = allDays.filter(d => d.status === 'Upcoming');

  const todayIso = new Date().toISOString().slice(0, 10);
  const todaySchedule = allDays.filter(d => d.date === todayIso);
  const nextDue = upcomingDays.sort((a, b) => a.date.localeCompare(b.date))[0];

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '0 0 40px' }}>

      {/* Header */}
      <div style={{ background: 'var(--g800, #1a3a2a)', color: '#fff', borderRadius: '0 0 20px 20px', padding: '20px 24px 24px', marginBottom: 20 }}>
        <button onClick={() => nav(-1)} style={{ background: 'rgba(255,255,255,.15)', border: 0, color: '#fff', borderRadius: 10, padding: '7px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', marginBottom: 16 }}>
          ← Back
        </button>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.1em', color: '#cfe3d9', textTransform: 'uppercase', marginBottom: 8 }}>Full Loan Report</div>
        <div style={{ fontSize: 22, fontWeight: 800 }}>{member.name}</div>
        <div style={{ fontSize: 13, color: '#cfe3d9', marginTop: 4 }}>{member.memberId} · {member.mobile}</div>
      </div>

      {/* Overall Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10, marginBottom: 20, padding: '0 4px' }}>
        <SummaryCard label="Total Borrowed" value={'₹' + fmt(summary.totalBorrowed)} />
        <SummaryCard label="Total Paid" value={'₹' + fmt(summary.totalPaid)} bg="#e6f4ec" color="#1f7a45" />
        <SummaryCard label="Outstanding Balance" value={'₹' + fmt(summary.totalPending)} bg={summary.totalPending > 0 ? '#fdecea' : '#e6f4ec'} color={summary.totalPending > 0 ? '#a61f1a' : '#1f7a45'} />
        <SummaryCard label="Daily EMI" value="₹100" sub={`${loans.length} loan${loans.length !== 1 ? 's' : ''} · ${summary.activeLoans} active`} />
        <SummaryCard label="Days Paid" value={paidDays.length} bg="#e6f4ec" color="#1f7a45" sub={`₹${fmt(paidDays.length * 100)} collected`} />
        <SummaryCard label="Days Missed" value={missedDays.length} bg={missedDays.length > 0 ? '#fdecea' : '#e6f4ec'} color={missedDays.length > 0 ? '#a61f1a' : '#1f7a45'} sub={`₹${fmt(missedDays.length * 100)} pending`} />
        <SummaryCard label="Upcoming Days" value={upcomingDays.length} bg="#fdf6e3" color="#b07d10" sub={nextDue ? `Next: ${nextDue.date}` : 'None'} />
        <SummaryCard label="Today's Status" value={todaySchedule.length > 0 ? todaySchedule[0].status : 'No EMI'} bg={todaySchedule[0]?.status === 'Paid' ? '#e6f4ec' : todaySchedule[0]?.status === 'Missed' ? '#fdecea' : '#fdf6e3'} color={todaySchedule[0]?.status === 'Paid' ? '#1f7a45' : todaySchedule[0]?.status === 'Missed' ? '#a61f1a' : '#b07d10'} sub={`₹100 due today`} />
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid #e0e7e0', marginBottom: 18, overflowX: 'auto' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
            padding: '10px 16px', border: 0, borderBottom: activeTab === t.key ? '2px solid #1a3a2a' : '2px solid transparent',
            background: 'transparent', fontWeight: activeTab === t.key ? 700 : 400, cursor: 'pointer', fontSize: 13,
            marginBottom: -2, whiteSpace: 'nowrap', color: activeTab === t.key ? '#1a3a2a' : '#666'
          }}>{t.label}</button>
        ))}
      </div>

      {/* ── EMI Schedule Tab ── */}
      {activeTab === 'schedule' && (
        <div>
          {loans.map(loan => {
            const sch = schedules[loan.appId] || [];
            const isOpen = expandedLoan === loan.appId;
            const lPaid = sch.filter(d => d.status === 'Paid').length;
            const lMissed = sch.filter(d => d.status === 'Missed').length;
            const lUpcoming = sch.filter(d => d.status === 'Upcoming').length;
            return (
              <div key={loan.appId} style={{ border: '1.5px solid #e0e7e0', borderRadius: 14, marginBottom: 14, overflow: 'hidden' }}>
                <div
                  onClick={() => setExpandedLoan(isOpen ? null : loan.appId)}
                  style={{ background: '#f6f9f6', padding: '14px 18px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}
                >
                  <div>
                    <span style={{ fontWeight: 800, fontSize: 15 }}>Loan {loan.sl} — {loan.loanId}</span>
                    <span style={{ marginLeft: 10, fontSize: 12, color: '#888' }}>{loan.loanType}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 12, background: '#e6f4ec', color: '#1f7a45', borderRadius: 99, padding: '2px 10px', fontWeight: 700 }}>✓ {lPaid} paid</span>
                    {lMissed > 0 && <span style={{ fontSize: 12, background: '#fdecea', color: '#a61f1a', borderRadius: 99, padding: '2px 10px', fontWeight: 700 }}>✗ {lMissed} missed</span>}
                    <span style={{ fontSize: 12, background: '#fdf6e3', color: '#b07d10', borderRadius: 99, padding: '2px 10px', fontWeight: 700 }}>⏳ {lUpcoming} upcoming</span>
                    <span style={{ fontSize: 13, color: '#888' }}>{isOpen ? '▲' : '▼'}</span>
                  </div>
                </div>
                {isOpen && (
                  <div style={{ overflowX: 'auto' }}>
                    {sch.length === 0 ? (
                      <div style={{ padding: '20px', textAlign: 'center', color: '#888', fontSize: 13 }}>Schedule not available (loan may not be disbursed yet)</div>
                    ) : (
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead>
                          <tr style={{ background: '#f0f4f0' }}>
                            {['Day', 'Date', 'Due', 'Paid', 'Status'].map(h => (
                              <th key={h} style={{ padding: '8px 12px', textAlign: h === 'Due' || h === 'Paid' ? 'right' : 'left', fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '.06em', whiteSpace: 'nowrap' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {sch.map(row => (
                            <tr key={row.day} style={{ borderTop: '1px solid #f0f0f0', background: row.date === todayIso ? '#fffbe6' : 'transparent' }}>
                              <td style={{ padding: '7px 12px', color: '#888', fontSize: 12 }}>{row.day}</td>
                              <td style={{ padding: '7px 12px', fontFamily: 'monospace', fontSize: 12, whiteSpace: 'nowrap' }}>
                                {row.date === todayIso ? <strong>{row.date} 📍</strong> : row.date}
                              </td>
                              <td style={{ padding: '7px 12px', fontFamily: 'monospace', textAlign: 'right' }}>₹{fmt(row.due)}</td>
                              <td style={{ padding: '7px 12px', fontFamily: 'monospace', textAlign: 'right', color: row.paid > 0 ? '#1f7a45' : '#ccc', fontWeight: row.paid > 0 ? 700 : 400 }}>
                                {row.paid > 0 ? '₹' + fmt(row.paid) : '—'}
                              </td>
                              <td style={{ padding: '7px 12px' }}><Badge status={row.status} /></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Payment History Tab ── */}
      {activeTab === 'payments' && (
        <div>
          {payments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>No payments recorded yet.</div>
          ) : (
            <div style={{ overflowX: 'auto', border: '1.5px solid #e0e7e0', borderRadius: 14 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f6f9f6' }}>
                    {['#', 'Date', 'Loan', 'Amount', 'Balance After', 'Mode', 'Collected By', 'Late?'].map(h => (
                      <th key={h} style={{ padding: '9px 12px', textAlign: h === 'Amount' || h === 'Balance After' ? 'right' : 'left', fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '.06em', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {payments.map(p => (
                    <tr key={p.sl} style={{ borderTop: '1px solid #f0f0f0' }}>
                      <td style={{ padding: '8px 12px', color: '#aaa', fontSize: 12 }}>{p.sl}</td>
                      <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: 12, whiteSpace: 'nowrap' }}>{p.paymentDate}</td>
                      <td style={{ padding: '8px 12px', fontSize: 12, color: '#555' }}>{p.loanIdDisplay}</td>
                      <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontWeight: 700, color: '#1f7a45', textAlign: 'right' }}>₹{fmt(p.dailyPayment)}</td>
                      <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: 12, textAlign: 'right', color: p.remainingBalance > 0 ? '#a61f1a' : '#1f7a45', fontWeight: 600 }}>₹{fmt(p.remainingBalance)}</td>
                      <td style={{ padding: '8px 12px', fontSize: 12 }}>{p.paymentMode || 'Cash'}</td>
                      <td style={{ padding: '8px 12px', fontSize: 12 }}>{p.collectedBy || '—'}</td>
                      <td style={{ padding: '8px 12px' }}>
                        {p.isLate
                          ? <span style={{ background: '#fdecea', color: '#a61f1a', borderRadius: 99, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>{p.daysLate}d late</span>
                          : <span style={{ color: '#1f7a45', fontSize: 12 }}>✓ On time</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div style={{ marginTop: 12, padding: '12px 16px', background: '#f6f9f6', borderRadius: 12, display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
            <span style={{ color: '#888' }}>{payments.length} payments recorded</span>
            <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>Total: ₹{fmt(payments.reduce((s, p) => s + p.dailyPayment, 0))}</span>
          </div>
        </div>
      )}

      {/* ── Missed / Late Tab ── */}
      {activeTab === 'missed' && (
        <div>
          {/* Missed days per loan */}
          {loans.map(loan => {
            const sch = schedules[loan.appId] || [];
            const missed = sch.filter(d => d.status === 'Missed');
            const lSummary = latePaymentSummary.find(l => l.loanId === loan.loanId) || {};
            if (missed.length === 0 && !lSummary.paidLate) return null;
            return (
              <div key={loan.appId} style={{ border: '1.5px solid #fca5a5', borderRadius: 14, marginBottom: 16, overflow: 'hidden' }}>
                <div style={{ background: '#fdecea', padding: '12px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <span style={{ fontWeight: 800, fontSize: 14 }}>Loan {loan.sl} — {loan.loanId}</span>
                    <span style={{ marginLeft: 10, fontSize: 12, color: '#888' }}>{loan.loanType}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {missed.length > 0 && <span style={{ fontSize: 12, background: '#fdecea', color: '#a61f1a', border: '1px solid #fca5a5', borderRadius: 99, padding: '2px 10px', fontWeight: 700 }}>✗ {missed.length} missed days · ₹{fmt(missed.length * 100)}</span>}
                    {lSummary.paidLate > 0 && <span style={{ fontSize: 12, background: '#fdf6e3', color: '#b07d10', border: '1px solid #fcd34d', borderRadius: 99, padding: '2px 10px', fontWeight: 700 }}>⏰ {lSummary.paidLate} late payments</span>}
                    {lSummary.currentStreak > 0 && <span style={{ fontSize: 12, background: '#fdecea', color: '#a61f1a', border: '1px solid #fca5a5', borderRadius: 99, padding: '2px 10px', fontWeight: 700 }}>🔴 {lSummary.currentStreak} day streak</span>}
                  </div>
                </div>
                {missed.length > 0 && (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr style={{ background: '#fff5f5' }}>
                          {['Day', 'Date', 'Amount Due', 'Status'].map(h => (
                            <th key={h} style={{ padding: '8px 12px', textAlign: h === 'Amount Due' ? 'right' : 'left', fontSize: 11, fontWeight: 700, color: '#a61f1a', textTransform: 'uppercase', letterSpacing: '.06em' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {missed.map(row => (
                          <tr key={row.day} style={{ borderTop: '1px solid #fee2e2' }}>
                            <td style={{ padding: '7px 12px', color: '#888', fontSize: 12 }}>{row.day}</td>
                            <td style={{ padding: '7px 12px', fontFamily: 'monospace', fontSize: 12 }}>{row.date}</td>
                            <td style={{ padding: '7px 12px', fontFamily: 'monospace', textAlign: 'right', color: '#a61f1a', fontWeight: 700 }}>₹{fmt(row.due)}</td>
                            <td style={{ padding: '7px 12px' }}><Badge status="Missed" /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {lSummary.lateDetails && lSummary.lateDetails.length > 0 && (
                  <div style={{ padding: '10px 18px', borderTop: '1px solid #fee2e2' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#b07d10', marginBottom: 8 }}>Late Payments</div>
                    {lSummary.lateDetails.map((ld, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px dashed #f0e0c0', fontSize: 13 }}>
                        <span style={{ fontFamily: 'monospace' }}>{ld.paymentDate}</span>
                        <span style={{ fontFamily: 'monospace', color: '#1f7a45', fontWeight: 700 }}>₹{fmt(ld.amount)}</span>
                        <span style={{ color: '#b07d10', fontWeight: 600 }}>{ld.daysLate} days late</span>
                        <span style={{ color: '#888', fontSize: 12 }}>{ld.collectedBy || '—'}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {loans.every(loan => {
            const sch = schedules[loan.appId] || [];
            const lSummary = latePaymentSummary.find(l => l.loanId === loan.loanId) || {};
            return sch.filter(d => d.status === 'Missed').length === 0 && !lSummary.paidLate;
          }) && (
            <div style={{ textAlign: 'center', padding: 40, color: '#1f7a45', fontSize: 15, fontWeight: 600 }}>
              ✅ No missed or late payments!
            </div>
          )}
        </div>
      )}

      {/* ── Upcoming Tab ── */}
      {activeTab === 'upcoming' && (
        <div>
          {loans.map(loan => {
            const sch = schedules[loan.appId] || [];
            const upcoming = sch.filter(d => d.status === 'Upcoming').sort((a, b) => a.date.localeCompare(b.date));
            if (upcoming.length === 0) return null;
            const totalUpcomingAmt = upcoming.length * 100;
            return (
              <div key={loan.appId} style={{ border: '1.5px solid #fcd34d', borderRadius: 14, marginBottom: 16, overflow: 'hidden' }}>
                <div style={{ background: '#fdf6e3', padding: '12px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <span style={{ fontWeight: 800, fontSize: 14 }}>Loan {loan.sl} — {loan.loanId}</span>
                    <span style={{ marginLeft: 10, fontSize: 12, color: '#888' }}>{loan.loanType}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 12, background: '#fdf6e3', color: '#b07d10', border: '1px solid #fcd34d', borderRadius: 99, padding: '2px 10px', fontWeight: 700 }}>
                      ⏳ {upcoming.length} days · ₹{fmt(totalUpcomingAmt)} to collect
                    </span>
                    <span style={{ fontSize: 12, color: '#888' }}>Next: {upcoming[0]?.date}</span>
                  </div>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: '#fffdf0' }}>
                        {['Day', 'Date', 'Amount Due', 'Status'].map(h => (
                          <th key={h} style={{ padding: '8px 12px', textAlign: h === 'Amount Due' ? 'right' : 'left', fontSize: 11, fontWeight: 700, color: '#b07d10', textTransform: 'uppercase', letterSpacing: '.06em' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {upcoming.map(row => (
                        <tr key={row.day} style={{ borderTop: '1px solid #fef3c7', background: row.date === todayIso ? '#fffbe6' : 'transparent' }}>
                          <td style={{ padding: '7px 12px', color: '#888', fontSize: 12 }}>{row.day}</td>
                          <td style={{ padding: '7px 12px', fontFamily: 'monospace', fontSize: 12 }}>
                            {row.date === todayIso ? <strong>{row.date} 📍 Today</strong> : row.date}
                          </td>
                          <td style={{ padding: '7px 12px', fontFamily: 'monospace', textAlign: 'right', fontWeight: 700, color: '#b07d10' }}>₹{fmt(row.due)}</td>
                          <td style={{ padding: '7px 12px' }}><Badge status="Upcoming" /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
          {loans.every(loan => (schedules[loan.appId] || []).filter(d => d.status === 'Upcoming').length === 0) && (
            <div style={{ textAlign: 'center', padding: 40, color: '#888', fontSize: 14 }}>
              No upcoming EMIs (all loans may be closed or not yet disbursed).
            </div>
          )}
        </div>
      )}
    </div>
  );
}
