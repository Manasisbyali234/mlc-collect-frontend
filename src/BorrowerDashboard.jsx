import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from './api.js';

function fmt(n) {
  return '₹' + Number(n || 0).toLocaleString('en-IN');
}

function PaymentHistory({ collections }) {
  const [viewPhoto, setViewPhoto] = useState(null);
  const sorted = [...collections].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  return (
    <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 16, overflow: 'hidden' }}>
      <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--line)', fontWeight: 700, fontSize: 16 }}>
        Payment History
        <span className="muted" style={{ fontSize: 13, fontWeight: 400, marginLeft: 8 }}>({collections.length} payments)</span>
      </div>
      {collections.length === 0 ? (
        <div style={{ padding: '28px 18px', textAlign: 'center', color: 'var(--muted)', fontSize: 15 }}>No payments recorded yet.</div>
      ) : (
        sorted.map((c, i) => (
          <div key={c.id || i} style={{ padding: '13px 18px', borderTop: i === 0 ? 0 : '1px solid var(--line)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{fmt(c.amount)}
                  <span style={{ marginLeft: 10, fontSize: 12, fontWeight: 600, padding: '2px 10px', borderRadius: 20, background: c.mode === 'Cash' ? 'var(--green-bg)' : 'var(--yellow-bg)', color: c.mode === 'Cash' ? 'var(--green-tx)' : 'var(--yellow-tx)' }}>{c.mode || 'Cash'}</span>
                </div>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 3 }}>{c.date || '—'}</div>
                {c.reference && <div style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--mono)', marginTop: 2 }}>Ref: {c.reference}</div>}
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {c.location && (
                  <a href={`https://maps.google.com/?q=${c.location.lat},${c.location.lng}`} target="_blank" rel="noreferrer"
                    style={{ fontSize: 12, color: 'var(--green-tx)', textDecoration: 'none', border: '1px solid var(--green-tx)', borderRadius: 8, padding: '3px 8px' }}>📍 Location</a>
                )}
                {c.photo && (
                  <button onClick={() => setViewPhoto(c.photo)}
                    style={{ fontSize: 12, background: 'none', border: '1px solid var(--line)', borderRadius: 8, padding: '3px 8px', cursor: 'pointer' }}>📷 Photo</button>
                )}
              </div>
            </div>
          </div>
        ))
      )}
      {viewPhoto && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setViewPhoto(null)}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 16, maxWidth: '90vw' }} onClick={e => e.stopPropagation()}>
            <img src={viewPhoto} alt="payment proof" style={{ maxWidth: '80vw', maxHeight: '80vh', borderRadius: 10, display: 'block' }} />
            <button style={{ marginTop: 12, width: '100%', padding: '10px', border: '1px solid var(--line)', borderRadius: 10, cursor: 'pointer', background: '#fff' }} onClick={() => setViewPhoto(null)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function BorrowerDashboard() {
  const nav = useNavigate();
  const borrower = JSON.parse(sessionStorage.getItem('mlc_borrower') || 'null');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!borrower) { nav('/borrower/login'); return; }
    api.getBorrowerDashboard(borrower.appId)
      .then(setData)
      .catch(err => setError(err.message));
  }, []);

  function logout() {
    sessionStorage.removeItem('mlc_borrower');
    nav('/borrower/login');
  }

  if (error) return (
    <div style={{ padding: 40, textAlign: 'center', color: 'var(--red-tx)' }}>
      {error} — <button className="link" onClick={logout} style={{ background: 'none', border: 0, padding: 0 }}>Sign out</button>
    </div>
  );

  if (!data) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>Loading…</div>;

  const paidPct = data.totalDue > 0 ? Math.min(100, Math.round((data.totalPaid / data.totalDue) * 100)) : 0;
  const missedDays = data.missedDays || 0;
  const todayDue = data.todayDue;
  const schedule = data.schedule || [];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Header */}
      <div style={{ background: 'var(--g800)', color: '#fff', padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 14 }}>
        <div className="logo-m sm">M</div>
        <div style={{ flex: 1 }}>
          <b style={{ fontSize: 16 }}>My Loan</b>
          <div style={{ fontSize: 12, color: '#cfe3d9' }}>{data.memberName}</div>
        </div>
        <button onClick={logout} style={{ background: 'rgba(255,255,255,.12)', border: 0, color: '#fff', borderRadius: 10, padding: '8px 16px', fontSize: 14, fontWeight: 600 }}>
          Sign out
        </button>
      </div>

      <div style={{ maxWidth: 600, margin: '0 auto', padding: '24px 16px 60px' }}>

        {/* App ID + Status */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <span className="muted" style={{ fontFamily: 'var(--mono)', fontSize: 14 }}>{data.appId}</span>
          <span className={`pill ${data.status === 'Disbursed' ? 'green' : data.status === 'Approved' ? 'yellow' : 'grey'}`}>
            {data.status}
          </span>
        </div>

        {/* Today's due */}
        {todayDue && (
          <div style={{ background: todayDue.status === 'Paid' ? 'var(--green-bg)' : 'var(--yellow-bg)', border: '1.5px solid', borderColor: todayDue.status === 'Paid' ? 'var(--green-tx)' : 'var(--yellow-tx)', borderRadius: 14, padding: '14px 18px', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>Today's Daily EMI</div>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 3 }}>Day {todayDue.day} of {schedule.length}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 22, fontWeight: 700 }}>{fmt(todayDue.due)}</div>
              <div style={{ fontSize: 12, marginTop: 2 }}>{todayDue.status === 'Paid' ? '✓ Paid' : '⏳ Due today'}</div>
            </div>
          </div>
        )}

        {/* Missed days warning */}
        {missedDays > 0 && (
          <div style={{ background: 'var(--red-bg)', border: '1.5px solid var(--red-tx)', borderRadius: 14, padding: '10px 18px', marginBottom: 20, fontSize: 14, color: 'var(--red-tx)', fontWeight: 600 }}>
            ⚠ {missedDays} missed payment{missedDays > 1 ? 's' : ''} — Rs.{missedDays * (data.dailyEmi || 100)} overdue
          </div>
        )}

        {/* Summary cards */}
        <div className="borrower-summary-grid">
          <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 16, padding: 16 }}>
            <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em' }}>Amount Received</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 22, fontWeight: 700, marginTop: 6 }}>{fmt(data.netDisbursalAmount || data.loanAmount)}</div>
            {data.netDisbursalAmount && data.netDisbursalAmount !== data.loanAmount && (
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>Sanctioned: {fmt(data.loanAmount)} &minus; Fee: {fmt(Number(data.loanAmount) - Number(data.netDisbursalAmount))}</div>
            )}
          </div>
          <div style={{ background: 'var(--green-bg)', border: '1px solid var(--line)', borderRadius: 16, padding: 16 }}>
            <div style={{ fontSize: 12, color: 'var(--green-tx)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em' }}>Paid</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 22, fontWeight: 700, color: 'var(--green-tx)', marginTop: 6 }}>{fmt(data.totalPaid)}</div>
          </div>
          <div style={{ background: data.pending > 0 ? 'var(--red-bg)' : 'var(--green-bg)', border: '1px solid var(--line)', borderRadius: 16, padding: 16 }}>
            <div style={{ fontSize: 12, color: data.pending > 0 ? 'var(--red-tx)' : 'var(--green-tx)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em' }}>Pending</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 22, fontWeight: 700, color: data.pending > 0 ? 'var(--red-tx)' : 'var(--green-tx)', marginTop: 6 }}>{fmt(data.pending)}</div>
          </div>
        </div>

        {/* Penalty banner */}
        {data.penalty > 0 && (
          <div style={{ background: 'var(--red-bg)', border: '1.5px solid var(--red-tx)', borderRadius: 14, padding: '14px 18px', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 700, color: 'var(--red-tx)', fontSize: 15 }}>⚠ Overdue Penalty (3% per day)</div>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 3 }}>Total payable including penalty</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 18, fontWeight: 700, color: 'var(--red-tx)' }}>+{fmt(data.penalty)}</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 14, fontWeight: 700, marginTop: 2 }}>Total: {fmt(data.totalPayable)}</div>
            </div>
          </div>
        )}

        {/* Progress bar */}
        <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 16, padding: 18, marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: 14, fontWeight: 600 }}>
            <span>Repayment Progress</span>
            <span style={{ color: 'var(--g700)', fontFamily: 'var(--mono)' }}>{paidPct}%</span>
          </div>
          <div className="bar" style={{ height: 12 }}>
            <i className="green" style={{ width: paidPct + '%' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 13, color: 'var(--muted)' }}>
            <span>Paid: {fmt(data.totalPaid)}</span>
            <span>Total Due: {fmt(data.totalDue)}</span>
          </div>
        </div>

        {/* Daily schedule */}
        {schedule.length > 0 && (
          <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 16, overflow: 'hidden', marginTop: 20 }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--line)', fontWeight: 700, fontSize: 16 }}>
              Daily Payment Schedule
              <span className='muted' style={{ fontSize: 13, fontWeight: 400, marginLeft: 8 }}>Rs.100/day</span>
            </div>
            <div style={{ maxHeight: 320, overflowY: 'auto' }}>
              {schedule.map((s, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 18px', borderTop: i === 0 ? 0 : '1px solid var(--line)', background: s.status === 'Missed' ? 'var(--red-bg)' : 'transparent' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>Day {s.day} &nbsp;<span className='muted' style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{s.date}</span></div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 14 }}>{fmt(s.due)}</span>
                    <span className={`pill ${s.status === 'Paid' ? 'green' : s.status === 'Missed' ? 'red' : 'grey'}`}>{s.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Payment history */}
        <PaymentHistory collections={data.collections} />
      </div>
    </div>
  );
}
