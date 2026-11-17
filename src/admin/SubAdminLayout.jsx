import { useState, useEffect, useRef } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';

const tabs = [
  { to: '/subadmin',              label: 'Dashboard',      end: true, icon: '🏠' },
  { to: '/subadmin/customers',    label: 'Customers (CIF)',            icon: '👥' },
  { to: '/subadmin/loans',        label: 'Loan Accounts',              icon: '📄' },
  { to: '/subadmin/collections',  label: 'Collections',                icon: '💰' },
  { to: '/subadmin/deposits',     label: 'Deposits',                   icon: '🏦' },
  { to: '/subadmin/missed-emi',   label: 'Missed EMI',                 icon: '⚠️' },
  { to: '/subadmin/reports',      label: 'Reports',                    icon: '📊' },
];

export default function SubAdminLayout() {
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const user = JSON.parse(localStorage.getItem('mlc_user') || '{"name":"Sub Admin","role":"subadmin"}');
  const initials = user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  function logout() { localStorage.removeItem('mlc_user'); nav('/'); }

  const headerRef = useRef(null);
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const update = () => document.documentElement.style.setProperty('--header-h', el.offsetHeight + 'px');
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div className="a-app">
      <header className="a-top" ref={headerRef}>
        <button className="hamburger" onClick={() => setOpen(true)} aria-label="Open menu">☰</button>
        <div className="brand">
          <div className="logo-m sm">M</div>
          <div><b>Mahalaxmi Co-Operative Society Ltd</b><small>Sub Admin · Read &amp; Verify Access</small></div>
        </div>
        <div className="a-user">
          <span className="user-label">{user.name} · Sub Admin</span>
          <div className="avatar">{initials}</div>
          <button onClick={logout} style={{ marginLeft: 10, background: 'rgba(255,255,255,.12)', border: 0, color: 'inherit', borderRadius: 8, padding: '6px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Logout</button>
        </div>
      </header>

      {open && <div className="sidebar-overlay" onClick={() => setOpen(false)} />}
      <aside className={`sidebar ${open ? 'sidebar-open' : ''}`}>
        <div className="sidebar-close-row">
          <button className="sidebar-close" onClick={() => setOpen(false)} aria-label="Close menu">✕</button>
        </div>
        <nav className="sidebar-nav">
          {tabs.map(t => (
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
