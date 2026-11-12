import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from './api.js';

export default function BorrowerLogin() {
  const nav = useNavigate();
  const [appId, setAppId] = useState('');
  const [mobile, setMobile] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await api.borrowerLogin(appId.trim(), mobile.trim());
      sessionStorage.setItem('mlc_borrower', JSON.stringify(user));
      nav(`/borrower/dashboard`);
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-wrap">
      <div className="login-top">
        <div className="logo-m" style={{ width: 104, height: 104, borderRadius: 30, fontSize: 52 }}>M</div>
        <h1>Mahalaxmi Co-Operative Society Ltd</h1>
        <p>Track your loan · Payments &amp; balance</p>
      </div>
      <div className="login-right">
        <form className="login-card" onSubmit={handleLogin}>
          <h2>Borrower sign in</h2>
          <p className="muted" style={{ fontSize: 14, marginBottom: 18 }}>
            Enter your Application ID and registered mobile number to view your loan details.
          </p>
          {error && (
            <div style={{ color: 'var(--red-tx)', background: 'var(--red-bg)', padding: '10px 14px', borderRadius: 10, marginBottom: 14, fontSize: 14 }}>
              {error}
            </div>
          )}
          <div className="field">
            <label>Application ID</label>
            <input className="input mono" value={appId} onChange={e => setAppId(e.target.value)} placeholder="e.g. APP-XXXXXX" required />
          </div>
          <div className="field">
            <label>Registered Mobile Number</label>
            <input className="input mono" value={mobile} onChange={e => setMobile(e.target.value)} placeholder="e.g. 99001 23456" required />
          </div>
          <button className="btn block" style={{ padding: 22, fontSize: 18 }} disabled={loading}>
            {loading ? 'Signing in...' : 'View My Loan'}
          </button>
        </form>
        <div className="powered">Powered by Crinsun Technologies</div>
      </div>
    </div>
  );
}
