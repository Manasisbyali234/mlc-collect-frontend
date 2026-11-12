import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';
import Login from './Login.jsx';
import BorrowerLogin from './BorrowerLogin.jsx';
import BorrowerDashboard from './BorrowerDashboard.jsx';
import CollectorLayout from './collector/CollectorLayout.jsx';
import {
  Home, Collect, Customer, Record, LoanAccount, Deposit, DepositHistory, Targets,
  LoanCollection, NewMemberForm, LoanApplicationForm,
} from './collector/Screens.jsx';
import { Defaulters } from './collector/DefaultersScreen.jsx';
import AdminLayout from './admin/AdminLayout.jsx';
import SubAdminLayout from './admin/SubAdminLayout.jsx';
import {
  Dashboard, Alerts, CustomerProfile, MemberDetail, OpenLoan, CollectionGrid,
  DepositVerification, Settings, CollectorTargets,
  LoanApplications, ApplicationDetail, MissedEmi,
} from './admin/Screens.jsx';
import { Reports } from './admin/ReportsScreen.jsx';
import { SanctionLetters } from './admin/SanctionLetters.jsx';
import { EmployeeLedger } from './admin/EmployeeLedger.jsx';

function RequireAdmin({ children }) {
  const user = JSON.parse(localStorage.getItem('mlc_user') || 'null');
  if (!user || user.role !== 'admin') return <Navigate to="/login?mode=admin" replace />;
  return children;
}

function RequireSubAdmin({ children }) {
  const user = JSON.parse(localStorage.getItem('mlc_user') || 'null');
  if (!user || user.role !== 'subadmin') return <Navigate to="/login?mode=subadmin" replace />;
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
    { icon: '🏛️', label: 'Admin', sub: 'Full platform control', route: '/login?mode=admin' },
    { icon: '🛡️', label: 'Sub Admin', sub: 'Limited admin access', route: '/login?mode=subadmin' },
    { icon: '📱', label: 'Collector', sub: 'Field agent app', route: '/login?mode=collector' },
    { icon: '🏠', label: 'Borrower', sub: 'Check your loan & EMIs', route: '/borrower/login' },
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

function PortalCards() {
  const nav = useNavigate();
  const portals = [
    { icon: '🏛️', title: 'Admin', sub: 'Full platform control', desc: 'Manage collectors, verify deposits, view reports and dashboards.', route: '/login?mode=admin', style: { background: 'linear-gradient(135deg, rgba(217,160,46,.18) 0%, rgba(217,160,46,.06) 100%)', border: '1px solid rgba(217,160,46,.3)' }, btnClass: 'btn gold portal-btn' },
    { icon: '🛡️', title: 'Sub Admin', sub: 'Limited admin access', desc: 'View collections, loans, and reports without full admin rights.', route: '/login?mode=subadmin', style: { background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.12)' }, btnClass: 'btn hero-btn-outline portal-btn' },
    { icon: '📱', title: 'Collector', sub: 'Field agent app', desc: 'Record daily EMI payments, submit deposits, and track your route.', route: '/login?mode=collector', style: { background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.12)' }, btnClass: 'btn hero-btn-outline portal-btn' },
    { icon: '🏠', title: 'Borrower', sub: 'Check your loan & EMIs', desc: 'View your loan details, EMI schedule, payment history and outstanding balance.', route: '/borrower/login', style: { background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.12)' }, btnClass: 'btn hero-btn-outline portal-btn' },
  ];
  return (
    <div className="home-portals" id="portals">
      {portals.map(p => (
        <div key={p.title} className="portal-card" style={p.style}>
          <div className="portal-icon">{p.icon}</div>
          <div>
            <h3>{p.title}</h3>
            <div style={{ fontSize: 13, color: '#D9A02E', fontWeight: 600, marginBottom: 8 }}>{p.sub}</div>
          </div>
          <p>{p.desc}</p>
          <button className={p.btnClass} onClick={() => nav(p.route)}>Sign In →</button>
        </div>
      ))}
    </div>
  );
}

const FEATURES = [
  { icon: '📋', title: 'Daily EMI Collection',   desc: 'Field agents record cash & UPI payments on-the-go with GPS tagging and photo proof.' },
  { icon: '📊', title: 'Live Dashboard',          desc: 'Real-time visibility into collections, pending dues, and collector performance.' },
  { icon: '💰', title: 'Deposit Management',      desc: 'Collectors submit daily cash deposits; admins verify and approve with one click.' },
  { icon: '⚠️', title: 'Defaulter Tracking',      desc: 'Automatically flags missed EMIs and overdue accounts for immediate follow-up.' },
  { icon: '🎯', title: 'Target & Incentives',     desc: 'Set monthly collection targets per collector and track progress in real time.' },
  { icon: '📄', title: 'Sanction Letters & Reports', desc: 'Generate loan sanction letters and export collection reports instantly.' },
];

const STATS = [
  { value: 'Secure', label: 'Role-Based Access' },
  { value: '100%', label: 'Digital Records' },
  { value: 'Daily', label: 'EMI Tracking' },
  { value: 'Live', label: 'Sync & Alerts' },
];

function Launcher() {
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
        <div className="hero-bg-circles" aria-hidden="true"><span /><span /><span /><span /></div>
        <div className="home-hero-inner">
          <div className="hero-badge">🏦 Mahalaxmi Co-Operative Society Ltd</div>
          <div className="hero-emblem" aria-hidden="true">
            <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
              <rect width="64" height="64" rx="18" fill="#D9A02E"/>
              <text x="32" y="46" textAnchor="middle" fontFamily="system-ui,sans-serif" fontWeight="800" fontSize="36" fill="#0b382a">M</text>
            </svg>
          </div>
          <h1 className="home-title">
            Smarter Daily<br />
            <span className="hero-highlight">Loan Collections</span>
          </h1>
          <p className="home-sub">Maha Laxmi Collect — the end-to-end platform for co-operative societies</p>
          <div className="hero-divider" />
          <p className="hero-desc">Digitise every EMI, track every collector, verify every deposit — all in real time. Built exclusively for co-operative societies.</p>
          <div className="hero-signin-wrap">
            <a href="#portals" className="btn gold hero-btn" style={{ textDecoration: 'none' }}>Get Started ↓</a>
          </div>
          <div className="hero-trust">
            <span>🔒 Role-based access</span>
            <span>📡 Real-time sync</span>
            <span>📄 Instant reports</span>
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

      {/* How it works */}
      <section className="home-how">
        <div className="home-features-inner">
          <p className="home-section-label">How It Works</p>
          <h2 className="home-section-title">From field collection to admin approval — all in one place</h2>
          <div className="how-steps">
            {[
              { n: '01', title: 'Collector visits borrower', desc: 'Field agent opens the app, finds the loan account, and records the daily EMI payment.' },
              { n: '02', title: 'Payment is logged instantly', desc: 'Amount, mode, GPS location, and photo proof are saved and synced to the server in real time.' },
              { n: '03', title: 'Admin reviews & verifies', desc: 'Admin sees all collections on the dashboard, verifies cash deposits, and tracks targets.' },
            ].map(s => (
              <div key={s.n} className="how-step">
                <div className="how-num">{s.n}</div>
                <h4>{s.title}</h4>
                <p>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

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

      {/* Portal Sign-In Cards */}
      <section style={{ padding: '72px 0 0', textAlign: 'center' }}>
        <div className="home-features-inner" style={{ padding: '0 40px' }}>
          <p className="home-section-label">Access Your Portal</p>
          <h2 className="home-section-title" style={{ maxWidth: '100%' }}>Sign in to get started</h2>
        </div>
        <PortalCards />
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
        <Route path="deposit-history" element={<DepositHistory />} />
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
        <Route path="missed-emi" element={<MissedEmi />} />
        <Route path="reports" element={<Reports />} />
        <Route path="sanction-letters" element={<SanctionLetters />} />
        <Route path="employee-ledger" element={<EmployeeLedger />} />
      </Route>

      <Route path="/subadmin" element={<RequireSubAdmin><SubAdminLayout /></RequireSubAdmin>}>
        <Route index element={<Dashboard />} />
        <Route path="customers" element={<CustomerProfile />} />
        <Route path="customers/:memberId" element={<MemberDetail />} />
        <Route path="loans" element={<OpenLoan />} />
        <Route path="collections" element={<CollectionGrid />} />
        <Route path="deposits" element={<DepositVerification />} />
        <Route path="missed-emi" element={<MissedEmi />} />
        <Route path="reports" element={<Reports />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
