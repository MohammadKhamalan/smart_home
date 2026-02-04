import { Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import SmartHome from './pages/SmartHome';
import AIQuotation from './pages/AIQuotation';
import SmartHomeRough from './pages/SmartHomeRough';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('user');
    if (saved) {
      try {
        setUser(JSON.parse(saved));
      } catch (_) {}
    }
    setLoading(false);
  }, []);

  const onLogin = (u) => {
    setUser(u);
    localStorage.setItem('user', JSON.stringify(u));
  };

  const onLogout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: 'var(--text-muted)' }}>Loading...</span>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login onLogin={onLogin} />} />
      <Route path="/" element={user ? <Dashboard user={user} onLogout={onLogout} /> : <Navigate to="/login" replace />}>
        <Route index element={<div className="welcome-msg"><p>Choose an option above: Smart Home, AI, or Smart Home (Rough).</p></div>} />
        <Route path="smart-home" element={<SmartHome user={user} />} />
        <Route path="ai" element={<AIQuotation user={user} />} />
        <Route path="smart-home-rough" element={<SmartHomeRough user={user} />} />
      </Route>
      <Route path="*" element={<Navigate to={user ? '/' : '/login'} replace />} />
    </Routes>
  );
}

export default App;
