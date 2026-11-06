import { useNavigate, useSearchParams } from 'react-router-dom';
import { useState } from 'react';
import { api } from './api.js';

export default function Login() {
  const nav = useNavigate();
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState(searchParams.get('mode') === 'collector' ? 'collector' : 'admin');
  const [step, setStep] = useState('login'); // 'login' | 'otp' | 'otp-verify' | 'set-password'
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function switchMode(m) {
    setMode(m);
    setStep('login');
    setMobile(''); setPassword(''); setOtp('');
    setNewPass(''); setConfirmPass('');
    setError('');
  }

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await api.login(mobile, password);
      localStorage.setItem('mlc_user', JSON.stringify(user));
      nav(user.role === 'admin' ? '/admin' : '/app');
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleSendOtp(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.sendOtp(mobile);
      if (res.otp) setOtp(res.otp); // auto-fill dummy OTP
      setStep('otp-verify');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.verifyOtp(mobile, otp);
      setStep('set-password');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSetPassword(e) {
    e.preventDefault();
    setError('');
    if (newPass !== confirmPass) return setError('Passwords do not match');
    if (newPass.length < 6) return setError('Password must be at least 6 characters');
    setLoading(true);
    try {
      const user = await api.setPassword(mobile, otp, newPass);
      localStorage.setItem('mlc_user', JSON.stringify(user));
      nav('/app');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const errBox = error && (
    <div style={{ color: 'var(--red-tx)', background: 'var(--red-bg)', padding: '10px 14px', borderRadius: 10, marginBottom: 14, fontSize: 14 }}>
      {error}
    </div>
  );

  return (
    <div className="login-wrap">
      <div className="login-top">
        <div className="logo-m" style={{ width: 104, height: 104, borderRadius: 30, fontSize: 52 }}>M</div>
        <h1>Mahalaxmi Co-Operative Society Ltd</h1>
        <p>Daily loan collection · {searchParams.get('mode') === 'admin' ? 'Admin' : 'Field app'}</p>
      </div>

      <div className="login-right">
        {!searchParams.get('mode') && (
          <div className="toggle2" style={{ marginBottom: 20 }}>
            <button type="button" className={mode === 'admin' ? 'on' : ''} onClick={() => switchMode('admin')}>Admin</button>
            <button type="button" className={mode === 'collector' ? 'on' : ''} onClick={() => switchMode('collector')}>Collector</button>
          </div>
        )}

        {/* ── Admin login ── */}
        {mode === 'admin' && (
          <form className="login-card" onSubmit={handleLogin}>
            <h2>Admin sign in</h2>
            {errBox}
            <div className="field">
              <label>User ID</label>
              <input className="input mono" value={mobile} onChange={e => setMobile(e.target.value)} placeholder="e.g. ADM-001" required />
            </div>
            <div className="field">
              <label>Password</label>
              <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            <button className="btn block" style={{ padding: 22, fontSize: 18 }} disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        )}

        {/* ── Collector: normal login ── */}
        {mode === 'collector' && step === 'login' && (
          <form className="login-card" onSubmit={handleLogin}>
            <h2>Collector sign in</h2>
            {errBox}
            <div className="field">
              <label>Mobile number</label>
              <input className="input mono" value={mobile} onChange={e => setMobile(e.target.value)} placeholder="e.g. 99001 23456" required />
            </div>
            <div className="field">
              <label>Password</label>
              <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            <button className="btn block" style={{ padding: 22, fontSize: 18 }} disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
            <div style={{ marginTop: 16, textAlign: 'center' }}>
              <span className="muted" style={{ fontSize: 14 }}>First time? </span>
              <button type="button" className="link" style={{ fontSize: 14, background: 'none', border: 0, padding: 0 }}
                onClick={() => { setStep('otp'); setError(''); }}>
                Set up password via OTP
              </button>
            </div>
          </form>
        )}

        {/* ── Collector: enter mobile to send OTP ── */}
        {mode === 'collector' && step === 'otp' && (
          <form className="login-card" onSubmit={handleSendOtp}>
            <h2>Verify mobile</h2>
            <p className="muted" style={{ fontSize: 14, marginBottom: 18 }}>Enter your registered mobile number to receive an OTP.</p>
            {errBox}
            <div className="field">
              <label>Mobile number</label>
              <input className="input mono" value={mobile} onChange={e => setMobile(e.target.value)} placeholder="e.g. 99001 23456" required />
            </div>
            <button className="btn block" style={{ padding: 18, fontSize: 16 }} disabled={loading}>
              {loading ? 'Sending…' : 'Send OTP'}
            </button>
            <div style={{ marginTop: 14, textAlign: 'center' }}>
              <button type="button" className="link" style={{ fontSize: 14, background: 'none', border: 0, padding: 0 }}
                onClick={() => { setStep('login'); setOtp(''); setError(''); }}>
                ← Back to sign in
              </button>
            </div>
          </form>
        )}

        {/* ── Collector: enter OTP ── */}
        {mode === 'collector' && step === 'otp-verify' && (
          <form className="login-card" onSubmit={handleVerifyOtp}>
            <h2>Enter OTP</h2>
            <p className="muted" style={{ fontSize: 14, marginBottom: 18 }}>OTP sent to {mobile}. Use <strong>123456</strong> as the OTP.</p>
            {errBox}
            <div className="field">
              <label>OTP</label>
              <input className="input mono" value={otp} onChange={e => setOtp(e.target.value)} placeholder="6-digit OTP" maxLength={6} required autoFocus />
            </div>
            <button className="btn block" style={{ padding: 18, fontSize: 16 }} disabled={loading}>
              {loading ? 'Verifying…' : 'Verify OTP'}
            </button>
            <div style={{ marginTop: 14, textAlign: 'center' }}>
              <button type="button" className="link" style={{ fontSize: 14, background: 'none', border: 0, padding: 0 }}
                onClick={() => { setStep('otp'); setOtp(''); setError(''); }}>
                ← Resend OTP
              </button>
            </div>
          </form>
        )}

        {/* ── Collector: set password step ── */}
        {mode === 'collector' && step === 'set-password' && (
          <form className="login-card" onSubmit={handleSetPassword}>
            <h2>Set your password</h2>
            <p className="muted" style={{ fontSize: 14, marginBottom: 18 }}>Choose a password you'll use to sign in from next time.</p>
            {errBox}
            <div className="field">
              <label>New password</label>
              <input className="input" type="password" value={newPass} onChange={e => setNewPass(e.target.value)} placeholder="Min. 6 characters" required />
            </div>
            <div className="field">
              <label>Confirm password</label>
              <input className="input" type="password" value={confirmPass} onChange={e => setConfirmPass(e.target.value)} required />
            </div>
            <button className="btn block" style={{ padding: 18, fontSize: 16 }} disabled={loading}>
              {loading ? 'Saving…' : 'Set password & sign in'}
            </button>
          </form>
        )}

        <div className="powered">Powered by Crinsun Technologies</div>
      </div>
    </div>
  );
}
