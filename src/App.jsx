import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';
import Login from './Login.jsx';
import BorrowerLogin from './BorrowerLogin.jsx';
import BorrowerDashboard from './BorrowerDashboard.jsx';
import CollectorLayout from './collector/CollectorLayout.jsx';
import {
  Home, Collect, Customer, Record, LoanAccount, Deposit, Targets,
  LoanCollection, NewMemberForm, LoanApplicationForm,
} from './collector/Screens.jsx';
import { Defaulters } from './collector/DefaultersScreen.jsx';
import AdminLayout from './admin/AdminLayout.jsx';
import {
  Dashboard, Alerts, CustomerProfile, MemberDetail, OpenLoan, CollectionGrid,
  DepositVerification, Settings, CollectorTargets,
  LoanApplications, ApplicationDetail,
} from './admin/Screens.jsx';
import { Reports } from './admin/ReportsScreen.jsx';
import { SanctionLetters } from './admin/SanctionLetters.jsx';

function RequireAdmin({ children }) {
  const user = JSON.parse(localStorage.getItem('mlc_user') || 'null');
  if (!user || user.role !== 'admin') return <Navigate to="/login?mode=admin" replace />;
  return children;
}

function RequireCollector({ children }) {
  const user = JSON.parse(localStorage.getItem('mlc_user') || 'null');
  if (!user || user.role !== 'collector') return <Navigate to="/login?mode=collector" replace />;
  return children;
}

function SignInDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const nav = useNavigate();

  useEffect(() => {
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const items = [
    { icon: '📱', label: 'Collector App',   sub: 'Phone · Field use',        route: '/login?mode=collector' },
    { icon: '🖥️', label: 'Admin Portal',    sub: 'Desktop · Management',     route: '/login?mode=admin' },
    { icon: '🏦', label: 'Borrower Portal', sub: 'Track your loan & payments', route: '/borrower/login' },
  ];

  return (
    <div className="signin-dd" ref={ref}>
      <button className="btn gold" onClick={() => setOpen(o => !o)}>Sign In ▾</button>
      {open && (
        <div className="dd-menu">
          {items.map(it => (
            <button key={it.label} onClick={() => { nav(it.route); setOpen(false); }}>
              <span className="dd-icon">{it.icon}</span>
              <span><b>{it.label}</b><small>{it.sub}</small></span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const FEATURES = [
  { icon: '📱', title: 'Field Collection App',  desc: 'Collectors record daily EMI payments on-the-go with instant sync to the server.' },
  { icon: '🖥️', title: 'Admin Dashboard',       desc: 'Full visibility into loans, collections, deposits, and collector performance.' },
  { icon: '📊', title: 'Live Analytics',         desc: 'Track daily targets, overdue accounts, and collection trends in real time.' },
  { icon: '🔒', title: 'Secure & Role-Based',    desc: 'Separate portals for admins and field collectors with JWT-secured access.' },
  { icon: '💰', title: 'Deposit Verification',   desc: 'Admins verify and approve cash deposits submitted by collectors each day.' },
  { icon: '🎯', title: 'Target Management',      desc: 'Set monthly collection targets per collector and monitor progress live.' },
];

const STATS = [
  { value: '100%',      label: 'Digital Records' },
  { value: 'Daily',     label: 'EMI Tracking' },
  { value: 'Real-Time', label: 'Sync & Alerts' },
  { value: 'Secure',    label: 'JWT Auth' },
];

const PORTALS = [
  {
    icon: '📱', title: 'Collector App',
    desc: 'Built for field agents. Record collections, view loan accounts, and submit deposits — all from your phone.',
    btn: 'Open Collector App', route: '/login?mode=collector',
    style: { background: 'linear-gradient(135deg,#1a5c35,#0f3d22)', border: '1px solid rgba(255,255,255,.12)' },
    btnStyle: null,
  },
  {
    icon: '🖥️', title: 'Admin Portal',
    desc: 'Full management suite for supervisors. Monitor collectors, verify deposits, manage loans and targets.',
    btn: 'Open Admin Portal', route: '/login?mode=admin',
    style: { background: 'linear-gradient(135deg,#0b2e1f,#071a10)', border: '1px solid rgba(217,160,46,.2)' },
    btnStyle: { background: 'rgba(217,160,46,.15)', color: '#D9A02E', border: '1px solid rgba(217,160,46,.35)' },
  },
  {
    icon: '🏦', title: 'Borrower Portal',
    desc: "Check your loan status, view how much you've paid, and track your pending balance anytime.",
    btn: 'View My Loan', route: '/borrower/login',
    style: { background: 'linear-gradient(135deg,#1a3a5c,#0d2240)', border: '1px solid rgba(217,160,46,.2)' },
    btnStyle: { background: 'rgba(217,160,46,.15)', color: '#D9A02E', border: '1px solid rgba(217,160,46,.35)' },
  },
];

function Launcher() {
  const nav = useNavigate();
  return (
    <div className="home-wrap">

      {/* Navbar */}
      <nav className="home-nav">
        <div className="home-nav-brand">
          <div className="logo-m sm">M</div>
          <div>
            <b>MLC</b>
            <small>Maha Laxmi Collect</small>
          </div>
        </div>
        <div className="home-nav-right">
          <span className="home-nav-tagline">Daily Loan Collection Platform</span>
          <SignInDropdown />
        </div>
      </nav>

      {/* Hero */}
      <section className="home-hero">
        <div className="hero-bg-circles" aria-hidden="true"><span /><span /><span /></div>
        <div className="home-hero-inner">
          <div className="hero-badge">🏦 Mahalaxmi Co-Operative Society Ltd</div>
          <div className="logo-m hero-logo">M</div>
          <h1 className="home-title">MLC – Maha Laxmi Collect</h1>
          <p className="home-sub">Daily Loan Collection · Field &amp; Admin Platform</p>
          <div className="hero-cta">
            <button className="btn gold hero-btn"         onClick={() => nav('/login?mode=collector')}>📱 Collector App</button>
            <button className="btn hero-btn-outline"      onClick={() => nav('/login?mode=admin')}>🖥️ Admin Portal</button>
            <button className="btn hero-btn-outline"      onClick={() => nav('/borrower/login')}>🏦 My Loan</button>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <div className="home-stats">
        {STATS.map(s => (
          <div key={s.label} className="home-stat">
            <b>{s.value}</b>
            <span>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Features */}
      <section className="home-features">
        <div className="home-features-inner">
          <p className="home-section-label">Platform Features</p>
          <h2 className="home-section-title">Everything you need to manage daily collections</h2>
          <div className="features-grid">
            {FEATURES.map(f => (
              <div key={f.title} className="feature-card">
                <div className="feature-icon">{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Portal cards */}
      <section className="home-portals">
        {PORTALS.map(p => (
          <div key={p.title} className="portal-card" style={p.style}>
            <div className="portal-icon">{p.icon}</div>
            <h3>{p.title}</h3>
            <p>{p.desc}</p>
            <button
              className="btn portal-btn"
              style={p.btnStyle || {}}
              onClick={() => nav(p.route)}
            >
              {p.btn}
            </button>
          </div>
        ))}
      </section>

      {/* Footer */}
      <footer className="home-footer">
        <div className="home-footer-brand">
          <div className="logo-m sm">M</div>
          <span><b>MLC</b> – Maha Laxmi Collect</span>
        </div>
        <p>Powered by <b>Crinsun Technologies</b></p>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Launcher />} />
      <Route path="/login" element={<Login />} />
      <Route path="/borrower/login" element={<BorrowerLogin />} />
      <Route path="/borrower/dashboard" element={<BorrowerDashboard />} />

      <Route path="/app" element={<RequireCollector><CollectorLayout /></RequireCollector>}>
        <Route index element={<Home />} />
        <Route path="collect" element={<Collect />} />
        <Route path="customers" element={<Customer />} />
        <Route path="record" element={<Record />} />
        <Route path="loan" element={<LoanAccount />} />
        <Route path="deposit" element={<Deposit />} />
        <Route path="targets" element={<Targets />} />
        <Route path="loan-collection" element={<LoanCollection />} />
        <Route path="loan-collection/new-member" element={<NewMemberForm />} />
        <Route path="loan-collection/apply/:memberId" element={<LoanApplicationForm />} />
        <Route path="defaulters" element={<Defaulters />} />
      </Route>

      <Route path="/admin" element={<RequireAdmin><AdminLayout /></RequireAdmin>}>
        <Route index element={<Dashboard />} />
        <Route path="customers" element={<CustomerProfile />} />
        <Route path="customers/:memberId" element={<MemberDetail />} />
        <Route path="loans" element={<OpenLoan />} />
        <Route path="collections" element={<CollectionGrid />} />
        <Route path="deposits" element={<DepositVerification />} />
        <Route path="targets" element={<CollectorTargets />} />
        <Route path="alerts" element={<Alerts />} />
        <Route path="settings" element={<Settings />} />
        <Route path="loan-applications" element={<LoanApplications />} />
        <Route path="loan-applications/:appId" element={<ApplicationDetail />} />
        <Route path="reports" element={<Reports />} />
        <Route path="sanction-letters" element={<SanctionLetters />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
