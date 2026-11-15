import { useState, useEffect } from 'react';
import { api } from '../api.js';

export function NPAList() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const user = JSON.parse(localStorage.getItem('mlc_user') || '{"name":"Collector","id":"COL-001"}');

  useEffect(() => {
    api.getCollectorNPA(user.id)
      .then(setList)
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  }, []);

  function downloadCSV() {
    const headers = ['#', 'Member Name', 'Member ID', 'App ID', 'Mobile', 'Loan Amount', 'Disbursal Date', 'Missed Days', 'Pending Amount', 'NPA Date', 'Status'];
    const rows = list.map((a, i) => [
      i + 1, a.memberName, a.memberId, a.appId, a.mobile || '',
      a.loanAmount, a.disbursalDate || '', a.missedStreak || '',
      a.pendingAmount || '', a.npaDate || '', a.status,
    ]);
    const csv = [headers, ...rows]
      .map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `npa_list_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>NPA List</h1>
          <p>Loans not paid on time (Non-Performing Assets)</p>
        </div>
        {list.length > 0 && (
          <div className="right">
            <button className="btn sm outline" onClick={downloadCSV}>⬇ Download CSV</button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="panel pad" style={{ textAlign: 'center', padding: 48 }}>
          <p className="muted">Loading</p>
        </div>
      ) : list.length === 0 ? (
        <div className="panel pad" style={{ textAlign: 'center', padding: 48 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
          <p style={{ fontWeight: 700, fontSize: 18 }}>No NPA accounts!</p>
          <p className="muted">All your loans are being paid on time.</p>
        </div>
      ) : (
        <>
          <div className="panel pad" style={{ marginBottom: 18, background: 'var(--red-bg)', borderColor: 'var(--red-tx)' }}>
            <span style={{ fontWeight: 700, color: 'var(--red-tx)', fontSize: 16 }}>
              ⚠️ {list.length} NPA loan{list.length > 1 ? 's' : ''} — not paid on time
            </span>
          </div>
          <div className="panel scroll-x">
            <table className="dtable">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Member</th>
                  <th>Mobile</th>
                  <th>App ID</th>
                  <th className="r">Loan Amount</th>
                  <th>Disbursal Date</th>
                  <th className="r">Missed Days</th>
                  <th className="r">Pending</th>
                  <th>NPA Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {list.map((a, i) => (
                  <tr key={a.appId} style={{ background: 'var(--red-bg)' }}>
                    <td className="muted" style={{ fontSize: 13 }}>{i + 1}</td>
                    <td>
                      <b>{a.memberName}</b>
                      <div className="muted" style={{ fontSize: 12 }}>{a.memberId}</div>
                    </td>
                    <td className="mono">{a.mobile || '–'}</td>
                    <td className="mono" style={{ fontSize: 12 }}>{a.appId}</td>
                    <td className="r mono">₹{Number(a.loanAmount).toLocaleString('en-IN')}</td>
                    <td className="mono" style={{ fontSize: 12 }}>{a.disbursalDate || '–'}</td>
                    <td className="r mono" style={{ color: 'var(--red-tx)', fontWeight: 700 }}>
                      {a.missedStreak > 0 ? `${a.missedStreak} streak` : '–'}
                      {a.totalMissed > 0 && a.totalMissed !== a.missedStreak
                        ? <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 400 }}>{a.totalMissed} total</div>
                        : null}
                    </td>
                    <td className="r mono" style={{ color: 'var(--red-tx)', fontWeight: 700 }}>
                      {a.pendingAmount != null ? `₹${Number(a.pendingAmount).toLocaleString('en-IN')}` : '–'}
                    </td>
                    <td className="mono" style={{ fontSize: 12 }}>{a.npaDate || '–'}</td>
                    <td><span className="pill red">{a.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
