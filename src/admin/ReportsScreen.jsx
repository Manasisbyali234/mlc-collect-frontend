import { useState, useEffect, useRef } from 'react';
import { api } from '../api.js';
import * as XLSX from 'xlsx';

/* ── helpers ── */
function toISO(d) { return d.toISOString().slice(0, 10); }
function today() { return toISO(new Date()); }
function fmtINR(n) { return '₹' + Number(n || 0).toLocaleString('en-IN'); }
function fmtNum(n) { return Number(n || 0).toLocaleString('en-IN'); }

function weekRange(anchor) {
  const d = new Date(anchor);
  const day = d.getDay();
  const mon = new Date(d); mon.setDate(d.getDate() - ((day + 6) % 7));
  const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
  return { from: toISO(mon), to: toISO(sun) };
}

function exportCSV(rows, cols, filename) {
  const header = cols.map(c => c.label).join(',');
  const body = rows.map(r =>
    cols.map(c => '"' + String(r[c.key] ?? '').replace(/"/g, '""') + '"').join(',')
  ).join('\n');
  const blob = new Blob([header + '\n' + body], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename + '.csv'; a.click();
  URL.revokeObjectURL(url);
}

function printPDF(title, subtitle, cols, rows, summaryLines) {
  const w = window.open('', '_blank', 'width=1000,height=750');
  const tableRows = rows.map(r =>
    '<tr>' + cols.map(c => `<td>${r[c.key] ?? ''}</td>`).join('') + '</tr>'
  ).join('');
  const summaryHtml = (summaryLines || []).map(([k, v]) =>
    `<div class="si"><span>${k}</span><b>${v}</b></div>`
  ).join('');
  w.document.write(`<!DOCTYPE html><html><head><title>${title}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:Arial,sans-serif;font-size:12px;color:#111;padding:28px}
    .hdr{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:18px;border-bottom:2px solid #1a5c35;padding-bottom:12px}
    .hdr-left h1{font-size:18px;color:#1a5c35;font-weight:800}
    .hdr-left h2{font-size:13px;font-weight:600;margin-top:4px}
    .hdr-right{text-align:right;font-size:11px;color:#555}
    .summary{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:16px}
    .si{background:#f0f7f2;border:1px solid #c5ddc9;border-radius:6px;padding:8px 14px;min-width:160px}
    .si span{display:block;font-size:10px;color:#555;text-transform:uppercase;letter-spacing:.06em}
    .si b{display:block;font-size:15px;font-weight:700;color:#1a5c35;margin-top:2px}
    table{width:100%;border-collapse:collapse;margin-top:4px}
    th{background:#1a5c35;color:#fff;padding:7px 10px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.06em}
    td{padding:6px 10px;border-bottom:1px solid #e8e8e8;font-size:11px}
    tr:nth-child(even) td{background:#f8faf8}
    .footer{margin-top:20px;display:flex;justify-content:space-between;font-size:10px;color:#888;border-top:1px solid #ddd;padding-top:10px}
    .sig{text-align:right}
    .sig-line{border-top:1px solid #333;width:180px;margin:40px 0 4px;display:inline-block}
    @media print{body{padding:16px}}
  </style></head><body>
  <div class="hdr">
    <div class="hdr-left">
      <h1>Mahalaxmi Co-Operative Society Ltd</h1>
      <h2>${title}</h2>
      <div style="font-size:11px;color:#555;margin-top:4px">${subtitle}</div>
    </div>
    <div class="hdr-right">
      <div>Generated: ${new Date().toLocaleString('en-IN')}</div>
      <div style="margin-top:4px">Records: ${rows.length}</div>
    </div>
  </div>
  ${summaryHtml ? '<div class="summary">' + summaryHtml + '</div>' : ''}
  <table>
    <thead><tr>${cols.map(c => `<th>${c.label}</th>`).join('')}</tr></thead>
    <tbody>${tableRows}</tbody>
  </table>
  <div class="footer">
    <div>Mahalaxmi Co-Operative Society Ltd &nbsp;|&nbsp; Confidential</div>
    <div class="sig"><div class="sig-line"></div><div>Authorized Signatory</div></div>
  </div>
  </body></html>`);
  w.document.close(); w.focus(); w.print();
}

const Pill = ({ c, children }) => <span className={'pill ' + c}>{children}</span>;

function CollectorGrouped({ rows, cols, renderRow, amountKey }) {
  const [open, setOpen] = useState({});
  const groups = {};
  rows.forEach(r => {
    const k = r.collectorName || 'Unassigned';
    if (!groups[k]) groups[k] = [];
    groups[k].push(r);
  });
  const names = Object.keys(groups).sort();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {names.map(name => {
        const grp = groups[name];
        const total = amountKey ? grp.reduce((s, r) => s + Number(r[amountKey] || 0), 0) : null;
        const isOpen = open[name] !== false;
        return (
          <div key={name} className="panel" style={{ overflow: 'hidden' }}>
            <div onClick={() => setOpen(o => ({ ...o, [name]: !isOpen }))}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', cursor: 'pointer', background: 'var(--g50, #f4faf6)', borderBottom: isOpen ? '1px solid var(--line)' : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 15, fontWeight: 700 }}>👤 {name}</span>
                <span style={{ fontSize: 12, color: 'var(--muted)', background: 'var(--line)', borderRadius: 20, padding: '2px 10px' }}>{grp.length} records</span>
                {total !== null && <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--green-tx)' }}>{fmtINR(total)}</span>}
              </div>
              <span style={{ fontSize: 18, color: 'var(--muted)' }}>{isOpen ? '▲' : '▼'}</span>
            </div>
            {isOpen && (
              <div className="scroll-x">
                <table className="dtable">
                  <thead><tr>{cols.map(c => <th key={c.key}>{c.label}</th>)}</tr></thead>
                  <tbody>{grp.map((r, i) => renderRow(r, i))}</tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function SummaryCard({ label, value, sub, color }) {
  return (
    <div className="kpi" style={{ borderLeft: `4px solid ${color || 'var(--g800)'}` }}>
      <div className="eb">{label}</div>
      <div className="v" style={{ color: color || 'inherit' }}>{value}</div>
      {sub && <small>{sub}</small>}
    </div>
  );
}

function ExportBar({ onCSV, onPDF, count, total, totalLabel }) {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14, flexWrap: 'wrap' }}>
      <div className="panel" style={{ padding: '10px 18px', display: 'flex', gap: 24 }}>
        <div><div style={{ fontSize: 11, color: 'var(--muted)' }}>Records</div><div style={{ fontWeight: 700, fontSize: 20 }}>{count}</div></div>
        {totalLabel && <div><div style={{ fontSize: 11, color: 'var(--muted)' }}>{totalLabel}</div><div style={{ fontWeight: 700, fontSize: 20 }}>{fmtINR(total)}</div></div>}
      </div>
      <button className="btn sm" onClick={onCSV}>⬇ CSV</button>
      <button className="btn sm outline" onClick={onPDF}>🖨 PDF / Print</button>
    </div>
  );
}

/* ══════════════════════════════════════════
   1. SUMMARY OVERVIEW
══════════════════════════════════════════ */
function ReportSummary() {
  const [data, setData] = useState(null);
  useEffect(() => { api.getReportSummary().then(setData).catch(() => {}); }, []);
  if (!data) return <div className="panel pad" style={{ textAlign: 'center', padding: 40 }}><p className="muted">Loading…</p></div>;
  const cards = [
    ['Total Applications', fmtNum(data.totalApplications), 'all submitted', '#1f7a45'],
    ['Sanctioned', fmtNum(data.totalSanctioned), 'sanctioned/approved/disbursed', '#D9A02E'],
    ['Pending Approval', fmtNum(data.totalPendingApproval), 'awaiting review', '#8a5a00'],
    ['Active Loans', fmtNum(data.totalActiveLoans), 'currently disbursed', '#1f7a45'],
    ['Rejected', fmtNum(data.totalRejected), 'rejected applications', '#a61f1a'],
    ['Total Disbursed', fmtINR(data.totalDisbursed), 'loan amount given out', '#1f7a45'],
    ['Total Collected', fmtINR(data.totalCollected), 'payments received', '#1f7a45'],
    ['Outstanding', fmtINR(data.totalOutstanding), 'yet to be collected', '#8a5a00'],
    ['Overdue Amount', fmtINR(data.totalOverdue), 'past due date', '#a61f1a'],
    ['Members Paid', fmtNum(data.paidMembersCount), 'at least one payment', '#1f7a45'],
    ['Members Unpaid', fmtNum(data.unpaidMembersCount), 'no payment yet', '#a61f1a'],
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 14 }}>
      {cards.map(([label, value, sub, color]) => (
        <SummaryCard key={label} label={label} value={value} sub={sub} color={color} />
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════
   2. DAILY REPORT
══════════════════════════════════════════ */
const DAILY_COLS = [
  { key: 'date', label: 'Date' },
  { key: 'memberName', label: 'Member Name' },
  { key: 'memberId', label: 'Member ID' },
  { key: 'loanId', label: 'Loan ID' },
  { key: 'collectorName', label: 'Collector' },
  { key: 'mobile', label: 'Mobile' },
  { key: 'loanAmount', label: 'Loan Amount' },
  { key: 'sanctionedAmount', label: 'Sanctioned' },
  { key: 'paidToday', label: 'Paid Today' },
  { key: 'totalPaid', label: 'Total Paid' },
  { key: 'remaining', label: 'Remaining' },
  { key: 'paymentStatus', label: 'Status' },
  { key: 'paymentMode', label: 'Mode' },
  { key: 'transactionRef', label: 'Ref / Receipt' },
  { key: 'dueAmount', label: 'EMI Due' },
  { key: 'overdueStatus', label: 'Overdue' },
];

function DailyReport() {
  const [date, setDate] = useState(today());
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [grouped, setGrouped] = useState(false);

  function load(d) {
    setLoading(true);
    api.getReportDaily(d).then(setRows).catch(() => setRows([])).finally(() => setLoading(false));
  }
  useEffect(() => { load(date); }, [date]);

  const filtered = rows.filter(r => {
    const q = search.toLowerCase();
    return !q || [r.memberName, r.memberId, r.loanId, r.collectorName, r.mobile].some(v => v && v.toLowerCase().includes(q));
  });

  const totalPaidToday = filtered.reduce((s, r) => s + Number(r.paidToday || 0), 0);
  const csvRows = filtered.map(r => ({ ...r, loanAmount: fmtINR(r.loanAmount), sanctionedAmount: fmtINR(r.sanctionedAmount), paidToday: fmtINR(r.paidToday), totalPaid: fmtINR(r.totalPaid), remaining: fmtINR(r.remaining), dueAmount: fmtINR(r.dueAmount) }));
  const statusColor = { Paid: 'green', Overdue: 'red', Pending: 'yellow', Cleared: 'grey' };

  const renderDailyRow = (r, i) => (
    <tr key={i}>
      <td className="mono" style={{ fontSize: 12 }}>{r.date}</td>
      <td><b>{r.memberName}</b></td>
      <td className="mono" style={{ fontSize: 12 }}>{r.memberId}</td>
      <td className="mono" style={{ fontSize: 12 }}>{r.loanId}</td>
      <td>{r.collectorName}</td>
      <td className="mono">{r.mobile}</td>
      <td className="r mono">{fmtINR(r.loanAmount)}</td>
      <td className="r mono">{fmtINR(r.sanctionedAmount)}</td>
      <td className="r mono" style={{ color: r.paidToday > 0 ? 'var(--green-tx)' : 'inherit', fontWeight: r.paidToday > 0 ? 700 : 400 }}>{fmtINR(r.paidToday)}</td>
      <td className="r mono">{fmtINR(r.totalPaid)}</td>
      <td className="r mono" style={{ color: r.remaining > 0 ? 'var(--red-tx)' : 'var(--green-tx)' }}>{fmtINR(r.remaining)}</td>
      <td><Pill c={statusColor[r.paymentStatus] || 'grey'}>{r.paymentStatus}</Pill></td>
      <td>{r.paymentMode}</td>
      <td className="mono" style={{ fontSize: 11 }}>{r.transactionRef}</td>
      <td className="r mono">{fmtINR(r.dueAmount)}</td>
      <td style={{ fontSize: 12, color: r.overdueStatus !== 'On track' ? 'var(--red-tx)' : 'var(--green-tx)' }}>{r.overdueStatus}</td>
    </tr>
  );

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        <input type="date" value={date} onChange={e => setDate(e.target.value)}
          style={{ padding: '8px 12px', border: '1px solid var(--line)', borderRadius: 10, fontSize: 14, background: '#fff' }} />
        <input className="search" style={{ flex: 1, minWidth: 220, marginBottom: 0 }}
          placeholder="Search member, loan ID, collector…" value={search} onChange={e => setSearch(e.target.value)} />
        <button className={`btn sm${grouped ? '' : ' outline'}`} onClick={() => setGrouped(g => !g)}>👤 Collector-wise</button>
      </div>
      <ExportBar
        count={filtered.length}
        total={totalPaidToday}
        totalLabel="Collected Today"
        onCSV={() => exportCSV(csvRows, DAILY_COLS, `daily-report-${date}`)}
        onPDF={() => printPDF('Daily Collection Report', `Date: ${date}`, DAILY_COLS, csvRows,
          [['Date', date], ['Records', filtered.length], ['Collected Today', fmtINR(totalPaidToday)]])}
      />
      {loading ? <div className="panel pad" style={{ textAlign: 'center', padding: 40 }}><p className="muted">Loading…</p></div> :
        filtered.length === 0 ? <div className="panel pad" style={{ textAlign: 'center', padding: 40 }}><p className="muted">No records for this date.</p></div> :
        grouped ? <CollectorGrouped rows={filtered} cols={DAILY_COLS} renderRow={renderDailyRow} amountKey="paidToday" /> :
        <div className="panel scroll-x">
          <table className="dtable">
            <thead><tr>{DAILY_COLS.map(c => <th key={c.key}>{c.label}</th>)}</tr></thead>
            <tbody>{filtered.map((r, i) => renderDailyRow(r, i))}</tbody>
          </table>
        </div>
      }
    </div>
  );
}

/* ══════════════════════════════════════════
   3. WEEKLY REPORT
══════════════════════════════════════════ */
function WeeklyReport() {
  const [anchor, setAnchor] = useState(today());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [subTab, setSubTab] = useState('summary');
  const [grouped, setGrouped] = useState(false);

  const range = weekRange(anchor);

  function load(r) {
    setLoading(true);
    api.getReportWeekly(r.from, r.to).then(setData).catch(() => setData(null)).finally(() => setLoading(false));
  }
  useEffect(() => { load(range); }, [anchor]);

  const PAID_COLS = [
    { key: 'memberName', label: 'Member Name' }, { key: 'memberId', label: 'Member ID' },
    { key: 'appId', label: 'App ID' }, { key: 'collectorName', label: 'Collector' },
    { key: 'amountPaid', label: 'Amount Paid' },
  ];
  const MISSED_COLS = [
    { key: 'memberName', label: 'Member Name' }, { key: 'memberId', label: 'Member ID' },
    { key: 'appId', label: 'App ID' }, { key: 'collectorName', label: 'Collector' },
  ];
  const COL_COLS = [
    { key: 'collectorName', label: 'Collector' }, { key: 'totalLoans', label: 'Loans' },
    { key: 'totalAmount', label: 'Total Amount' }, { key: 'collected', label: 'Collected' },
    { key: 'paidMembers', label: 'Paid' }, { key: 'missedMembers', label: 'Missed' },
    { key: 'outstanding', label: 'Outstanding' },
  ];

  const summaryCards = data ? [
    ['Loans Processed', data.totalLoansProcessed], ['Sanctioned', data.totalSanctioned],
    ['Amount Distributed', fmtINR(data.totalAmountDistributed)], ['Total Collected', fmtINR(data.totalCollected)],
    ['Members Paid', data.paidMembersCount], ['Members Missed', data.missedMembersCount],
    ['Outstanding', fmtINR(data.totalOutstanding)], ['Pending Apps', data.pendingApplications],
  ] : [];

  const colRows = (data?.collectorSummary || []).map(r => ({ ...r, totalAmount: fmtINR(r.totalAmount), collected: fmtINR(r.collected), outstanding: fmtINR(r.outstanding) }));
  const paidRows = (data?.paidMembers || []).map(r => ({ ...r, amountPaid: fmtINR(r.amountPaid) }));

  const renderPaidRow = (r, i) => <tr key={i}>{PAID_COLS.map(c => <td key={c.key} className={c.key==='amountPaid'?'r mono':''}>{r[c.key]}</td>)}</tr>;
  const renderMissedRow = (r, i) => <tr key={i}>{MISSED_COLS.map(c => <td key={c.key}>{r[c.key]}</td>)}</tr>;

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, alignItems: 'center', flexWrap: 'wrap' }}>
        <label style={{ fontSize: 13, color: 'var(--muted)' }}>Pick any date in the week:</label>
        <input type="date" value={anchor} onChange={e => setAnchor(e.target.value)}
          style={{ padding: '8px 12px', border: '1px solid var(--line)', borderRadius: 10, fontSize: 14, background: '#fff' }} />
        <span style={{ fontSize: 13, fontWeight: 600 }}>{range.from} → {range.to}</span>
      </div>

      {loading ? <div className="panel pad" style={{ textAlign: 'center', padding: 40 }}><p className="muted">Loading…</p></div> : !data ? null : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 12, marginBottom: 16 }}>
            {summaryCards.map(([label, value]) => (
              <div key={label} className="kpi"><div className="eb">{label}</div><div className="v">{value}</div></div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid var(--line)', marginBottom: 14, alignItems: 'center', flexWrap: 'wrap' }}>
            {[['summary', 'Collector Summary'], ['paid', 'Paid Members'], ['missed', 'Missed Members']].map(([k, l]) => (
              <button key={k} onClick={() => { setSubTab(k); setGrouped(false); }}
                style={{ padding: '8px 18px', border: 0, borderBottom: subTab === k ? '2px solid var(--g800)' : '2px solid transparent', background: 'transparent', fontWeight: subTab === k ? 700 : 400, cursor: 'pointer', fontSize: 13, marginBottom: -2 }}>
                {l}
              </button>
            ))}
            {subTab !== 'summary' && <button className={`btn sm${grouped ? '' : ' outline'}`} style={{ marginLeft: 'auto' }} onClick={() => setGrouped(g => !g)}>👤 Collector-wise</button>}
          </div>

          {subTab === 'summary' && (
            <>
              <ExportBar count={colRows.length} onCSV={() => exportCSV(colRows, COL_COLS, `weekly-collector-${range.from}`)} onPDF={() => printPDF('Weekly Collector Summary', `${range.from} to ${range.to}`, COL_COLS, colRows, summaryCards.map(([k, v]) => [k, String(v)]))} />
              <div className="panel scroll-x">
                <table className="dtable">
                  <thead><tr>{COL_COLS.map(c => <th key={c.key}>{c.label}</th>)}</tr></thead>
                  <tbody>{colRows.map((r, i) => <tr key={i}>{COL_COLS.map(c => <td key={c.key} className={['totalAmount','collected','outstanding'].includes(c.key)?'r mono':''}>{r[c.key]}</td>)}</tr>)}</tbody>
                </table>
              </div>
            </>
          )}
          {subTab === 'paid' && (
            <>
              <ExportBar count={paidRows.length} total={data.totalCollected} totalLabel="Total Collected" onCSV={() => exportCSV(paidRows, PAID_COLS, `weekly-paid-${range.from}`)} onPDF={() => printPDF('Weekly Paid Members', `${range.from} to ${range.to}`, PAID_COLS, paidRows, [['Total Collected', fmtINR(data.totalCollected)], ['Members Paid', data.paidMembersCount]])} />
              {grouped ? <CollectorGrouped rows={paidRows} cols={PAID_COLS} renderRow={renderPaidRow} amountKey="amountPaid" /> :
                <div className="panel scroll-x">
                  <table className="dtable">
                    <thead><tr>{PAID_COLS.map(c => <th key={c.key}>{c.label}</th>)}</tr></thead>
                    <tbody>{paidRows.map((r, i) => renderPaidRow(r, i))}</tbody>
                  </table>
                </div>}
            </>
          )}
          {subTab === 'missed' && (
            <>
              <ExportBar count={data.missedMembersList.length} onCSV={() => exportCSV(data.missedMembersList, MISSED_COLS, `weekly-missed-${range.from}`)} onPDF={() => printPDF('Weekly Missed Members', `${range.from} to ${range.to}`, MISSED_COLS, data.missedMembersList, [['Members Missed', data.missedMembersCount]])} />
              {grouped ? <CollectorGrouped rows={data.missedMembersList} cols={MISSED_COLS} renderRow={renderMissedRow} /> :
                <div className="panel scroll-x">
                  <table className="dtable">
                    <thead><tr>{MISSED_COLS.map(c => <th key={c.key}>{c.label}</th>)}</tr></thead>
                    <tbody>{data.missedMembersList.map((r, i) => renderMissedRow(r, i))}</tbody>
                  </table>
                </div>}
            </>
          )}
        </>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════
   4. MONTHLY REPORT
══════════════════════════════════════════ */
function MonthlyReport() {
  const now = new Date();
  const [year, setYear] = useState(String(now.getFullYear()));
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [subTab, setSubTab] = useState('overview');
  const [grouped, setGrouped] = useState(false);

  function load() {
    setLoading(true);
    api.getReportMonthly(year, month).then(setData).catch(() => setData(null)).finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, [year, month]);

  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const PERF_COLS = [
    { key: 'collectorName', label: 'Collector' }, { key: 'totalLoans', label: 'Loans' },
    { key: 'totalAmount', label: 'Total Amount' }, { key: 'collected', label: 'Collected' },
    { key: 'paidMembers', label: 'Paid' }, { key: 'pendingMembers', label: 'Pending' },
  ];
  const HIST_COLS = [
    { key: 'appId', label: 'App ID' }, { key: 'loanId', label: 'Loan ID' },
    { key: 'memberName', label: 'Member' }, { key: 'collectorName', label: 'Collector' },
    { key: 'loanAmount', label: 'Loan Amt' }, { key: 'paidInMonth', label: 'Paid This Month' },
    { key: 'totalPaid', label: 'Total Paid' }, { key: 'remaining', label: 'Remaining' },
  ];

  const perfRows = (data?.collectorPerformance || []).map(r => ({ ...r, totalAmount: fmtINR(r.totalAmount), collected: fmtINR(r.collected) }));
  const histRows = (data?.loanHistory || []).map(r => ({ ...r, loanAmount: fmtINR(r.loanAmount), paidInMonth: fmtINR(r.paidInMonth), totalPaid: fmtINR(r.totalPaid), remaining: fmtINR(r.remaining) }));

  const overviewCards = data ? [
    ['New Applications', data.totalNewApplications], ['Approved', data.totalApproved],
    ['Rejected', data.totalRejected], ['Disbursed', data.totalDisbursed],
    ['Total Collected', fmtINR(data.totalCollected)], ['Outstanding', fmtINR(data.totalOutstanding)],
    ['Overdue', fmtINR(data.totalOverdue)], ['Members Paid', data.paidMembersCount],
    ['Members Unpaid', data.unpaidMembersCount],
  ] : [];

  const renderHistRow = (r, i) => (
    <tr key={i}>{HIST_COLS.map(c => <td key={c.key} className={['loanAmount','paidInMonth','totalPaid','remaining'].includes(c.key)?'r mono':''}>{r[c.key]}</td>)}</tr>
  );

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, alignItems: 'center', flexWrap: 'wrap' }}>
        <select value={month} onChange={e => setMonth(e.target.value)}
          style={{ padding: '8px 12px', border: '1px solid var(--line)', borderRadius: 10, fontSize: 14, background: '#fff' }}>
          {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
        </select>
        <select value={year} onChange={e => setYear(e.target.value)}
          style={{ padding: '8px 12px', border: '1px solid var(--line)', borderRadius: 10, fontSize: 14, background: '#fff' }}>
          {[2023, 2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)' }}>{data ? `${data.from} → ${data.to}` : ''}</span>
      </div>

      {loading ? <div className="panel pad" style={{ textAlign: 'center', padding: 40 }}><p className="muted">Loading…</p></div> : !data ? null : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 12, marginBottom: 16 }}>
            {overviewCards.map(([label, value]) => (
              <div key={label} className="kpi"><div className="eb">{label}</div><div className="v">{value}</div></div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid var(--line)', marginBottom: 14, alignItems: 'center', flexWrap: 'wrap' }}>
            {[['overview', 'Overview'], ['performance', 'Collector Performance'], ['history', 'Loan-wise History']].map(([k, l]) => (
              <button key={k} onClick={() => { setSubTab(k); setGrouped(false); }}
                style={{ padding: '8px 18px', border: 0, borderBottom: subTab === k ? '2px solid var(--g800)' : '2px solid transparent', background: 'transparent', fontWeight: subTab === k ? 700 : 400, cursor: 'pointer', fontSize: 13, marginBottom: -2 }}>
                {l}
              </button>
            ))}
            {subTab === 'history' && <button className={`btn sm${grouped ? '' : ' outline'}`} style={{ marginLeft: 'auto' }} onClick={() => setGrouped(g => !g)}>👤 Collector-wise</button>}
          </div>

          {subTab === 'performance' && (
            <>
              <ExportBar count={perfRows.length} onCSV={() => exportCSV(perfRows, PERF_COLS, `monthly-collector-${year}-${month}`)} onPDF={() => printPDF('Monthly Collector Performance', `${MONTHS[+month-1]} ${year}`, PERF_COLS, perfRows, overviewCards.map(([k,v])=>[k,String(v)]))} />
              <div className="panel scroll-x">
                <table className="dtable">
                  <thead><tr>{PERF_COLS.map(c => <th key={c.key}>{c.label}</th>)}</tr></thead>
                  <tbody>{perfRows.map((r, i) => <tr key={i}>{PERF_COLS.map(c => <td key={c.key} className={['totalAmount','collected'].includes(c.key)?'r mono':''}>{r[c.key]}</td>)}</tr>)}</tbody>
                </table>
              </div>
            </>
          )}
          {subTab === 'history' && (
            <>
              <ExportBar count={histRows.length} onCSV={() => exportCSV(histRows, HIST_COLS, `monthly-loans-${year}-${month}`)} onPDF={() => printPDF('Monthly Loan Payment History', `${MONTHS[+month-1]} ${year}`, HIST_COLS, histRows, overviewCards.map(([k,v])=>[k,String(v)]))} />
              {grouped ? <CollectorGrouped rows={histRows} cols={HIST_COLS} renderRow={renderHistRow} amountKey="paidInMonth" /> :
                <div className="panel scroll-x">
                  <table className="dtable">
                    <thead><tr>{HIST_COLS.map(c => <th key={c.key}>{c.label}</th>)}</tr></thead>
                    <tbody>{histRows.map((r, i) => renderHistRow(r, i))}</tbody>
                  </table>
                </div>}
            </>
          )}
        </>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════
   5. DEFAULTERS / DUE REPORT
══════════════════════════════════════════ */
const DEF_COLS = [
  { key: 'memberName', label: 'Member Name' }, { key: 'memberId', label: 'Member ID' },
  { key: 'loanId', label: 'Loan ID' }, { key: 'mobile', label: 'Mobile' },
  { key: 'collectorName', label: 'Collector' }, { key: 'sanctionedAmount', label: 'Sanctioned' },
  { key: 'emiAmount', label: 'EMI' }, { key: 'dueDate', label: 'Due Date' },
  { key: 'amountPaid', label: 'Paid' }, { key: 'pendingAmount', label: 'Pending' },
  { key: 'daysOverdue', label: 'Days Overdue' }, { key: 'penalty', label: 'Penalty' },
  { key: 'paymentStatus', label: 'Status' },
];

function DefaultersReport() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [grouped, setGrouped] = useState(false);

  function load() {
    setLoading(true);
    const params = {};
    if (from) params.from = from;
    if (to) params.to = to;
    if (statusFilter !== 'All') params.status = statusFilter;
    api.getReportDefaulters(params).then(setRows).catch(() => setRows([])).finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, []);

  const filtered = rows.filter(r => {
    const q = search.toLowerCase();
    return !q || [r.memberName, r.memberId, r.loanId, r.collectorName, r.mobile].some(v => v && v.toLowerCase().includes(q));
  });

  const totalPending = filtered.reduce((s, r) => s + Number(r.pendingAmount || 0), 0);
  const csvRows = filtered.map(r => ({ ...r, sanctionedAmount: fmtINR(r.sanctionedAmount), emiAmount: fmtINR(r.emiAmount), amountPaid: fmtINR(r.amountPaid), pendingAmount: fmtINR(r.pendingAmount), penalty: fmtINR(r.penalty) }));
  const statusColor = { 'Fully Paid': 'green', Overdue: 'red', Partial: 'yellow', Unpaid: 'red', Pending: 'yellow' };

  const renderDefRow = (r, i) => (
    <tr key={i} style={{ background: r.daysOverdue > 0 ? 'var(--red-bg)' : 'transparent' }}>
      <td><b>{r.memberName}</b></td>
      <td className="mono" style={{ fontSize: 12 }}>{r.memberId}</td>
      <td className="mono" style={{ fontSize: 12 }}>{r.loanId}</td>
      <td className="mono">{r.mobile}</td>
      <td>{r.collectorName}</td>
      <td className="r mono">{fmtINR(r.sanctionedAmount)}</td>
      <td className="r mono">{fmtINR(r.emiAmount)}</td>
      <td className="mono" style={{ fontSize: 12 }}>{r.dueDate}</td>
      <td className="r mono">{fmtINR(r.amountPaid)}</td>
      <td className="r mono" style={{ color: 'var(--red-tx)', fontWeight: 700 }}>{fmtINR(r.pendingAmount)}</td>
      <td className="r mono" style={{ color: r.daysOverdue > 0 ? 'var(--red-tx)' : 'inherit' }}>{r.daysOverdue}</td>
      <td className="r mono" style={{ color: 'var(--red-tx)' }}>{fmtINR(r.penalty)}</td>
      <td><Pill c={statusColor[r.paymentStatus] || 'grey'}>{r.paymentStatus}</Pill></td>
    </tr>
  );

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>From</div>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)}
            style={{ padding: '8px 12px', border: '1px solid var(--line)', borderRadius: 10, fontSize: 14, background: '#fff' }} />
        </div>
        <div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>To</div>
          <input type="date" value={to} onChange={e => setTo(e.target.value)}
            style={{ padding: '8px 12px', border: '1px solid var(--line)', borderRadius: 10, fontSize: 14, background: '#fff' }} />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          style={{ padding: '8px 12px', border: '1px solid var(--line)', borderRadius: 10, fontSize: 14, background: '#fff', alignSelf: 'flex-end' }}>
          {['All', 'Overdue', 'Unpaid', 'Partial', 'Pending', 'Fully Paid'].map(s => <option key={s}>{s}</option>)}
        </select>
        <button className="btn sm" style={{ alignSelf: 'flex-end' }} onClick={load}>Apply Filters</button>
        <input className="search" style={{ flex: 1, minWidth: 200, marginBottom: 0, alignSelf: 'flex-end' }}
          placeholder="Search member, loan ID…" value={search} onChange={e => setSearch(e.target.value)} />
        <button className={`btn sm${grouped ? '' : ' outline'}`} style={{ alignSelf: 'flex-end' }} onClick={() => setGrouped(g => !g)}>👤 Collector-wise</button>
      </div>
      <ExportBar count={filtered.length} total={totalPending} totalLabel="Total Pending"
        onCSV={() => exportCSV(csvRows, DEF_COLS, `defaulters-report`)}
        onPDF={() => printPDF('Due & Defaulter Report', from && to ? `${from} to ${to}` : 'All Active Loans', DEF_COLS, csvRows, [['Total Records', filtered.length], ['Total Pending', fmtINR(totalPending)]])} />
      {loading ? <div className="panel pad" style={{ textAlign: 'center', padding: 40 }}><p className="muted">Loading…</p></div> :
        filtered.length === 0 ? <div className="panel pad" style={{ textAlign: 'center', padding: 40 }}><p className="muted">No records found.</p></div> :
        grouped ? <CollectorGrouped rows={filtered} cols={DEF_COLS} renderRow={renderDefRow} amountKey="pendingAmount" /> :
        <div className="panel scroll-x">
          <table className="dtable">
            <thead><tr>{DEF_COLS.map(c => <th key={c.key}>{c.label}</th>)}</tr></thead>
            <tbody>{filtered.map((r, i) => renderDefRow(r, i))}</tbody>
          </table>
        </div>
      }
    </div>
  );
}

/* ══════════════════════════════════════════
   6. PAID MEMBERS REPORT
══════════════════════════════════════════ */
const PAID_COLS = [
  { key: 'memberName', label: 'Member Name' }, { key: 'memberId', label: 'Member ID' },
  { key: 'loanId', label: 'Loan ID' }, { key: 'collectorName', label: 'Collector' },
  { key: 'mobile', label: 'Mobile' }, { key: 'totalLoanAmount', label: 'Loan Amount' },
  { key: 'emiAmount', label: 'EMI' }, { key: 'lastPaymentDate', label: 'Last Payment' },
  { key: 'totalPaid', label: 'Total Paid' }, { key: 'remaining', label: 'Remaining' },
  { key: 'paymentStatus', label: 'Status' },
];

function PaidMembersReport() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [grouped, setGrouped] = useState(false);

  function load(cat) {
    setLoading(true);
    api.getReportPaid({ category: cat }).then(setRows).catch(() => setRows([])).finally(() => setLoading(false));
  }
  useEffect(() => { load(category); }, [category]);

  const filtered = rows.filter(r => {
    const q = search.toLowerCase();
    return !q || [r.memberName, r.memberId, r.loanId, r.collectorName].some(v => v && v.toLowerCase().includes(q));
  });

  const totalPaid = filtered.reduce((s, r) => s + Number(r.totalPaid || 0), 0);
  const csvRows = filtered.map(r => ({ ...r, totalLoanAmount: fmtINR(r.totalLoanAmount), emiAmount: fmtINR(r.emiAmount), totalPaid: fmtINR(r.totalPaid), remaining: fmtINR(r.remaining) }));

  const renderPaidRow = (r, i) => (
    <tr key={i}>
      <td><b>{r.memberName}</b></td>
      <td className="mono" style={{ fontSize: 12 }}>{r.memberId}</td>
      <td className="mono" style={{ fontSize: 12 }}>{r.loanId}</td>
      <td>{r.collectorName}</td>
      <td className="mono">{r.mobile}</td>
      <td className="r mono">{fmtINR(r.totalLoanAmount)}</td>
      <td className="r mono">{fmtINR(r.emiAmount)}</td>
      <td className="mono" style={{ fontSize: 12 }}>{r.lastPaymentDate}</td>
      <td className="r mono" style={{ color: 'var(--green-tx)', fontWeight: 700 }}>{fmtINR(r.totalPaid)}</td>
      <td className="r mono" style={{ color: r.remaining > 0 ? 'var(--red-tx)' : 'var(--green-tx)' }}>{fmtINR(r.remaining)}</td>
      <td><Pill c={r.paymentStatus === 'Fully Paid' ? 'green' : 'yellow'}>{r.paymentStatus}</Pill></td>
    </tr>
  );

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 0, border: '1px solid var(--line)', borderRadius: 8, overflow: 'hidden' }}>
          {[['all', 'All Paid'], ['fullypaid', 'Fully Paid'], ['partiallypaid', 'Partially Paid']].map(([k, l]) => (
            <button key={k} onClick={() => setCategory(k)}
              style={{ padding: '7px 16px', border: 0, background: category === k ? 'var(--g800)' : 'transparent', color: category === k ? '#fff' : 'inherit', fontWeight: category === k ? 700 : 400, cursor: 'pointer', fontSize: 13 }}>
              {l}
            </button>
          ))}
        </div>
        <input className="search" style={{ flex: 1, minWidth: 200, marginBottom: 0 }}
          placeholder="Search member, loan ID…" value={search} onChange={e => setSearch(e.target.value)} />
        <button className={`btn sm${grouped ? '' : ' outline'}`} onClick={() => setGrouped(g => !g)}>👤 Collector-wise</button>
      </div>
      <ExportBar count={filtered.length} total={totalPaid} totalLabel="Total Collected"
        onCSV={() => exportCSV(csvRows, PAID_COLS, `paid-members-report`)}
        onPDF={() => printPDF('Paid Members Report', category === 'all' ? 'All Paid Members' : category === 'fullypaid' ? 'Fully Paid' : 'Partially Paid', PAID_COLS, csvRows, [['Records', filtered.length], ['Total Collected', fmtINR(totalPaid)]])} />
      {loading ? <div className="panel pad" style={{ textAlign: 'center', padding: 40 }}><p className="muted">Loading…</p></div> :
        filtered.length === 0 ? <div className="panel pad" style={{ textAlign: 'center', padding: 40 }}><p className="muted">No records found.</p></div> :
        grouped ? <CollectorGrouped rows={filtered} cols={PAID_COLS} renderRow={renderPaidRow} amountKey="totalPaid" /> :
        <div className="panel scroll-x">
          <table className="dtable">
            <thead><tr>{PAID_COLS.map(c => <th key={c.key}>{c.label}</th>)}</tr></thead>
            <tbody>{filtered.map((r, i) => renderPaidRow(r, i))}</tbody>
          </table>
        </div>
      }
    </div>
  );
}

/* ══════════════════════════════════════════
   7. COLLECTOR-WISE REPORT
══════════════════════════════════════════ */
const CW_COLS = [
  { key: 'collectorName', label: 'Collector' }, { key: 'branch', label: 'Branch' },
  { key: 'totalMembersAssigned', label: 'Members Assigned' },
  { key: 'totalLoansProcessed', label: 'Loans Processed' },
  { key: 'totalLoanAmount', label: 'Total Loan Amount' },
  { key: 'totalCollected', label: 'Total Collected' },
  { key: 'paidMembersCount', label: 'Members Paid' },
  { key: 'pendingMembersCount', label: 'Members Pending' },
  { key: 'totalOutstanding', label: 'Outstanding' },
  { key: 'collectionPercentage', label: 'Collection %' },
];

function CollectorWiseReport() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  function load() {
    setLoading(true);
    const params = {};
    if (from) params.from = from;
    if (to) params.to = to;
    api.getReportCollectorWise(params).then(setRows).catch(() => setRows([])).finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, []);

  const csvRows = rows.map(r => ({ ...r, totalLoanAmount: fmtINR(r.totalLoanAmount), totalCollected: fmtINR(r.totalCollected), totalOutstanding: fmtINR(r.totalOutstanding), collectionPercentage: r.collectionPercentage + '%' }));

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>From</div>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)}
            style={{ padding: '8px 12px', border: '1px solid var(--line)', borderRadius: 10, fontSize: 14, background: '#fff' }} />
        </div>
        <div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>To</div>
          <input type="date" value={to} onChange={e => setTo(e.target.value)}
            style={{ padding: '8px 12px', border: '1px solid var(--line)', borderRadius: 10, fontSize: 14, background: '#fff' }} />
        </div>
        <button className="btn sm" style={{ alignSelf: 'flex-end' }} onClick={load}>Apply</button>
      </div>
      <ExportBar count={rows.length}
        onCSV={() => exportCSV(csvRows, CW_COLS, `collector-wise-report`)}
        onPDF={() => printPDF('Collector-wise Performance Report', from && to ? `${from} to ${to}` : 'All Time', CW_COLS, csvRows, [])} />
      {loading ? <div className="panel pad" style={{ textAlign: 'center', padding: 40 }}><p className="muted">Loading…</p></div> :
        rows.length === 0 ? <div className="panel pad" style={{ textAlign: 'center', padding: 40 }}><p className="muted">No collectors found.</p></div> :
        <div className="panel scroll-x">
          <table className="dtable">
            <thead><tr>{CW_COLS.map(c => <th key={c.key}>{c.label}</th>)}</tr></thead>
            <tbody>{rows.map((r, i) => (
              <tr key={i}>
                <td><b>{r.collectorName}</b></td>
                <td>{r.branch}</td>
                <td className="r mono">{r.totalMembersAssigned}</td>
                <td className="r mono">{r.totalLoansProcessed}</td>
                <td className="r mono">{fmtINR(r.totalLoanAmount)}</td>
                <td className="r mono" style={{ color: 'var(--green-tx)', fontWeight: 700 }}>{fmtINR(r.totalCollected)}</td>
                <td className="r mono">{r.paidMembersCount}</td>
                <td className="r mono">{r.pendingMembersCount}</td>
                <td className="r mono" style={{ color: 'var(--red-tx)' }}>{fmtINR(r.totalOutstanding)}</td>
                <td className="r mono">
                  <span style={{ color: Number(r.collectionPercentage) >= 90 ? 'var(--green-tx)' : Number(r.collectionPercentage) >= 70 ? 'var(--yellow-tx)' : 'var(--red-tx)', fontWeight: 700 }}>
                    {r.collectionPercentage}%
                  </span>
                </td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      }
    </div>
  );
}

/* ══════════════════════════════════════════
   MAIN REPORTS SCREEN
══════════════════════════════════════════ */
/* ══════════════════════════════════════════
   8. CLOSING REPORT
══════════════════════════════════════════ */
const CLOSE_COLS = [
  { key: 'loanId', label: 'Loan ID' },
  { key: 'appId', label: 'App ID' },
  { key: 'memberName', label: 'Member Name' },
  { key: 'memberId', label: 'Member ID' },
  { key: 'mobile', label: 'Mobile' },
  { key: 'collectorName', label: 'Collector' },
  { key: 'loanType', label: 'Loan Type' },
  { key: 'loanAmount', label: 'Loan Amount' },
  { key: 'totalPaid', label: 'Total Paid' },
  { key: 'disbursalDate', label: 'Disbursal Date' },
  { key: 'closeDate', label: 'Close Date' },
  { key: 'status', label: 'Status' },
];

function ClosingReport() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [search, setSearch] = useState('');
  const [grouped, setGrouped] = useState(false);

  function load() {
    setLoading(true);
    const params = {};
    if (from) params.from = from;
    if (to) params.to = to;
    api.getReportClosing(params).then(setRows).catch(() => setRows([])).finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, []);

  const filtered = rows.filter(r => {
    const q = search.toLowerCase();
    return !q || [r.memberName, r.memberId, r.loanId, r.appId, r.collectorName, r.mobile].some(v => v && v.toLowerCase().includes(q));
  });

  const totalClosed = filtered.reduce((s, r) => s + Number(r.loanAmount || 0), 0);
  const csvRows = filtered.map(r => ({ ...r, loanAmount: fmtINR(r.loanAmount), totalPaid: fmtINR(r.totalPaid) }));

  const renderCloseRow = (r, i) => (
    <tr key={i}>
      <td className="mono" style={{ fontSize: 12 }}>{r.loanId}</td>
      <td className="mono" style={{ fontSize: 12 }}>{r.appId}</td>
      <td><b>{r.memberName}</b></td>
      <td className="mono" style={{ fontSize: 12 }}>{r.memberId}</td>
      <td className="mono">{r.mobile}</td>
      <td>{r.collectorName}</td>
      <td>{r.loanType}</td>
      <td className="r mono">{fmtINR(r.loanAmount)}</td>
      <td className="r mono" style={{ color: 'var(--green-tx)', fontWeight: 700 }}>{fmtINR(r.totalPaid)}</td>
      <td className="mono" style={{ fontSize: 12 }}>{r.disbursalDate}</td>
      <td className="mono" style={{ fontSize: 12 }}>{r.closeDate}</td>
      <td><Pill c="green">{r.status}</Pill></td>
    </tr>
  );

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>From</div>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)}
            style={{ padding: '8px 12px', border: '1px solid var(--line)', borderRadius: 10, fontSize: 14, background: '#fff' }} />
        </div>
        <div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>To</div>
          <input type="date" value={to} onChange={e => setTo(e.target.value)}
            style={{ padding: '8px 12px', border: '1px solid var(--line)', borderRadius: 10, fontSize: 14, background: '#fff' }} />
        </div>
        <button className="btn sm" style={{ alignSelf: 'flex-end' }} onClick={load}>Apply</button>
        <input className="search" style={{ flex: 1, minWidth: 200, marginBottom: 0, alignSelf: 'flex-end' }}
          placeholder="Search member, loan ID, collector…" value={search} onChange={e => setSearch(e.target.value)} />
        <button className={`btn sm${grouped ? '' : ' outline'}`} style={{ alignSelf: 'flex-end' }} onClick={() => setGrouped(g => !g)}>👤 Collector-wise</button>
      </div>
      <ExportBar count={filtered.length} total={totalClosed} totalLabel="Total Loan Amount Closed"
        onCSV={() => exportCSV(csvRows, CLOSE_COLS, `closing-report${from ? '-' + from : ''}`)}
        onPDF={() => printPDF('Loan Closing Report', from && to ? `${from} to ${to}` : 'All Closed Loans', CLOSE_COLS, csvRows,
          [['Closed Loans', filtered.length], ['Total Amount', fmtINR(totalClosed)]])} />
      {loading ? <div className="panel pad" style={{ textAlign: 'center', padding: 40 }}><p className="muted">Loading…</p></div> :
        filtered.length === 0 ? <div className="panel pad" style={{ textAlign: 'center', padding: 40 }}><p className="muted">No closed loans found.</p></div> :
        grouped ? <CollectorGrouped rows={filtered} cols={CLOSE_COLS} renderRow={renderCloseRow} amountKey="loanAmount" /> :
        <div className="panel scroll-x">
          <table className="dtable">
            <thead><tr>{CLOSE_COLS.map(c => <th key={c.key}>{c.label}</th>)}</tr></thead>
            <tbody>{filtered.map((r, i) => renderCloseRow(r, i))}</tbody>
          </table>
        </div>
      }
    </div>
  );
}

/* ══════════════════════════════════════════
   9. LOAN DETAILS REPORT
══════════════════════════════════════════ */
const LD_COLS = [
  { key: 'memberName', label: 'Member Name' },
  { key: 'memberId', label: 'Member ID' },
  { key: 'loanId', label: 'Loan ID' },
  { key: 'mobile', label: 'Mobile' },
  { key: 'collectorName', label: 'Collector' },
  { key: 'loanType', label: 'Loan Type' },
  { key: 'sanctionedAmount', label: 'Sanctioned Amount' },
  { key: 'sanctionDate', label: 'Sanction Date' },
  { key: 'disbursalDate', label: 'Disbursal Date' },
  { key: 'loanEndDate', label: 'Loan End Date' },
  { key: 'dueDate', label: 'Due Date' },
  { key: 'totalCollected', label: 'Amount Received' },
  { key: 'remaining', label: 'Remaining' },
  { key: 'status', label: 'Status' },
];

function LoanDetailsReport() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [grouped, setGrouped] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.getReportLoanDetails().then(setRows).catch(() => setRows([])).finally(() => setLoading(false));
  }, []);

  const filtered = rows.filter(r => {
    const q = search.toLowerCase();
    return !q || [r.memberName, r.memberId, r.loanId, r.collectorName, r.mobile].some(v => v && v.toLowerCase().includes(q));
  });

  const totalSanctioned = filtered.reduce((s, r) => s + Number(r.sanctionedAmount || 0), 0);
  const csvRows = filtered.map(r => ({ ...r, sanctionedAmount: fmtINR(r.sanctionedAmount), totalCollected: fmtINR(r.totalCollected), remaining: fmtINR(r.remaining) }));

  const renderLDRow = (r, i) => (
    <tr key={i}>
      <td><b>{r.memberName}</b></td>
      <td className="mono" style={{ fontSize: 12 }}>{r.memberId}</td>
      <td className="mono" style={{ fontSize: 12 }}>{r.loanId}</td>
      <td className="mono">{r.mobile}</td>
      <td>{r.collectorName}</td>
      <td>{r.loanType}</td>
      <td className="r mono">{fmtINR(r.sanctionedAmount)}</td>
      <td className="mono" style={{ fontSize: 12 }}>{r.sanctionDate}</td>
      <td className="mono" style={{ fontSize: 12 }}>{r.disbursalDate}</td>
      <td className="mono" style={{ fontSize: 12, color: 'var(--red-tx)' }}>{r.loanEndDate}</td>
      <td className="mono" style={{ fontSize: 12 }}>{r.dueDate}</td>
      <td className="r mono" style={{ color: 'var(--green-tx)', fontWeight: 700 }}>{fmtINR(r.totalCollected)}</td>
      <td className="r mono" style={{ color: r.remaining > 0 ? 'var(--red-tx)' : 'var(--green-tx)', fontWeight: 700 }}>{fmtINR(r.remaining)}</td>
      <td><Pill c={r.status === 'Disbursed' ? 'green' : r.status === 'Sanctioned' ? 'yellow' : 'grey'}>{r.status}</Pill></td>
    </tr>
  );

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        <input className="search" style={{ flex: 1, minWidth: 220, marginBottom: 0 }}
          placeholder="Search member, loan ID, collector…" value={search} onChange={e => setSearch(e.target.value)} />
        <button className={`btn sm${grouped ? '' : ' outline'}`} onClick={() => setGrouped(g => !g)}>👤 Collector-wise</button>
      </div>
      <ExportBar count={filtered.length} total={totalSanctioned} totalLabel="Total Sanctioned"
        onCSV={() => exportCSV(csvRows, LD_COLS, 'loan-details-report')}
        onPDF={() => printPDF('Loan Details Report', 'All Active Loans', LD_COLS, csvRows,
          [['Total Loans', filtered.length], ['Total Sanctioned', fmtINR(totalSanctioned)]])} />
      {loading ? <div className="panel pad" style={{ textAlign: 'center', padding: 40 }}><p className="muted">Loading…</p></div> :
        filtered.length === 0 ? <div className="panel pad" style={{ textAlign: 'center', padding: 40 }}><p className="muted">No records found.</p></div> :
        grouped ? <CollectorGrouped rows={filtered} cols={LD_COLS} renderRow={renderLDRow} amountKey="sanctionedAmount" /> :
        <div className="panel scroll-x">
          <table className="dtable">
            <thead><tr>{LD_COLS.map(c => <th key={c.key}>{c.label}</th>)}</tr></thead>
            <tbody>{filtered.map((r, i) => renderLDRow(r, i))}</tbody>
          </table>
        </div>
      }
    </div>
  );
}

/* ══════════════════════════════════════════
   10. INDIVIDUAL CUSTOMER DETAILED REPORT
══════════════════════════════════════════ */
function fmtDDMMYYYY(s) {
  if (!s) return '';
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) return s;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) { const [y,m,d] = s.slice(0,10).split('-'); return `${d}/${m}/${y}`; }
  return s;
}

function IndividualCustomerReport() {
  const [query,setQuery]=useState("");
  const [suggestions,setSuggestions]=useState([]);
  const [allMembers,setAllMembers]=useState([]);
  const [selectedMember,setSelectedMember]=useState(null);
  const [report,setReport]=useState(null);
  const [loading,setLoading]=useState(false);
  const [subTab,setSubTab]=useState("loans");
  const [allCustLoading,setAllCustLoading]=useState(false);
  const searchRef=useRef(null);
  useEffect(()=>{api.getMembers().then(setAllMembers).catch(()=>{});},[]); 
  useEffect(()=>{
    if(!query.trim()){setSuggestions([]);return;}
    const q=query.toLowerCase();
    setSuggestions(allMembers.filter(m=>(m.name||"").toLowerCase().includes(q)||(m.mobile||"").includes(q)||(m.memberId||"").toLowerCase().includes(q)).slice(0,8));
  },[query,allMembers]);
  function selectMember(m){setSelectedMember(m);setQuery(m.name);setSuggestions([]);loadReport(m.memberId);}
  function loadReport(mid){setLoading(true);setReport(null);api.getCustomerReport(mid).then(setReport).catch(()=>setReport(null)).finally(()=>setLoading(false));}
  function exportIndividualExcel(){
    if(!report)return;
    const wb=XLSX.utils.book_new();
    const {member,summary,loans,payments,deductions,npaHistory,latePaymentSummary}=report;
    const ws1=XLSX.utils.aoa_to_sheet([["Mahalaxmi Co-Operative Society Ltd"],["Individual Customer Report"],["Generated:",new Date().toLocaleString("en-IN")],[],["Customer Name",member.name],["Customer ID",member.memberId],["Mobile",member.mobile||""],["Address",member.address||""],[],["Total Loans",summary.totalLoans],["Active Loans",summary.activeLoans],["NPA Loans",summary.npaLoans||0],["Total Borrowed",summary.totalBorrowed],["Service Charge",summary.totalProcessingFees||0],["Total Paid",summary.totalPaid],["Total Pending",summary.totalPending],["Late Payments",summary.totalLatePayments||0]]);
    ws1["!cols"]=[{wch:30},{wch:30}];
    XLSX.utils.book_append_sheet(wb,ws1,"Summary");
    const lh=["Sl","Loan ID","Type","App Date","Disbursal Date","Sanctioned","Service Charge (Rs.)","Net Disbursed","Interest%","Tenure","Total Interest","Total Payable","Total Paid","Deduction","Pending","Late Pmts","Missed Days","Status","NPA","NPA Date","Flagged By","Collector"];
    const lr=loans.map(l=>[l.sl,l.loanId,l.loanType||"",fmtDDMMYYYY(l.applicationDate),fmtDDMMYYYY(l.loanDate),l.loanAmount,l.processingFee,l.netDisbursed,l.interestRate+"%",l.tenure,l.totalInterest,l.totalPayable,l.totalPaid,l.totalDeduction,l.pending,l.latePayments,l.missedStreak,l.status,l.isNPA?"YES":"No",fmtDDMMYYYY(l.npaDate),l.npaFlaggedBy,l.collectorName]);
    const ws2=XLSX.utils.aoa_to_sheet([lh,...lr]);ws2["!cols"]=lh.map(()=>({wch:18}));
    XLSX.utils.book_append_sheet(wb,ws2,"Loan Details");
    const ph=["Sl","Date","Loan ID","Opening Bal","Daily Paid","Principal","Interest","Deduction","Other","Total Rcvd","Remaining","Days Late","Mode","Collected By","Txn ID"];
    const pr=payments.map(p=>[p.sl,fmtDDMMYYYY(p.paymentDate),p.loanIdDisplay||p.loanId,p.openingBalance,p.dailyPayment,p.principalPaid,p.interestPaid,p.deductionAmount,p.otherCharges,p.totalReceived,p.remainingBalance,p.daysLate||0,p.paymentMode,p.collectedBy,p.transactionId]);
    const ws3=XLSX.utils.aoa_to_sheet([ph,...pr]);ws3["!cols"]=ph.map(()=>({wch:16}));
    XLSX.utils.book_append_sheet(wb,ws3,"Daily Payments");
    const dh=["Date","Loan ID","Type","Description","Amount","Reason","Approved By"];
    const dr=deductions.map(d=>[fmtDDMMYYYY(d.deductionDate),d.loanId,d.deductionType,d.description,d.deductionAmount,d.reason,d.approvedBy]);
    const ws4=XLSX.utils.aoa_to_sheet([dh,...dr]);ws4["!cols"]=dh.map(()=>({wch:20}));
    XLSX.utils.book_append_sheet(wb,ws4,"Deductions");
    const nh=["Loan ID","Loan Amount","Disbursal Date","NPA Date","Flagged By","Missed Streak","Pending","Status"];
    const nr=(npaHistory||[]).map(n=>[n.loanId,n.loanAmount,fmtDDMMYYYY(n.disbursalDate),fmtDDMMYYYY(n.npaDate),n.flaggedBy,n.missedStreak,n.pendingAmount,n.currentStatus]);
    const ws5=XLSX.utils.aoa_to_sheet([nh,...nr]);ws5["!cols"]=nh.map(()=>({wch:18}));
    XLSX.utils.book_append_sheet(wb,ws5,"NPA History");
    const lph=["Loan ID","Loan Amount","Disbursal","Tenure","On Time","Late","Missed","Streak","Status"];
    const lpr=(latePaymentSummary||[]).map(l=>[l.loanId,l.loanAmount,fmtDDMMYYYY(l.disbursalDate),l.tenure,l.paidOnTime,l.paidLate,l.missedDays,l.currentStreak,l.status]);
    const ws6=XLSX.utils.aoa_to_sheet([lph,...lpr]);ws6["!cols"]=lph.map(()=>({wch:16}));
    XLSX.utils.book_append_sheet(wb,ws6,"Late Payments");
    XLSX.writeFile(wb,"Customer-Report-"+member.name+"-"+member.memberId+".xlsx");
  }
  async function exportAllCustomersExcel(){
    setAllCustLoading(true);
    try{
      const rows=await api.getAllCustomersLoans();
      const headers=["Sl.","Customer Name","Customer ID","Loan ID","Loan Date","Sanctioned (Rs.)","Service Charge (Rs.)","Net Disbursed (Rs.)","Interest %","Duration","Total Interest (Rs.)","Total Payable (Rs.)","Total Paid (Rs.)","Deduction (Rs.)","Pending (Rs.)","Late Pmts","Missed Days","NPA","Status","Collector"];
      const data=rows.map(r=>[
        r.sl,r.customerName,r.customerId,r.loanId,fmtDDMMYYYY(r.loanDate),
        Number(r.loanAmount||0),
        Number(r.processingFee||0),
        Number(r.netDisbursed||0),
        r.interestRate+"%",r.tenure+" days",
        Number(r.totalInterest||0),Number(r.totalPayable||0),Number(r.totalPaid||0),Number(r.totalDeduction||0),Number(r.pending||0),
        r.latePayments,r.missedStreak,r.isNPA?"YES":"No",r.status,r.collectorName
      ]);
      const wb=XLSX.utils.book_new();
      const ws=XLSX.utils.aoa_to_sheet([headers,...data]);
      ws["!cols"]=headers.map(()=>({wch:22}));
      XLSX.utils.book_append_sheet(wb,ws,"All Customers");
      XLSX.writeFile(wb,"All-Customers-Report-"+new Date().toISOString().slice(0,10)+".xlsx");
    }catch(e){alert("Failed: "+e.message);}
    finally{setAllCustLoading(false);}
  }
  const s=report&&report.summary;
  const LOAN_COLS=[{key:"loanId",label:"Loan ID"},{key:"loanDate",label:"Loan Date"},{key:"loanAmount",label:"Loan Amount"},{key:"interestRate",label:"Interest Rate"},{key:"tenure",label:"Duration"},{key:"totalInterest",label:"Total Interest"},{key:"totalPayable",label:"Total Payable"},{key:"totalPaid",label:"Total Paid"},{key:"totalDeduction",label:"Deduction"},{key:"pending",label:"Pending"},{key:"status",label:"Status"}];
  const PAY_COLS=[{key:"sl",label:"Sl."},{key:"paymentDate",label:"Date"},{key:"loanIdDisplay",label:"Loan ID"},{key:"openingBalance",label:"Opening Bal"},{key:"dailyPayment",label:"Daily Paid"},{key:"principalPaid",label:"Principal"},{key:"interestPaid",label:"Interest"},{key:"deductionAmount",label:"Deduction"},{key:"otherCharges",label:"Other"},{key:"totalReceived",label:"Total Rcvd"},{key:"remainingBalance",label:"Remaining"},{key:"paymentMode",label:"Mode"},{key:"collectedBy",label:"Collected By"},{key:"transactionId",label:"Txn ID"}];
  const DED_COLS=[{key:"deductionDate",label:"Date"},{key:"loanId",label:"Loan ID"},{key:"deductionType",label:"Type"},{key:"description",label:"Description"},{key:"deductionAmount",label:"Amount"},{key:"reason",label:"Reason"},{key:"approvedBy",label:"Approved By"}];
  return (
    <div>
      <div style={{position:"relative",marginBottom:20}}>
        <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"center"}}>
          <div style={{position:"relative",flex:1,minWidth:280}}>
            <input ref={searchRef} className="search" style={{width:"100%",marginBottom:0,paddingLeft:36}} placeholder="Search by name, mobile or Customer ID..." value={query} onChange={e=>{setQuery(e.target.value);setSelectedMember(null);}} autoComplete="off" />
            <span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",fontSize:16,pointerEvents:"none"}}>&#128269;</span>
            {suggestions.length>0&&(
              <div style={{position:"absolute",top:"100%",left:0,right:0,background:"#fff",border:"1px solid var(--line)",borderRadius:10,boxShadow:"0 4px 20px rgba(0,0,0,.12)",zIndex:100,maxHeight:280,overflowY:"auto"}}>
                {suggestions.map(m=>(
                  <div key={m.memberId} onClick={()=>selectMember(m)} style={{padding:"10px 16px",cursor:"pointer",borderBottom:"1px solid var(--line)",display:"flex",justifyContent:"space-between",alignItems:"center"}} onMouseEnter={e=>e.currentTarget.style.background="var(--g50,#f4faf6)"} onMouseLeave={e=>e.currentTarget.style.background="#fff"}>
                    <div><div style={{fontWeight:600,fontSize:14}}>{m.name}</div><div style={{fontSize:12,color:"var(--muted)"}}>{m.memberId} &middot; {m.mobile}</div></div>
                    <span style={{fontSize:11,color:"var(--muted)",background:"var(--line)",borderRadius:20,padding:"2px 8px"}}>Select</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          {selectedMember&&(<button className="btn sm" onClick={()=>loadReport(selectedMember.memberId)} disabled={loading}>{loading?"Loading...":"Generate Report"}</button>)}
          <button className="btn sm outline" onClick={exportAllCustomersExcel} disabled={allCustLoading}>{allCustLoading?"Exporting...":"Export All Customers Excel"}</button>
        </div>
      </div>
      {loading&&<div className="panel pad" style={{textAlign:"center",padding:40}}><p className="muted">Loading customer report...</p></div>}
      {!loading&&!report&&!selectedMember&&(
        <div className="panel pad" style={{textAlign:"center",padding:60}}>
          <div style={{fontSize:48,marginBottom:12}}>&#128269;</div>
          <p className="muted">Search for a customer to view their complete loan history and generate a report.</p>
        </div>
      )}
      {report&&(
        <>
          <div className="panel" style={{padding:"18px 20px",marginBottom:16}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:12}}>
              <div>
                <div style={{fontSize:20,fontWeight:800,marginBottom:4}}>{report.member.name}</div>
                <div style={{fontSize:13,color:"var(--muted)",display:"flex",gap:16,flexWrap:"wrap"}}>
                  <span>ID: {report.member.memberId}</span>
                  <span>Mobile: {report.member.mobile}</span>
                  {report.member.address&&<span>Address: {report.member.address}</span>}
                </div>
              </div>
              <div style={{display:"flex",gap:8}}>
                <button className="btn sm" onClick={exportIndividualExcel}>Export Excel</button>
                <button className="btn sm outline" onClick={()=>printPDF("Individual Customer Report",report.member.name+" - "+report.member.memberId,LOAN_COLS,report.loans.map(l=>({...l,loanAmount:fmtINR(l.loanAmount),totalInterest:fmtINR(l.totalInterest),totalPayable:fmtINR(l.totalPayable),totalPaid:fmtINR(l.totalPaid),totalDeduction:ftINR(l.totalDeduction),pending:fmtINR(l.pending),loanDate:fmtDDMMYYYY(l.loanDate)})),[])}>Print PDF</button>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:10,marginTop:16}}>
              {[
                ["Total Loans",s.totalLoans,"#1f7a45"],
                ["Active Loans",s.activeLoans,"#1f7a45"],
                ["Closed Loans",s.closedLoans,"#555"],
                ["NPA Loans",s.npaLoans||0,s.npaLoans>0?"#a61f1a":"#555"],
                ["Total Borrowed",fmtINR(s.totalBorrowed),"#1f7a45"],
                ["Service Charge",fmtINR(s.totalProcessingFees||0),"#8a5a00"],
                ["Total Paid",fmtINR(s.totalPaid),"#1f7a45"],
                ["Total Pending",fmtINR(s.totalPending),s.totalPending>0?"#a61f1a":"#1f7a45"],
                ["Late Payments",s.totalLatePayments||0,s.totalLatePayments>0?"#a61f1a":"#555"],
              ].map(([label,value,color])=>(
                <div key={label} className="kpi" style={{borderLeft:"4px solid "+color}}>
                  <div className="eb">{label}</div>
                  <div className="v" style={{color}}>{value}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{display:"flex",gap:0,borderBottom:"2px solid var(--line)",marginBottom:14,flexWrap:"wrap"}}>
            {[["loans","Loan History"],["payments","Daily Collections"],["deductions","Deductions (incl. Service Charge)"],["npa","NPA History"],["late","Late Payments"],["pending","Pending Details"]].map(([k,l])=>(
              <button key={k} onClick={()=>setSubTab(k)} style={{padding:"8px 16px",border:0,borderBottom:subTab===k?"2px solid var(--g800)":"2px solid transparent",background:"transparent",fontWeight:subTab===k?700:400,cursor:"pointer",fontSize:12,marginBottom:-2,whiteSpace:"nowrap"}}>{l}</button>
            ))}
          </div>
          {subTab==="loans"&&(
            report.loans.length===0
              ?<div className="panel pad" style={{textAlign:"center",padding:30}}><p className="muted">No loans found.</p></div>
              :<div className="panel scroll-x">
                  <table className="dtable">
                    <thead><tr><th>Sl.</th><th>Loan ID</th><th>Loan Date</th><th>Sanctioned</th><th>Service Charge (Rs.)</th><th>Net Disbursed</th><th>Interest %</th><th>Duration</th><th>Total Interest</th><th>Total Payable</th><th>Total Paid</th><th>Deduction</th><th>Pending</th><th>Late Pmts</th><th>Missed Days</th><th>NPA</th><th>Status</th><th>Collector</th></tr></thead>
                    <tbody>{report.loans.map((l,i)=>(
                      <tr key={i} style={{background:l.isNPA?"rgba(166,31,26,.06)":l.pending<=0?"rgba(31,122,69,.06)":"transparent"}}>
                        <td className="mono">{l.sl||i+1}</td>
                        <td className="mono" style={{fontSize:12}}>{l.loanId}</td>
                        <td className="mono" style={{fontSize:12}}>{fmtDDMMYYYY(l.loanDate)}</td>
                        <td className="r mono">{fmtINR(l.loanAmount)}</td>
                        <td className="r mono" style={{color:"var(--red-tx)",fontWeight:700}}>{l.processingFee>0?fmtINR(l.processingFee):"--"}</td>
                        <td className="r mono" style={{color:"var(--green-tx)"}}>{fmtINR(l.netDisbursed)}</td>
                        <td className="r mono">{l.interestRate}%</td>
                        <td className="r mono">{l.tenure} days</td>
                        <td className="r mono">{fmtINR(l.totalInterest)}</td>
                        <td className="r mono">{fmtINR(l.totalPayable)}</td>
                        <td className="r mono" style={{color:"var(--green-tx)",fontWeight:700}}>{fmtINR(l.totalPaid)}</td>
                        <td className="r mono">{fmtINR(l.totalDeduction)}</td>
                        <td className="r mono" style={{color:l.pending>0?"var(--red-tx)":"var(--green-tx)",fontWeight:700}}>{fmtINR(l.pending)}</td>
                        <td className="r mono" style={{color:l.latePayments>0?"var(--red-tx)":"inherit"}}>{l.latePayments||0}</td>
                        <td className="r mono" style={{color:l.missedStreak>0?"var(--red-tx)":"inherit"}}>{l.missedStreak||0}</td>
                        <td>{l.isNPA?<Pill c="red">NPA</Pill>:<Pill c="grey">No</Pill>}</td>
                        <td><Pill c={l.pending<=0?"green":l.status==="Disbursed"?"yellow":"grey"}>{l.pending<=0?"Closed":l.status}</Pill></td>
                        <td style={{fontSize:12}}>{l.collectorName}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                  {report.loans.length>1&&(
                    <div style={{padding:"10px 16px",background:"var(--g50,#f4faf6)",borderTop:"1px solid var(--line)",fontSize:13,display:"flex",gap:24,flexWrap:"wrap"}}>
                      <span>Total Loans: <b>{report.loans.length}</b></span>
                      <span>Total Sanctioned: <b>{fmtINR(report.loans.reduce((s,l)=>s+l.loanAmount,0))}</b></span>
                      <span>Service Charge: <b style={{color:"var(--red-tx)"}}>{fmtINR(report.loans.reduce((s,l)=>s+l.processingFee,0))}</b></span>
                      <span>Total Paid: <b style={{color:"var(--green-tx)"}}>{fmtINR(report.loans.reduce((s,l)=>s+l.totalPaid,0))}</b></span>
                      <span>Total Pending: <b style={{color:"var(--red-tx)"}}>{fmtINR(report.loans.reduce((s,l)=>s+l.pending,0))}</b></span>
                    </div>
                  )}
                </div>
          )}
          {subTab==="payments"&&(
            report.payments.length===0
              ?<div className="panel pad" style={{textAlign:"center",padding:30}}><p className="muted">No payment records found.</p></div>
              :<div className="panel scroll-x">
                  <table className="dtable">
                    <thead><tr>{PAY_COLS.map(c=><th key={c.key}>{c.label}</th>)}<th>Days Late</th></tr></thead>
                    <tbody>{report.payments.map((p,i)=>(
                      <tr key={i} style={{background:p.isLate?"rgba(166,31,26,.04)":"transparent"}}>
                        <td className="mono">{p.sl}</td>
                        <td className="mono" style={{fontSize:12}}>{fmtDDMMYYYY(p.paymentDate)}</td>
                        <td className="mono" style={{fontSize:12}}>{p.loanIdDisplay||p.loanId}</td>
                        <td className="r mono">{fmtINR(p.openingBalance)}</td>
                        <td className="r mono" style={{color:"var(--green-tx)",fontWeight:700}}>{fmtINR(p.dailyPayment)}</td>
                        <td className="r mono">{fmtINR(p.principalPaid)}</td>
                        <td className="r mono">{fmtINR(p.interestPaid)}</td>
                        <td className="r mono">{fmtINR(p.deductionAmount)}</td>
                        <td className="r mono">{fmtINR(p.otherCharges)}</td>
                        <td className="r mono" style={{fontWeight:700}}>{fmtINR(p.totalReceived)}</td>
                        <td className="r mono" style={{color:p.remainingBalance>0?"var(--red-tx)":"var(--green-tx)"}}>{fmtINR(p.remainingBalance)}</td>
                        <td>{p.paymentMode}</td>
                        <td>{p.collectedBy}</td>
                        <td className="mono" style={{fontSize:11}}>{p.transactionId}</td>
                        <td className="r mono" style={{color:p.daysLate>0?"var(--red-tx)":"var(--green-tx)",fontWeight:p.daysLate>0?700:400}}>{p.daysLate>0?"+"+p.daysLate+" days":"On time"}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
          )}
          {subTab==="deductions"&&(
            report.deductions.length===0
              ?<div className="panel pad" style={{textAlign:"center",padding:30}}><p className="muted">No deduction records found.</p></div>
              :<>
                  <div style={{padding:"8px 0 12px",fontSize:13,color:"var(--muted)"}}>Showing all deductions including service charges deducted at loan disbursal.</div>
                  <div className="panel scroll-x">
                    <table className="dtable">
                      <thead><tr>{DED_COLS.map(c=><th key={c.key}>{c.label}</th>)}</tr></thead>
                      <tbody>{report.deductions.map((d,i)=>(
                        <tr key={i} style={{background:d.deductionType==="Processing Fee"?"rgba(138,90,0,.05)":"transparent"}}>
                          <td className="mono" style={{fontSize:12}}>{fmtDDMMYYYY(d.deductionDate)}</td>
                          <td className="mono" style={{fontSize:12}}>{d.loanId}</td>
                          <td><b style={{color:d.deductionType==="Processing Fee"?"#8a5a00":"inherit"}}>{d.deductionType}</b></td>
                          <td style={{fontSize:12}}>{d.description}</td>
                          <td className="r mono" style={{color:"var(--red-tx)",fontWeight:700}}>{fmtINR(d.deductionAmount)}</td>
                          <td style={{fontSize:12}}>{d.reason}</td>
                          <td>{d.approvedBy}</td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                </>
          )}
          {subTab==="npa"&&(
            !report.npaHistory||report.npaHistory.length===0
              ?<div className="panel pad" style={{textAlign:"center",padding:40}}><div style={{fontSize:36,marginBottom:8}}>&#9989;</div><p className="muted">No NPA history. This customer has no loans flagged as Non-Performing Assets.</p></div>
              :<div className="panel scroll-x">
                  <table className="dtable">
                    <thead><tr><th>Loan ID</th><th>Loan Amount</th><th>Disbursal Date</th><th>NPA Date</th><th>Flagged By</th><th>Missed Streak</th><th>Pending Amount</th><th>Current Status</th></tr></thead>
                    <tbody>{report.npaHistory.map((n,i)=>(
                      <tr key={i} style={{background:"rgba(166,31,26,.05)"}}>
                        <td className="mono" style={{fontSize:12}}>{n.loanId}</td>
                        <td className="r mono">{fmtINR(n.loanAmount)}</td>
                        <td className="mono" style={{fontSize:12}}>{fmtDDMMYYYY(n.disbursalDate)}</td>
                        <td className="mono" style={{fontSize:12,color:"var(--red-tx)",fontWeight:700}}>{fmtDDMMYYYY(n.npaDate)||"--"}</td>
                        <td>{n.flaggedBy}</td>
                        <td className="r mono" style={{color:"var(--red-tx)",fontWeight:700}}>{n.missedStreak} days</td>
                        <td className="r mono" style={{color:"var(--red-tx)",fontWeight:700}}>{fmtINR(n.pendingAmount)}</td>
                        <td><Pill c="red">{n.currentStatus}</Pill></td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
          )}
          {subTab==="late"&&(
            !report.latePaymentSummary||report.latePaymentSummary.length===0
              ?<div className="panel pad" style={{textAlign:"center",padding:40}}><p className="muted">No late payment data available.</p></div>
              :<>
                  {report.latePaymentSummary.map((l,i)=>(
                    <div key={i} className="panel" style={{marginBottom:14,overflow:"hidden"}}>
                      <div style={{padding:"12px 16px",background:"var(--g50,#f4faf6)",borderBottom:"1px solid var(--line)",display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
                        <div>
                          <span style={{fontWeight:700,fontSize:14}}>{l.loanId}</span>
                          <span style={{marginLeft:12,fontSize:12,color:"var(--muted)"}}>Disbursed: {fmtDDMMYYYY(l.disbursalDate)} &middot; {l.tenure} days</span>
                        </div>
                        <div style={{display:"flex",gap:16,fontSize:13,flexWrap:"wrap"}}>
                          <span style={{color:"var(--green-tx)"}}>On Time: <b>{l.paidOnTime}</b></span>
                          <span style={{color:l.paidLate>0?"var(--red-tx)":"inherit"}}>Late: <b>{l.paidLate}</b></span>
                          <span style={{color:l.missedDays>0?"var(--red-tx)":"inherit"}}>Missed: <b>{l.missedDays}</b></span>
                          <span style={{color:l.currentStreak>0?"var(--red-tx)":"inherit"}}>Streak: <b>{l.currentStreak}</b></span>
                          <Pill c={l.status==="NPA"?"red":l.status==="Disbursed"?"yellow":"grey"}>{l.status}</Pill>
                        </div>
                      </div>
                      {l.lateDetails&&l.lateDetails.length>0&&(
                        <table className="dtable">
                          <thead><tr><th>Payment Date</th><th>Amount</th><th>Days Late</th><th>Collected By</th></tr></thead>
                          <tbody>{l.lateDetails.map((d,j)=>(
                            <tr key={j} style={{background:"rgba(166,31,26,.04)"}}>
                              <td className="mono" style={{fontSize:12}}>{fmtDDMMYYYY(d.paymentDate)}</td>
                              <td className="r mono">{fmtINR(d.amount)}</td>
                              <td className="r mono" style={{color:"var(--red-tx)",fontWeight:700}}>+{d.daysLate} days late</td>
                              <td>{d.collectedBy}</td>
                            </tr>
                          ))}</tbody>
                        </table>
                      )}
                      {(!l.lateDetails||l.lateDetails.length===0)&&<div style={{padding:"12px 16px",fontSize:13,color:"var(--green-tx)"}}>All payments for this loan were made on time.</div>}
                    </div>
                  ))}
                </>
          )}
          {subTab==="pending"&&(<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:14}}>{[["Total Principal Pending",s.totalPrincipalPending,s.totalPrincipalPending>0?"#a61f1a":"#1f7a45"],["Total Interest Pending",s.totalInterestPending,s.totalInterestPending>0?"#a61f1a":"#1f7a45"],["Other Pending Charges",s.otherPendingCharges,"#8a5a00"],["Total Amount Paid",s.totalPaid,"#1f7a45"],["Total Deductions",s.totalDeductions,"#8a5a00"],["Grand Total Pending",s.grandTotalPending,s.grandTotalPending>0?"#a61f1a":"#1f7a45"]].map(([label,value,color])=>(<div key={label} className="kpi" style={{borderLeft:"4px solid "+color}}><div className="eb">{label}</div><div className="v" style={{color,fontSize:22,fontWeight:800}}>{fmtINR(value)}</div></div>))}</div>)}
        </>
      )}
    </div>
  );
}
const REPORT_TABS=[{key:"customer",label:"Individual Customer",icon:"👤"},{key:"summary",label:"Summary",icon:"📊"},{key:"daily",label:"Daily",icon:"📅"},{key:"weekly",label:"Weekly",icon:"🗓️"},{key:"monthly",label:"Monthly",icon:"📆"},{key:"defaulters",label:"Due and Defaulters",icon:"⚠️"},{key:"paid",label:"Paid Members",icon:"✅"},{key:"collector",label:"Collector-wise",icon:"🧑‍💼"},{key:"closing",label:"Closing Report",icon:"🔒"},{key:"loandetails",label:"Loan Details",icon:"📋"}];
export function Reports(){const [tab,setTab]=useState("customer");return(<><div className="a-title"><div><h1>Reports</h1><p>Individual Customer Reports</p></div></div><div style={{display:"flex",gap:0,borderBottom:"2px solid var(--line)",marginBottom:20,flexWrap:"wrap"}}>{REPORT_TABS.map(t=>(<button key={t.key} onClick={()=>setTab(t.key)} style={{padding:"10px 18px",border:0,borderBottom:tab===t.key?"2px solid var(--g800)":"2px solid transparent",background:"transparent",fontWeight:tab===t.key?700:400,cursor:"pointer",fontSize:13,marginBottom:-2,whiteSpace:"nowrap",display:"flex",alignItems:"center",gap:6}}><span>{t.icon}</span>{t.label}</button>))}</div>{tab==="customer"&&<IndividualCustomerReport/>}{tab==="summary"&&<ReportSummary/>}{tab==="daily"&&<DailyReport/>}{tab==="weekly"&&<WeeklyReport/>}{tab==="monthly"&&<MonthlyReport/>}{tab==="defaulters"&&<DefaultersReport/>}{tab==="paid"&&<PaidMembersReport/>}{tab==="collector"&&<CollectorWiseReport/>}{tab==="closing"&&<ClosingReport/>}{tab==="loandetails"&&<LoanDetailsReport/>}</>);}
