import { useState, useEffect } from 'react';
import QuotationForm from '../components/QuotationForm';
import { API_BASE } from '../api';
import { useLanguage } from '../context/LanguageContext';
import { useTranslations } from '../translations';
import './Section.css';

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

  useEffect(() => {
    fetch(`${API_BASE}/api/stock`)
      .then((res) => res.json())
      .then((rows) => {
        const byCategory = {};
        CATEGORIES.forEach((c) => (byCategory[c.id] = []));
        rows.forEach((item) => {
          if (byCategory[item.category]) byCategory[item.category].push(item);
        });
        setStock(byCategory);
      })
      .finally(() => setLoading(false));
  }, []);

  const allItems = CATEGORIES.flatMap((c) => stock[c.id] || []);

  const buildQuotation = (selections) => {
    const lines = [];
    let total = 0;
    selections.forEach(({ id, item_name, unit_price, quantity_in_stock, quantity }) => {
      const qty = Math.min(Number(quantity) || 0, quantity_in_stock);
      const subtotal = qty * unit_price;
      total += subtotal;
      if (qty > 0) {
        lines.push({ name: item_name, qty, unitPrice: unit_price, subtotal });
      }
    });
    return { lines, total };
  };

  if (loading) {
    return <div className="section-loading">Loading stock...</div>;
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
        user={user}
      />
    </section>
  );
}
