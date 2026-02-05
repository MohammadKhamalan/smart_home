import { Outlet, NavLink } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useTranslations } from '../translations';
import './Dashboard.css';

export default function Dashboard({ user, onLogout }) {
  const { language, setLanguage } = useLanguage();
  const t = useTranslations(language);

  return (
    <div className="dashboard-layout" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <header className="dashboard-header">
        <h1>{t.quotationSystem}</h1>
        <div className="header-right">
          <select
            className="lang-select"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            aria-label="Language"
          >
            <option value="en">English</option>
            <option value="ar">العربية</option>
          </select>
          <span className="user-name">{user?.username}</span>
          <button type="button" className="btn-logout" onClick={onLogout}>
            {t.logout}
          </button>
        </div>
      </header>
      <nav className="dashboard-nav">
        <NavLink to="/smart-home" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
          {t.smartHome}
        </NavLink>
        <NavLink to="/ai" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
          {t.ai}
        </NavLink>
        <NavLink to="/smart-home-rough" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
          {t.smartHomeRough}
        </NavLink>
      </nav>
      <main className="dashboard-main">
        <Outlet />
      </main>
    </div>
  );
}
