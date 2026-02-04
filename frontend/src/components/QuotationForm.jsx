import { useState } from 'react';
import { API_BASE } from '../api';
import './QuotationForm.css';

export default function QuotationForm({
  mode,
  items = [],
  stockByCategory = {},
  rooms,
  onRoomsChange,
  area,
  onAreaChange,
  shape,
  onShapeChange,
  serviceText = '',
  onServiceTextChange,
  selectedService = '',
  onSelectedServiceChange,
  buildQuotation,
  user,
  dummyAiServices = [],
}) {
  const [quantities, setQuantities] = useState({});
  const [quotation, setQuotation] = useState(null);
  const [saving, setSaving] = useState(false);

  const setQty = (id, qty) => {
    setQuantities((prev) => ({ ...prev, [id]: Math.max(0, Number(qty) || 0) }));
  };

  const handleGenerate = () => {
    if (mode === 'smart-home') {
      const selections = items.map((item) => ({
        ...item,
        quantity: quantities[item.id] || 0,
      }));
      setQuotation(buildQuotation(selections));
    } else if (mode === 'ai') {
      setQuotation(buildQuotation());
    } else if (mode === 'rough') {
      setQuotation(buildQuotation());
    }
  };

  const handleSaveQuotation = async () => {
    if (!quotation) return;
    setSaving(true);
    try {
      await fetch(`${API_BASE}/api/quotations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          type: mode,
          data: quotation,
          total: quotation.total,
        }),
      });
    } catch (_) {}
    setSaving(false);
  };

  return (
    <div className="quotation-form">
      {/* Smart Home: buttons, screens, sensors */}
      {mode === 'smart-home' && (
        <div className="form-block">
          {['buttons', 'screens', 'sensors'].map((cat) => (
            <div key={cat} className="category-block">
              <h3 className="category-title">{cat.charAt(0).toUpperCase() + cat.slice(1)}</h3>
              <div className="item-rows">
                {(stockByCategory[cat] || []).map((item) => (
                  <div key={item.id} className="item-row">
                    <label>
                      <span className="item-name">{item.item_name}</span>
                      <span className="item-meta">${item.unit_price} · Stock: {item.quantity_in_stock}</span>
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={item.quantity_in_stock}
                      value={quantities[item.id] ?? ''}
                      onChange={(e) => setQty(item.id, e.target.value)}
                      placeholder="0"
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* AI: service description + type */}
      {mode === 'ai' && (
        <div className="form-block">
          <div className="form-group">
            <label>Service type</label>
            <select
              value={selectedService}
              onChange={(e) => onSelectedServiceChange(e.target.value)}
            >
              <option value="">Select...</option>
              {dummyAiServices.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Service description</label>
            <textarea
              value={serviceText}
              onChange={(e) => onServiceTextChange(e.target.value)}
              placeholder="Describe the AI service you need..."
              rows={4}
            />
          </div>
        </div>
      )}

      {/* Rough: rooms, area, shape */}
      {mode === 'rough' && (
        <div className="form-block">
          <div className="form-row">
            <div className="form-group">
              <label>Number of rooms</label>
              <input
                type="number"
                min={1}
                max={50}
                value={rooms}
                onChange={(e) => onRoomsChange(Number(e.target.value) || 1)}
              />
            </div>
            <div className="form-group">
              <label>Area (m²)</label>
              <input
                type="number"
                min={20}
                max={2000}
                value={area}
                onChange={(e) => onAreaChange(Number(e.target.value) || 50)}
              />
            </div>
            <div className="form-group">
              <label>House shape</label>
              <select value={shape} onChange={(e) => onShapeChange(e.target.value)}>
                <option value="square">Square</option>
                <option value="rectangle">Rectangle</option>
                <option value="l_shape">L-Shape</option>
              </select>
            </div>
          </div>
        </div>
      )}

      <div className="form-actions">
        <button type="button" className="btn-primary" onClick={handleGenerate}>
          {mode === 'smart-home' ? 'Generate quotation' : mode === 'ai' ? 'Generate quotation' : 'Get approximate quotation'}
        </button>
      </div>

      {quotation && (
        <div className="quotation-result">
          <h3>Quotation</h3>
          <table className="quotation-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Qty</th>
                <th>Unit price</th>
                <th>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {quotation.lines.map((line, i) => (
                <tr key={i}>
                  <td>{line.name}</td>
                  <td>{line.subtotal > 0 ? line.qty : '—'}</td>
                  <td>{line.subtotal > 0 ? `$${Number(line.unitPrice).toFixed(2)}` : '—'}</td>
                  <td>{line.subtotal > 0 ? `$${Number(line.subtotal).toFixed(2)}` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="quotation-total">
            <strong>Total: ${Number(quotation.total).toFixed(2)}</strong>
          </p>
          <button
            type="button"
            className="btn-secondary"
            onClick={handleSaveQuotation}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save quotation'}
          </button>
        </div>
      )}
    </div>
  );
}
