import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { api } from '../api.js';

function fmt(n) { return Number(n || 0).toLocaleString('en-IN'); }

const COL_W = { day: 50, date: 110, amount: 100, status: 90, name: 160, mode: 80, bal: 110, by: 130 };

const TH = ({ children, right, w, bg = '#1a3a2a', color = '#fff' }) => (
  <th style={{
    padding: '8px 10px', background: bg, color, fontWeight: 700, fontSize: 11,
    textTransform: 'uppercase', letterSpacing: '.06em', whiteSpace: 'nowrap',
    textAlign: right ? 'right' : 'left', border: '1px solid #2d5a3d',
    minWidth: w, position: 'sticky', top: 0, zIndex: 2,
  }}>{children}</th>
);

const TD = ({ children, right, mono, bold, color, bg, border = '1px solid #e2e8e2' }) => (
  <td style={{
    padding: '7px 10px', fontSize: 12, border,
    textAlign: right ? 'right' : 'left',
    fontFamily: mono ? 'monospace' : 'inherit',
    fontWeight: bold ? 700 : 400,
    color: color || '#1a2e1a',
    background: bg || 'transparent',
    whiteSpace: 'nowrap',
  }}>{children}</td>
);

const StatusCell = ({ s }) => {
  const cfg = {
    Paid:     { bg: '#e6f4ec', color: '#1a7a45', text: '✓ Paid' },
    Missed:   { bg: '#fdecea', color: '#a61f1a', text: '✗ Missed' },
    Upcoming: { bg: '#fdf6e3', color: '#b07d10', text: '⏳ Upcoming' },
  }[s] || { bg: '#f0f0f0', color: '#555', text: s };
  return (
    <td style={{ padding: '7px 10px', border: '1px solid #e2e8e2', background: cfg.bg }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: cfg.color }}>{cfg.text}</span>
    </td>
  );
};

const SectionTitle = ({ children, color = '#1a3a2a' }) => (
  <div style={{ background: color, color: '#fff', padding: '10px 16px', fontWeight: 800, fontSize: 13, letterSpacing: '.04em', marginTop: 28, marginBottom: 0, borderRadius: '8px 8px 0 0' }}>
    {children}
  </div>
);

const SheetWrap = ({ children }) => (
  <div style={{ overflowX: 'auto', border: '1.5px solid #c8d8c8', borderRadius: '0 0 8px 8px', marginBottom: 4 }}>
    <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 12 }}>
      {children}
    </table>
  </div>
);

export default function LoanReportPage() {
  const { memberId } = useParams();
  const nav = useNavigate();
  const [report, setReport] = useState(null);
  const [schedules, setSchedules] = useState({});
  const [loading, setLoading] = useState(true);
  const todayIso = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    api.getCustomerReport(memberId).then(async (data) => {
      setReport(data);
      const sch = {};
      await Promise.all((data.loans || []).map(async l => {
        try { const d = await api.getApplication(l.appId); sch[l.appId] = d.schedule || []; }
        catch { sch[l.appId] = []; }
      }));
      setSchedules(sch);
    }).catch(() => setReport(null)).finally(() => setLoading(false));
  }, [memberId]);

  function downloadExcel() {
    const wb = XLSX.utils.book_new();

    // ── Sheet 1: Summary ──
    const { member, summary, loans } = report;
    const allDays = Object.values(schedules).flat();
    const paidDays = allDays.filter(d => d.status === 'Paid');
    const missedDays = allDays.filter(d => d.status === 'Missed');
    const upcomingDays = allDays.filter(d => d.status === 'Upcoming');

    const summaryData = [
      ['LOAN REPORT — ' + member.name.toUpperCase()],
      ['Member ID', member.memberId, 'Mobile', member.mobile],
      [],
      ['OVERALL SUMMARY'],
      ['Total Loans', summary.totalLoans],
      ['Active Loans', summary.activeLoans],
      ['Total Borrowed', summary.totalBorrowed],
      ['Total Paid', summary.totalPaid],
      ['Outstanding Balance', summary.totalPending],
      ['Daily EMI', 100],
      ['Days Paid', paidDays.length],
      ['Days Missed', missedDays.length],
      ['Upcoming Days', upcomingDays.length],
      ['Amount Collected', paidDays.length * 100],
      ['Amount Missed', missedDays.length * 100],
      ['Amount to Collect', upcomingDays.length * 100],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryData), 'Summary');

    // ── Sheet 2: Full EMI Schedule ──
    const scheduleRows = [['Day', 'Date', 'Loan ID', 'Amount Due', 'Amount Paid', 'Balance', 'Status']];
    loans.forEach(loan => {
      let bal = Number(loan.totalPayable || loan.loanAmount || 0);
      (schedules[loan.appId] || []).forEach(row => {
        bal = Math.max(0, bal - (row.paid || 0));
        scheduleRows.push([row.day, row.date, loan.loanId || loan.appId, row.due, row.paid || 0, bal, row.status]);
      });
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(scheduleRows), 'EMI Schedule');

    // ── Sheet 3: Payments Made ──
    const payRows = [['#', 'Date', 'Loan ID', 'Amount Paid', 'Balance After', 'Mode', 'Collected By', 'On Time?', 'Days Late']];
    report.payments.forEach(p => {
      payRows.push([p.sl, p.paymentDate, p.loanIdDisplay, p.dailyPayment, p.remainingBalance, p.paymentMode || 'Cash', p.collectedBy || '', p.isLate ? 'Late' : 'On Time', p.daysLate || 0]);
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(payRows), 'Payments Made');

    // ── Sheet 4: Missed Days ──
    const missedRows = [['Day', 'Date', 'Loan ID', 'Amount Missed', 'Status']];
    loans.forEach(loan => {
      (schedules[loan.appId] || []).filter(d => d.status === 'Missed').forEach(row => {
        missedRows.push([row.day, row.date, loan.loanId || loan.appId, row.due, 'Missed']);
      });
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(missedRows), 'Missed Days');

    // ── Sheet 5: Upcoming Collections ──
    const upRows = [['Day', 'Date', 'Loan ID', 'Amount to Collect', 'Status']];
    loans.forEach(loan => {
      (schedules[loan.appId] || []).filter(d => d.status === 'Upcoming').forEach(row => {
        upRows.push([row.day, row.date, loan.loanId || loan.appId, row.due, 'Upcoming']);
      });
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(upRows), 'Upcoming Collections');

    XLSX.writeFile(wb, `LoanReport_${member.memberId}_${todayIso}.xlsx`);
  }

  if (loading) return <div style={{ textAlign: 'center', padding: 80, color: '#888', fontFamily: 'monospace' }}>Loading report...</div>;
  if (!report) return (
    <div style={{ textAlign: 'center', padding: 80 }}>
      <p style={{ color: '#888' }}>Could not load report.</p>
      <button onClick={() => nav(-1)} style={{ marginTop: 16, padding: '10px 20px', cursor: 'pointer' }}>← Back</button>
    </div>
  );

  const { member, summary, loans, payments, latePaymentSummary } = report;
  const allDays = Object.values(schedules).flat();
  const paidDays = allDays.filter(d => d.status === 'Paid');
  const missedDays = allDays.filter(d => d.status === 'Missed');
  const upcomingDays = allDays.filter(d => d.status === 'Upcoming').sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div style={{ maxWidth: 980, margin: '0 auto', padding: '0 0 60px', fontFamily: 'system-ui, sans-serif', background: '#f4f6f4' }}>

      {/* ── Top Bar ── */}
      <div style={{ background: '#1a3a2a', color: '#fff', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button onClick={() => nav(-1)} style={{ background: 'rgba(255,255,255,.15)', border: 0, color: '#fff', borderRadius: 8, padding: '7px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>← Back</button>
          <div>
            <div style={{ fontSize: 11, color: '#cfe3d9', letterSpacing: '.1em', textTransform: 'uppercase' }}>Full Loan Report</div>
            <div style={{ fontSize: 18, fontWeight: 800 }}>{member.name} <span style={{ fontSize: 13, fontWeight: 400, color: '#cfe3d9' }}>· {member.memberId}</span></div>
          </div>
        </div>
        <button onClick={downloadExcel} style={{ background: '#217346', color: '#fff', border: 0, borderRadius: 8, padding: '10px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
          ⬇ Download Excel
        </button>
      </div>

      <div style={{ padding: '20px 16px 0' }}>

        {/* ══════════════════════════════════════
            SHEET 1 — OVERALL SUMMARY
        ══════════════════════════════════════ */}
        <SectionTitle>📋 Overall Summary</SectionTitle>
        <SheetWrap>
          <thead>
            <tr>
              <TH w={200}>Field</TH>
              <TH w={160} right>Value</TH>
              <TH w={200}>Field</TH>
              <TH w={160} right>Value</TH>
            </tr>
          </thead>
          <tbody>
            {[
              [['Member Name', member.name], ['Member ID', member.memberId]],
              [['Mobile', member.mobile || '—'], ['Total Loans', summary.totalLoans]],
              [['Active Loans', summary.activeLoans], ['Closed Loans', summary.closedLoans]],
              [['Total Borrowed', '₹' + fmt(summary.totalBorrowed)], ['Total Paid', '₹' + fmt(summary.totalPaid)]],
              [['Outstanding Balance', '₹' + fmt(summary.totalPending)], ['Daily EMI', '₹100']],
              [['Days Paid ✓', paidDays.length], ['Amount Collected', '₹' + fmt(paidDays.length * 100)]],
              [['Days Missed ✗', missedDays.length], ['Amount Missed', '₹' + fmt(missedDays.length * 100)]],
              [['Upcoming Days', upcomingDays.length], ['Amount to Collect', '₹' + fmt(upcomingDays.length * 100)]],
            ].map((row, i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#f7faf7' }}>
                <TD bold color="#1a3a2a">{row[0][0]}</TD>
                <TD right mono>{row[0][1]}</TD>
                <TD bold color="#1a3a2a">{row[1][0]}</TD>
                <TD right mono>{row[1][1]}</TD>
              </tr>
            ))}
          </tbody>
        </SheetWrap>

        {/* ══════════════════════════════════════
            SHEET 2 — FULL EMI SCHEDULE
        ══════════════════════════════════════ */}
        <SectionTitle color="#0f4c81">📅 Full EMI Schedule — Day by Day</SectionTitle>
        <SheetWrap>
          <thead>
            <tr>
              <TH w={COL_W.day}  bg="#0f4c81">Day</TH>
              <TH w={COL_W.date} bg="#0f4c81">Date</TH>
              <TH w={140}        bg="#0f4c81">Loan ID</TH>
              <TH w={COL_W.amount} right bg="#0f4c81">Due (₹)</TH>
              <TH w={COL_W.amount} right bg="#0f4c81">Paid (₹)</TH>
              <TH w={COL_W.bal}  right bg="#0f4c81">Balance (₹)</TH>
              <TH w={COL_W.status} bg="#0f4c81">Status</TH>
            </tr>
          </thead>
          <tbody>
            {loans.map(loan => {
              let bal = Number(loan.totalPayable || loan.loanAmount || 0);
              return (schedules[loan.appId] || []).map((row, ri) => {
                bal = Math.max(0, bal - (row.paid || 0));
                const isToday = row.date === todayIso;
                const rowBg = isToday ? '#fffbe6' : row.status === 'Paid' ? '#f0faf4' : row.status === 'Missed' ? '#fff5f5' : ri % 2 === 0 ? '#fff' : '#f7fbff';
                return (
                  <tr key={loan.appId + row.day} style={{ background: rowBg }}>
                    <TD color="#888">{row.day}</TD>
                    <TD mono bold={isToday}>{isToday ? '📍 ' + row.date : row.date}</TD>
                    <TD mono color="#555">{loan.loanId || loan.appId}</TD>
                    <TD right mono>₹{fmt(row.due)}</TD>
                    <TD right mono bold={row.paid > 0} color={row.paid > 0 ? '#1a7a45' : '#bbb'}>{row.paid > 0 ? '₹' + fmt(row.paid) : '—'}</TD>
                    <TD right mono bold color={bal > 0 ? '#a61f1a' : '#1a7a45'}>₹{fmt(bal)}</TD>
                    <StatusCell s={row.status} />
                  </tr>
                );
              });
            })}
          </tbody>
          <tfoot>
            <tr style={{ background: '#e8f0e8' }}>
              <td colSpan={3} style={{ padding: '8px 10px', fontWeight: 700, fontSize: 12, border: '1px solid #c8d8c8' }}>TOTAL</td>
              <TD right mono bold>₹{fmt(allDays.length * 100)}</TD>
              <TD right mono bold color="#1a7a45">₹{fmt(paidDays.length * 100)}</TD>
              <TD right mono bold color="#a61f1a">₹{fmt(summary.totalPending)}</TD>
              <td style={{ border: '1px solid #c8d8c8' }} />
            </tr>
          </tfoot>
        </SheetWrap>

        {/* ══════════════════════════════════════
            SHEET 3 — PAYMENTS MADE
        ══════════════════════════════════════ */}
        <SectionTitle color="#1a7a45">💰 Payments Made</SectionTitle>
        <SheetWrap>
          <thead>
            <tr>
              <TH w={40}  bg="#1a7a45">#</TH>
              <TH w={COL_W.date} bg="#1a7a45">Date</TH>
              <TH w={140} bg="#1a7a45">Loan ID</TH>
              <TH w={COL_W.amount} right bg="#1a7a45">Paid (₹)</TH>
              <TH w={COL_W.bal}   right bg="#1a7a45">Balance After (₹)</TH>
              <TH w={COL_W.mode}  bg="#1a7a45">Mode</TH>
              <TH w={COL_W.by}    bg="#1a7a45">Collected By</TH>
              <TH w={90}  bg="#1a7a45">On Time?</TH>
            </tr>
          </thead>
          <tbody>
            {payments.length === 0
              ? <tr><td colSpan={8} style={{ padding: 20, textAlign: 'center', color: '#888', border: '1px solid #e2e8e2' }}>No payments recorded yet.</td></tr>
              : payments.map((p, i) => (
                <tr key={p.sl} style={{ background: i % 2 === 0 ? '#fff' : '#f0faf4' }}>
                  <TD color="#aaa">{p.sl}</TD>
                  <TD mono>{p.paymentDate}</TD>
                  <TD mono color="#555">{p.loanIdDisplay}</TD>
                  <TD right mono bold color="#1a7a45">₹{fmt(p.dailyPayment)}</TD>
                  <TD right mono color={p.remainingBalance > 0 ? '#a61f1a' : '#1a7a45'}>₹{fmt(p.remainingBalance)}</TD>
                  <TD>{p.paymentMode || 'Cash'}</TD>
                  <TD>{p.collectedBy || '—'}</TD>
                  <td style={{ padding: '7px 10px', border: '1px solid #e2e8e2', background: p.isLate ? '#fdecea' : '#e6f4ec' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: p.isLate ? '#a61f1a' : '#1a7a45' }}>
                      {p.isLate ? `⏰ ${p.daysLate}d late` : '✓ On time'}
                    </span>
                  </td>
                </tr>
              ))
            }
          </tbody>
          {payments.length > 0 && (
            <tfoot>
              <tr style={{ background: '#d4edda' }}>
                <td colSpan={3} style={{ padding: '8px 10px', fontWeight: 700, fontSize: 12, border: '1px solid #c8d8c8' }}>TOTAL PAYMENTS</td>
                <TD right mono bold color="#1a7a45">₹{fmt(payments.reduce((s, p) => s + p.dailyPayment, 0))}</TD>
                <td colSpan={4} style={{ border: '1px solid #c8d8c8' }} />
              </tr>
            </tfoot>
          )}
        </SheetWrap>

        {/* ══════════════════════════════════════
            SHEET 4 — MISSED DAYS
        ══════════════════════════════════════ */}
        <SectionTitle color="#a61f1a">⚠️ Missed Days</SectionTitle>
        <SheetWrap>
          <thead>
            <tr>
              <TH w={COL_W.day}  bg="#a61f1a">Day</TH>
              <TH w={COL_W.date} bg="#a61f1a">Date (Should Have Collected)</TH>
              <TH w={140}        bg="#a61f1a">Loan ID</TH>
              <TH w={COL_W.amount} right bg="#a61f1a">Amount Missed (₹)</TH>
              <TH w={COL_W.status} bg="#a61f1a">Status</TH>
            </tr>
          </thead>
          <tbody>
            {missedDays.length === 0
              ? <tr><td colSpan={5} style={{ padding: 20, textAlign: 'center', color: '#1a7a45', fontWeight: 700, border: '1px solid #e2e8e2' }}>✅ No missed days — excellent record!</td></tr>
              : loans.map(loan =>
                  (schedules[loan.appId] || []).filter(d => d.status === 'Missed').map((row, i) => (
                    <tr key={loan.appId + row.day} style={{ background: i % 2 === 0 ? '#fff5f5' : '#fff' }}>
                      <TD color="#aaa">{row.day}</TD>
                      <TD mono bold color="#a61f1a">{row.date}</TD>
                      <TD mono color="#555">{loan.loanId || loan.appId}</TD>
                      <TD right mono bold color="#a61f1a">₹{fmt(row.due)}</TD>
                      <StatusCell s="Missed" />
                    </tr>
                  ))
                )
            }
          </tbody>
          {missedDays.length > 0 && (
            <tfoot>
              <tr style={{ background: '#fdecea' }}>
                <td colSpan={3} style={{ padding: '8px 10px', fontWeight: 700, fontSize: 12, border: '1px solid #fca5a5' }}>TOTAL MISSED</td>
                <TD right mono bold color="#a61f1a">₹{fmt(missedDays.length * 100)}</TD>
                <td style={{ border: '1px solid #fca5a5' }} />
              </tr>
            </tfoot>
          )}
        </SheetWrap>

        {/* ══════════════════════════════════════
            SHEET 5 — UPCOMING COLLECTIONS
        ══════════════════════════════════════ */}
        <SectionTitle color="#b07d10">🔔 Upcoming Collections</SectionTitle>
        <SheetWrap>
          <thead>
            <tr>
              <TH w={COL_W.day}  bg="#b07d10">Day</TH>
              <TH w={COL_W.date} bg="#b07d10">Date (Should Collect)</TH>
              <TH w={140}        bg="#b07d10">Loan ID</TH>
              <TH w={COL_W.amount} right bg="#b07d10">Amount to Collect (₹)</TH>
              <TH w={COL_W.status} bg="#b07d10">Status</TH>
            </tr>
          </thead>
          <tbody>
            {upcomingDays.length === 0
              ? <tr><td colSpan={5} style={{ padding: 20, textAlign: 'center', color: '#888', border: '1px solid #e2e8e2' }}>No upcoming EMIs.</td></tr>
              : loans.map(loan =>
                  (schedules[loan.appId] || []).filter(d => d.status === 'Upcoming').map((row, i) => {
                    const isToday = row.date === todayIso;
                    return (
                      <tr key={loan.appId + row.day} style={{ background: isToday ? '#fffbe6' : i % 2 === 0 ? '#fffdf0' : '#fff' }}>
                        <TD color="#aaa">{row.day}</TD>
                        <TD mono bold={isToday} color={isToday ? '#b07d10' : '#1a2e1a'}>{isToday ? '📍 ' + row.date + ' (Today)' : row.date}</TD>
                        <TD mono color="#555">{loan.loanId || loan.appId}</TD>
                        <TD right mono bold color="#b07d10">₹{fmt(row.due)}</TD>
                        <StatusCell s="Upcoming" />
                      </tr>
                    );
                  })
                )
            }
          </tbody>
          {upcomingDays.length > 0 && (
            <tfoot>
              <tr style={{ background: '#fdf6e3' }}>
                <td colSpan={3} style={{ padding: '8px 10px', fontWeight: 700, fontSize: 12, border: '1px solid #fcd34d' }}>TOTAL TO COLLECT</td>
                <TD right mono bold color="#b07d10">₹{fmt(upcomingDays.length * 100)}</TD>
                <td style={{ border: '1px solid #fcd34d' }} />
              </tr>
            </tfoot>
          )}
        </SheetWrap>

      </div>
    </div>
  );
}
