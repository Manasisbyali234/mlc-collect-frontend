import { useState, useEffect, useRef } from 'react';
import { api } from '../api.js';

const TODAY = new Date().toISOString().slice(0, 10);

function fmt(n) {
  if (!n || n === 0) return '–';
  return '₹' + Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 2 });
}
function fmtBal(n) {
  const abs = '₹' + Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 2 });
  return n < 0 ? '(' + abs + ')' : abs;
}
function initials(name) {
  return (name || '').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

export function EmployeeLedger() {
  const [members, setMembers] = useState([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [showDrop, setShowDrop] = useState(false);
  const [from, setFrom] = useState('2020-01-01');
  const [to, setTo] = useState(TODAY);
  const [ledger, setLedger] = useState(null);
  const [loading, setLoading] = useState(false);
  const [membersLoading, setMembersLoading] = useState(true);
  const dropRef = useRef(null);

  useEffect(() => {
    api.getMembers()
      .then(setMembers)
      .catch(() => {})
      .finally(() => setMembersLoading(false));
  }, []);

  useEffect(() => {
    function h(e) { if (dropRef.current && !dropRef.current.contains(e.target)) setShowDrop(false); }
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  useEffect(() => {
    if (!selected) return;
    setLoading(true);
    api.getLedger(selected.memberId, { from, to })
      .then(setLedger)
      .catch(() => setLedger(null))
      .finally(() => setLoading(false));
  }, [selected, from, to]);

  const searchFiltered = members.filter(m => {
    const q = search.toLowerCase();
    return !q || [m.name, m.memberId, m.mobile].some(v => v && v.toLowerCase().includes(q));
  });

  function selectMember(m) {
    setSelected(m);
    setSearch(m.name);
    setShowDrop(false);
  }

  function clearSelection() {
    setSelected(null);
    setLedger(null);
    setSearch('');
  }

  function handleExcel() {
    if (!ledger) return;
    const rows = [
      ['Mahalaxmi Co-Operative Society Ltd'],
      ['Employee Ledger Statement'],
      ['Employee:', ledger.member.name, 'ID:', ledger.member.memberId, 'Mobile:', ledger.member.mobile],
      ['Period:', from, 'to', to],
      ['Opening Balance:', ledger.openingBalance, '', 'Closing Balance:', ledger.closingBalance],
      [],
      ['Sl', 'Date', 'Doc No.', 'Bill No.', 'Transaction Details', 'Debit (Rs)', 'Credit (Rs)', 'Balance (Rs)'],
      ...ledger.rows.map(r => [r.sl, r.date, r.docNo, r.billNo, r.details, r.debit || '', r.credit || '', r.balance]),
      [],
      ['', '', '', '', 'Total',
        ledger.rows.reduce((s, r) => s + r.debit, 0),
        ledger.rows.reduce((s, r) => s + r.credit, 0),
        ledger.closingBalance],
    ];
    const csv = rows.map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ledger_${ledger.member.memberId}_${from}_${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .a-top, .sidebar, .sidebar-overlay, .hamburger { display: none !important; }
          .a-main { margin: 0 !important; padding: 8px !important; }
          body { background: #fff !important; }
          .ldg-print-area { box-shadow: none !important; border: none !important; }
        }
        .ldg-table { width: 100%; border-collapse: collapse; }
        .ldg-table th { background: #1a4731; color: #fff; font-weight: 600; padding: 10px 12px; font-size: 12px; text-align: left; border: 1px solid #155a30; letter-spacing: .04em; text-transform: uppercase; }
        .ldg-table td { padding: 8px 12px; font-size: 13px; border: 1px solid #e5e7eb; vertical-align: middle; }
        .ldg-table tbody tr:hover td { background: #f0fdf4 !important; }
        .ldg-table .r { text-align: right; }
        .ldg-emp-card { display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-radius: 12px; cursor: pointer; border: 1px solid #e5e7eb; background: #fff; transition: all .15s; }
        .ldg-emp-card:hover { border-color: #1a4731; background: #f0fdf4; }
        .ldg-emp-card.active { border-color: #1a4731; background: #f0fdf4; box-shadow: 0 0 0 2px #1a473133; }
        .ldg-avatar { width: 40px; height: 40px; border-radius: 50%; background: #1a4731; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 15px; flex-shrink: 0; }
      `}</style>

      <div className="a-title no-print">
        <div>
          <h1>📒 Employee Ledger</h1>
          <p>Individual accounting ledger · {members.length} employees</p>
        </div>
        {selected && (
          <button className="btn sm outline" onClick={clearSelection}>← All Employees</button>
        )}
      </div>

      {/* ── Employee List View (no selection) ── */}
      {!selected && (
        <>
          {/* Search bar */}
          <input
            className="search"
            style={{ marginBottom: 16 }}
            placeholder="Search employee by name, ID, or mobile…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />

          {membersLoading ? (
            <div className="panel pad" style={{ textAlign: 'center', padding: 48 }}>
              <p className="muted">Loading employees…</p>
            </div>
          ) : searchFiltered.length === 0 ? (
            <div className="panel pad" style={{ textAlign: 'center', padding: 48 }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>📒</div>
              <p className="muted">{search ? 'No employees match your search.' : 'No employees registered yet.'}</p>
            </div>
          ) : (
            <div className="panel scroll-x">
              <table className="dtable">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Member ID</th>
                    <th>Mobile</th>
                    <th>Village / City</th>
                    <th>District</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {searchFiltered.map(m => (
                    <tr key={m.memberId} style={{ cursor: 'pointer' }} onClick={() => selectMember(m)}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div className="ldg-avatar">{initials(m.name)}</div>
                          <b>{m.name}</b>
                        </div>
                      </td>
                      <td className="mono" style={{ fontSize: 13 }}>{m.memberId}</td>
                      <td className="mono">{m.mobile || '–'}</td>
                      <td>{m.village || '–'}</td>
                      <td>{m.district || '–'}</td>
                      <td>
                        <button className="btn sm" onClick={e => { e.stopPropagation(); selectMember(m); }}>
                          📒 View Ledger
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ── Ledger View (employee selected) ── */}
      {selected && (
        <>
          {/* Search + Date Filters */}
          <div className="panel pad no-print" style={{ marginBottom: 16 }} ref={dropRef}>
            {/* Row 1: Employee search + date inputs */}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 10 }}>
              <div style={{ flex: '1 1 200px', position: 'relative' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 5 }}>Employee</div>
                <input
                  className="input"
                  style={{ padding: '9px 12px', fontSize: 13, width: '100%', boxSizing: 'border-box' }}
                  placeholder="Search employee…"
                  value={search}
                  onChange={e => { setSearch(e.target.value); setShowDrop(true); }}
                  onFocus={() => setShowDrop(true)}
                />
                {showDrop && search && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #d1d5db', borderRadius: 10, zIndex: 50, boxShadow: '0 8px 24px rgba(0,0,0,.12)', maxHeight: 220, overflowY: 'auto' }}>
                    {members.filter(m => {
                      const q = search.toLowerCase();
                      return [m.name, m.memberId, m.mobile].some(v => v && v.toLowerCase().includes(q));
                    }).slice(0, 15).map(m => (
                      <div key={m.memberId}
                        style={{ padding: '9px 14px', cursor: 'pointer', borderBottom: '1px solid #f3f4f6', fontSize: 13 }}
                        onMouseDown={() => selectMember(m)}>
                        <b>{m.name}</b>
                        <span style={{ color: 'var(--muted)', marginLeft: 8 }}>{m.memberId} · {m.mobile}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 5 }}>From</div>
                <input className="input" type="date" value={from} onChange={e => setFrom(e.target.value)} style={{ padding: '9px 12px' }} />
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 5 }}>To</div>
                <input className="input" type="date" value={to} onChange={e => setTo(e.target.value)} style={{ padding: '9px 12px' }} />
              </div>
            </div>
            {/* Row 2: Quick filter buttons + export buttons */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button className="btn sm outline" onClick={() => { setFrom(TODAY); setTo(TODAY); }}>Today</button>
                <button className="btn sm outline" onClick={() => { setFrom(TODAY.slice(0, 8) + '01'); setTo(TODAY); }}>This Month</button>
                <button className="btn sm outline" onClick={() => { setFrom(TODAY.slice(0, 4) + '-01-01'); setTo(TODAY); }}>This Year</button>
                <button className="btn sm outline" onClick={() => { setFrom('2020-01-01'); setTo(TODAY); }}>All Time</button>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn sm" onClick={() => window.print()}>🖨 Print</button>
                <button className="btn sm" onClick={handleExcel}>📊 Excel</button>
                <button className="btn sm" onClick={() => window.print()}>📄 PDF</button>
              </div>
            </div>
          </div>

          {loading && (
            <div className="panel pad" style={{ textAlign: 'center', padding: 48 }}>
              <p className="muted">Loading ledger…</p>
            </div>
          )}

          {!loading && ledger && (
            <div className="panel ldg-print-area" style={{ padding: 0, overflow: 'hidden' }}>

              {/* ── Ledger Header ── */}
              <div style={{ background: '#1a4731', color: '#fff', padding: '18px 28px', textAlign: 'center' }}>
                <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: 0.5 }}>Mahalaxmi Co-Operative Society Ltd</div>
                <div style={{ fontSize: 12, opacity: 0.75, marginTop: 3, letterSpacing: 1, textTransform: 'uppercase' }}>Individual Employee Ledger Statement</div>
              </div>

              {/* ── Member Info + Summary ── */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '2px solid #1a4731' }}>
                <div style={{ padding: '16px 24px', borderRight: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div className="ldg-avatar" style={{ width: 48, height: 48, fontSize: 18 }}>{initials(ledger.member.name)}</div>
                  <div>
                    <div style={{ fontSize: 17, fontWeight: 700 }}>{ledger.member.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>
                      <span style={{ marginRight: 12 }}>🪪 {ledger.member.memberId}</span>
                      <span>📱 {ledger.member.mobile || '–'}</span>
                    </div>
                  </div>
                </div>
                <div style={{ padding: '16px 24px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8 }}>
                    {[
                      ['Period', `${from} → ${to}`],
                      ['Entries', ledger.rows.length],
                      ['Opening Bal.', fmtBal(ledger.openingBalance)],
                      ['Closing Bal.', fmtBal(ledger.closingBalance)],
                    ].map(([k, v]) => (
                      <div key={k} style={{ textAlign: 'center', background: '#f9fafb', borderRadius: 8, padding: '8px 6px' }}>
                        <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 3 }}>{k}</div>
                        <div style={{ fontSize: 12, fontWeight: 700 }}>{v}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* ── Summary KPIs ── */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 0, borderBottom: '1px solid #e5e7eb' }}>
                {[
                  ['Total Loan Issued', fmt(ledger.rows.reduce((s,r)=>s+(r.type==='loan'?r.debit:0),0)), '#b91c1c'],
                  ['Total Collected', fmt(ledger.rows.reduce((s,r)=>s+(r.type==='collection'?r.credit:0),0)), '#15803d'],
                  ['Fees / Deductions', fmt(ledger.rows.reduce((s,r)=>s+(r.type==='fee'||r.type==='deduction'?r.credit:0),0)), '#92400e'],
                  ['Outstanding', fmtBal(ledger.closingBalance), ledger.closingBalance > 0 ? '#b91c1c' : '#15803d'],
                ].map(([label, val, col], i) => (
                  <div key={label} style={{ padding: '14px 20px', borderRight: i < 3 ? '1px solid #e5e7eb' : 'none', textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: col, fontFamily: 'var(--mono)' }}>{val}</div>
                  </div>
                ))}
              </div>

              {/* ── Ledger Table ── */}
              <div style={{ overflowX: 'auto' }}>
                {ledger.rows.length === 0 ? (
                  <div style={{ padding: 48, textAlign: 'center' }}>
                    <div style={{ fontSize: 36, marginBottom: 10 }}>📭</div>
                    <p className="muted">No transactions found for this period.</p>
                    <p className="muted" style={{ fontSize: 12 }}>Try changing the date range above.</p>
                  </div>
                ) : (
                  <table className="ldg-table">
                    <thead>
                      <tr>
                        <th style={{ width: 40 }}>Sl</th>
                        <th style={{ width: 105 }}>Date</th>
                        <th style={{ width: 120 }}>Doc No.</th>
                        <th style={{ width: 120 }}>Bill No.</th>
                        <th>Transaction Details</th>
                        <th className="r" style={{ width: 125 }}>Debit (₹)</th>
                        <th className="r" style={{ width: 125 }}>Credit (₹)</th>
                        <th className="r" style={{ width: 135 }}>Balance (₹)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Opening balance row */}
                      <tr>
                        <td colSpan={5} style={{ fontWeight: 700, background: '#f0fdf4', fontSize: 13, color: '#1a4731' }}>
                          ↳ Opening Balance b/f
                        </td>
                        <td className="r" style={{ background: '#f0fdf4', color: 'var(--muted)' }}>–</td>
                        <td className="r" style={{ background: '#f0fdf4', color: 'var(--muted)' }}>–</td>
                        <td className="r" style={{ fontWeight: 700, background: '#f0fdf4', color: ledger.openingBalance > 0 ? '#b91c1c' : '#15803d' }}>
                          {fmtBal(ledger.openingBalance)}
                        </td>
                      </tr>

                      {ledger.rows.map(r => (
                        <tr key={r.sl}>
                          <td style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>{r.sl}</td>
                          <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{r.date}</td>
                          <td style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)' }}>{r.docNo}</td>
                          <td style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)' }}>{r.billNo}</td>
                          <td>
                            <span style={{ fontSize: 13 }}>{r.details}</span>
                            {r.type === 'loan' && <span style={{ marginLeft: 6, fontSize: 11, background: '#fee2e2', color: '#b91c1c', borderRadius: 4, padding: '1px 6px', fontWeight: 600 }}>LOAN</span>}
                            {r.type === 'collection' && <span style={{ marginLeft: 6, fontSize: 11, background: '#dcfce7', color: '#15803d', borderRadius: 4, padding: '1px 6px', fontWeight: 600 }}>PAYMENT</span>}
                            {r.type === 'fee' && <span style={{ marginLeft: 6, fontSize: 11, background: '#fef3c7', color: '#92400e', borderRadius: 4, padding: '1px 6px', fontWeight: 600 }}>FEE</span>}
                            {r.type === 'deduction' && <span style={{ marginLeft: 6, fontSize: 11, background: '#fef3c7', color: '#92400e', borderRadius: 4, padding: '1px 6px', fontWeight: 600 }}>DEDUCTION</span>}
                          </td>
                          <td className="r" style={{ fontFamily: 'var(--mono)', color: r.debit > 0 ? '#b91c1c' : 'var(--muted)', fontWeight: r.debit > 0 ? 700 : 400 }}>
                            {r.debit > 0 ? fmt(r.debit) : '–'}
                          </td>
                          <td className="r" style={{ fontFamily: 'var(--mono)', color: r.credit > 0 ? '#15803d' : 'var(--muted)', fontWeight: r.credit > 0 ? 700 : 400 }}>
                            {r.credit > 0 ? fmt(r.credit) : '–'}
                          </td>
                          <td className="r" style={{ fontFamily: 'var(--mono)', fontWeight: 700, color: r.balance > 0 ? '#b91c1c' : '#15803d' }}>
                            {fmtBal(r.balance)}
                          </td>
                        </tr>
                      ))}

                      {/* Grand Total row */}
                      <tr style={{ background: '#1a4731', color: '#fff' }}>
                        <td colSpan={5} style={{ fontWeight: 700, fontSize: 13 }}>Grand Total</td>
                        <td className="r" style={{ fontFamily: 'var(--mono)', fontWeight: 700 }}>
                          {fmt(ledger.rows.reduce((s, r) => s + r.debit, 0))}
                        </td>
                        <td className="r" style={{ fontFamily: 'var(--mono)', fontWeight: 700 }}>
                          {fmt(ledger.rows.reduce((s, r) => s + r.credit, 0))}
                        </td>
                        <td className="r" style={{ fontFamily: 'var(--mono)', fontWeight: 800 }}>
                          {fmtBal(ledger.closingBalance)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                )}
              </div>

              {/* ── Footer ── */}
              <div style={{ padding: '10px 24px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--muted)', background: '#f9fafb' }}>
                <span>Generated: {new Date().toLocaleString('en-IN')}</span>
                <span>Mahalaxmi Co-Operative Society Ltd · Confidential</span>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}
