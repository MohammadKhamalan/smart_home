import { Outlet, NavLink } from 'react-router-dom';
import './Dashboard.css';

export default function Dashboard({ user, onLogout }) {
  return (
    <div className="dashboard-layout">
      <header className="dashboard-header">
        <h1>Quotation System</h1>
        <div className="header-right">
          <span className="user-name">{user?.username}</span>
          <button type="button" className="btn-logout" onClick={onLogout}>
            Logout
          </button>
        </div>
      </header>
      <nav className="dashboard-nav">
        <NavLink to="/smart-home" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
          Smart Home
        </NavLink>
        <NavLink to="/ai" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
          AI
        </NavLink>
        <NavLink to="/smart-home-rough" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
          Smart Home (Rough)
        </NavLink>
      </nav>
      <main className="dashboard-main">
        <Outlet />
      </main>
    </div>
  );
}
