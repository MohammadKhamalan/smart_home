import { useState, useEffect } from 'react';
import QuotationForm from '../components/QuotationForm';
import { API_BASE } from '../api';
import './Section.css';

export default function SmartHome({ user }) {
  const [stock, setStock] = useState({ buttons: [], screens: [], sensors: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/api/stock`)
      .then((res) => res.json())
      .then((rows) => {
        const byCategory = { buttons: [], screens: [], sensors: [] };
        rows.forEach((item) => {
          if (byCategory[item.category]) byCategory[item.category].push(item);
        });
        setStock(byCategory);
      })
      .finally(() => setLoading(false));
  }, []);

  const allItems = [...stock.buttons, ...stock.screens, ...stock.sensors];

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
      <h2>Smart Home</h2>
      <p className="section-desc">Select types and quantities for buttons, screens, and sensors. Quotation is generated from current stock.</p>
      <QuotationForm
        mode="smart-home"
        items={allItems}
        stockByCategory={stock}
        buildQuotation={buildQuotation}
        user={user}
      />
    </section>
  );
}
