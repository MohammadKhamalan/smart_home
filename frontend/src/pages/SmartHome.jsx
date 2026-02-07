import { useState, useEffect } from 'react';
import QuotationForm from '../components/QuotationForm';
import { API_BASE } from '../api';
import { useLanguage } from '../context/LanguageContext';
import { useTranslations } from '../translations';
import './Section.css';

const TAX_PERCENT = 15;
const INSTALLATION_PERCENT = 15;

const CATEGORIES = [
  { id: 'curtain', label: 'Curtain' },
  { id: 'switches', label: 'Switches' },
  { id: 'control_panels', label: 'Control Panels' },
  { id: 'smart_door_locks', label: 'Smart Door Locks' },
  { id: 'sensors', label: 'Sensors' },
  { id: 'ac', label: 'AC' },
];

export default function SmartHome({ user }) {
  const { language } = useLanguage();
  const t = useTranslations(language);
  const [stock, setStock] = useState({});
  const [selectedCategory, setSelectedCategory] = useState('curtain');
  const [loading, setLoading] = useState(true);
  const [stockError, setStockError] = useState(null);
  const [includeInstallation, setIncludeInstallation] = useState(false);

  const fetchStock = () => {
    setStockError(null);
    return fetch(`${API_BASE}/api/stock`)
      .then((res) => {
        if (!res.ok) throw new Error(`API ${res.status}`);
        return res.json();
      })
      .then((rows) => {
        const byCategory = {};
        CATEGORIES.forEach((c) => (byCategory[c.id] = []));
        (rows || []).forEach((item) => {
          if (item && byCategory[item.category]) byCategory[item.category].push(item);
        });
        setStock(byCategory);
      })
      .catch((err) => {
        console.error('Failed to load stock:', err);
        setStockError(
          'Could not load products. Start the backend: in the backend folder run "npm run start" (must be on port 5000, or set VITE_API_URL in .env to your backend URL).'
        );
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchStock();
  }, []);

  useEffect(() => {
    const onQuotationSaved = () => fetchStock();
    window.addEventListener('quotation-saved', onQuotationSaved);
    return () => window.removeEventListener('quotation-saved', onQuotationSaved);
  }, []);

  const applyStockFromServer = (rows) => {
    const byCategory = {};
    CATEGORIES.forEach((c) => (byCategory[c.id] = []));
    (rows || []).forEach((item) => {
      if (item && byCategory[item.category]) byCategory[item.category].push(item);
    });
    setStock(byCategory);
  };

  const allItems = CATEGORIES.flatMap((c) => stock[c.id] || []);

  const buildQuotation = (selections, opts = {}) => {
    const lines = [];
    let subtotal = 0;
    selections.forEach(({ id, item_name, unit_price, quantity_in_stock, quantity }) => {
      const qty = Math.min(Number(quantity) || 0, quantity_in_stock);
      const lineSub = qty * unit_price;
      subtotal += lineSub;
      if (qty > 0) {
        lines.push({ id, name: item_name, qty, unitPrice: unit_price, subtotal: lineSub });
      }
    });
    const devicesSubtotal = subtotal;
    const tax = devicesSubtotal * (TAX_PERCENT / 100);
    lines.push({
      name: `Tax (${TAX_PERCENT}%)`,
      qty: 1,
      unitPrice: tax,
      subtotal: tax,
    });
    subtotal += tax;
    if (opts.includeInstallation) {
      const installation = devicesSubtotal * (INSTALLATION_PERCENT / 100);
      lines.push({
        name: `Installation & programming (${INSTALLATION_PERCENT}%)`,
        qty: 1,
        unitPrice: installation,
        subtotal: installation,
      });
      subtotal += installation;
    }
    return { lines, total: subtotal };
  };

  if (loading) {
    return <div className="section-loading">Loading stock...</div>;
  }

  if (stockError) {
    return (
      <section className="section">
        <h2>{t.smartHomeTitle}</h2>
        <div className="section-loading section-error">
          <p><strong>No items loaded</strong></p>
          <p>{stockError}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="section">
      <h2>{t.smartHomeTitle}</h2>
      <p className="section-desc">{t.smartHomeDesc}</p>
      <QuotationForm
        mode="smart-home"
        items={allItems}
        stockByCategory={stock}
        categories={CATEGORIES}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        buildQuotation={buildQuotation}
        includeInstallation={includeInstallation}
        onIncludeInstallationChange={setIncludeInstallation}
        onStockUpdated={applyStockFromServer}
        user={user}
      />
    </section>
  );
}
