import { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';

const tabs = [
  { to: '/admin', label: 'Dashboard', end: true, icon: '🏠' },
  { to: '/admin/customers', label: 'Customers (CIF)', icon: '👥' },
  { to: '/admin/loans', label: 'Loan Accounts', icon: '📄' },
  { to: '/admin/loan-applications', label: 'Loan Applications', icon: '📝' },
  { to: '/admin/collections', label: 'Collections', icon: '💰' },
  { to: '/admin/deposits', label: 'Deposits', icon: '🏦' },
  { to: '/admin/targets', label: 'Targets', icon: '🎯' },
  { to: '/admin/alerts', label: 'Alerts', icon: '🔔' },
  { to: '/admin/reports', label: 'Reports', icon: '📊' },
  { to: '/admin/sanction-letters', label: 'Sanction Letters', icon: '📜' },
  { to: '/admin/settings', label: 'Settings', icon: '⚙️' },
];

export default function AdminLayout() {
  const { pathname } = useLocation();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const user = JSON.parse(localStorage.getItem('mlc_user') || '{"name":"Admin","role":"admin"}');
  const initials = user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  function logout() { localStorage.removeItem('mlc_user'); nav('/'); }
  const sub =
    pathname.startsWith('/admin/deposits') ? 'Accountable Officer'
    : pathname.startsWith('/admin/settings') ? 'Super Admin'
    : 'Loan collection · Head office';
  return (
    <div className="a-app">
      <header className="a-top">
        <button className="hamburger" onClick={() => setOpen(true)} aria-label="Open menu">☰</button>
        <div className="brand">
          <div className="logo-m sm">M</div>
          <div><b>Mahalaxmi Co-Operative Society Ltd</b><small>{sub}</small></div>
        </div>
        <div className="a-user">
          <span className="user-label">{user.name} · {user.role}</span>
          <div className="avatar">{initials}</div>
          <button onClick={logout} style={{ marginLeft: 10, background: 'rgba(255,255,255,.12)', border: 0, color: 'inherit', borderRadius: 8, padding: '6px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Logout</button>
        </div>
      </header>

      {open && <div className="sidebar-overlay" onClick={() => setOpen(false)} />}
      <aside className={`sidebar ${open ? 'sidebar-open' : ''}`}>
        <div className="sidebar-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="logo-m sm">M</div>
            <div><b style={{ fontSize: 15, display: 'block', lineHeight: 1.2 }}>Mahalaxmi Co-Op</b><small style={{ color: '#cfe3d9', fontSize: 11 }}>Admin portal</small></div>
          </div>
          <button className="sidebar-close" onClick={() => setOpen(false)} aria-label="Close menu">✕</button>
        </div>
        <nav className="sidebar-nav">
          {tabs.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.end}
              className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
              onClick={() => setOpen(false)}
            >
              <span className="sidebar-icon">{t.icon}</span>
              {t.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="a-main"><Outlet /></main>
    </div>
  );
}
