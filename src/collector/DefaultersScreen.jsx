import { useState, useEffect } from 'react';
import { api } from '../api.js';

export function Defaulters() {
  const [defaulters, setDefaulters] = useState([]);
  const [loading, setLoading] = useState(true);
  const user = JSON.parse(localStorage.getItem('mlc_user') || '{"name":"Collector","id":"COL-001"}');
  const todayKey = new Date().toLocaleDateString('en-IN');

  useEffect(() => {
    Promise.all([
      api.getApplications({ collectorId: user.id }),
      api.getCollections({ collectorId: user.id, date: todayKey }),
    ]).then(([apps, cols]) => {
      const paidSet = new Set(cols.map(c => c.appId));
      const unpaid = apps.filter(a => ['Disbursed', 'Approved'].includes(a.status) && !paidSet.has(a.appId));
      setDefaulters(unpaid);
    }).finally(() => setLoading(false));
  }, []);

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Not Paid Today</h1>
          <p>Members who have not paid ₹100 today · {todayKey}</p>
        </div>
      </div>

      {loading ? (
        <div className="panel pad" style={{ textAlign: 'center', padding: 48 }}>
          <p className="muted">Loading</p>
        </div>
      ) : defaulters.length === 0 ? (
        <div className="panel pad" style={{ textAlign: 'center', padding: 48 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
          <p style={{ fontWeight: 700, fontSize: 18 }}>All members have paid today!</p>
          <p className="muted">No pending collections for {todayKey}.</p>
        </div>
      ) : (
        <>
          <div className="panel pad" style={{ marginBottom: 18, background: 'var(--red-bg)', borderColor: 'var(--red-tx)' }}>
            <span style={{ fontWeight: 700, color: 'var(--red-tx)', fontSize: 16 }}>
              ⚠️ {defaulters.length} member{defaulters.length > 1 ? 's' : ''} have not paid ₹100 today
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
                  <th className="r">Due</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {defaulters.map((a, i) => (
                  <tr key={a.appId} style={{ background: 'var(--red-bg)' }}>
                    <td className="muted" style={{ fontSize: 13 }}>{i + 1}</td>
                    <td>
                      <b>{a.memberName}</b>
                      <div className="muted" style={{ fontSize: 12 }}>{a.memberId}</div>
                    </td>
                    <td className="mono">{a.mobile}</td>
                    <td className="mono" style={{ fontSize: 12 }}>{a.appId}</td>
                    <td className="r mono" style={{ fontWeight: 700, color: 'var(--red-tx)' }}>₹100</td>
                    <td><span className="pill red">Not Paid</span></td>
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
