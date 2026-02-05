import { useState, useEffect } from 'react';
import { API_BASE } from '../api';
import { downloadQuotationPdf } from '../utils/quotationPdf';
import { getItemImage } from '../assets/itemImages';
import { useLanguage } from '../context/LanguageContext';
import { useTranslations } from '../translations';
import './QuotationForm.css';

export default function QuotationForm({
  mode,
  items = [],
  stockByCategory = {},
  categories = [],
  selectedCategory = '',
  onCategoryChange,
  rooms,
  onRoomsChange,
  area,
  onAreaChange,
  shape,
  onShapeChange,
  bathrooms,
  onBathroomsChange,
  floors,
  onFloorsChange,
  corridors,
  onCorridorsChange,
  largeWindows,
  onLargeWindowsChange,
  livingRooms,
  onLivingRoomsChange,
  doors,
  onDoorsChange,
  windows,
  onWindowsChange,
  serviceName = '',
  onServiceNameChange,
  serviceText = '',
  onServiceTextChange,
  servicePrice = '',
  onServicePriceChange,
  serviceQty = 1,
  onServiceQtyChange,
  selectedService = '',
  onSelectedServiceChange,
  buildQuotation,
  user,
  dummyAiServices = [],
  prebuiltQuotation = null,
}) {
  const { language } = useLanguage();
  const t = useTranslations(language);
  const [quantities, setQuantities] = useState({});
  const [quotation, setQuotation] = useState(null);
  const [saving, setSaving] = useState(false);
  const [pdfQuoteNumber] = useState(() => 'QT-' + String(Math.floor(100000 + Math.random() * 900000)));

  useEffect(() => {
    if (prebuiltQuotation) setQuotation(prebuiltQuotation);
  }, [prebuiltQuotation]);

  const handleDownloadPdf = () => {
    if (!quotation) return;
    try {
      const subject = mode === 'smart-home' ? 'Smart Home Quotation' : mode === 'ai' ? 'AI Service Quotation' : 'Smart Home Rough Quotation';
      downloadQuotationPdf(
        {
          quotation,
          quoteNumber: pdfQuoteNumber,
          billTo: 'Client',
          subject,
          quoteDate: new Date(),
          language,
        },
        `Quotation-${pdfQuoteNumber}.pdf`
      );
    } catch (err) {
      console.error('PDF download failed:', err);
    }
  };

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
      {/* Smart Home: category selector + item cards (photo, name, price, qty) */}
      {mode === 'smart-home' && (
        <div className="form-block">
          <div className="category-tabs">
            {(categories || []).map((cat) => (
              <button
                key={cat.id}
                type="button"
                className={`category-tab ${selectedCategory === cat.id ? 'active' : ''}`}
                onClick={() => onCategoryChange?.(cat.id)}
              >
                {cat.label}
              </button>
            ))}
          </div>
          <div className="item-cards">
            {(stockByCategory[selectedCategory] || []).map((item) => (
              <div key={item.id} className="item-card">
                <div className="item-card-photo">
                  <img src={getItemImage(item) || 'https://placehold.co/120x120?text=Item'} alt={item.item_name} />
                </div>
                <div className="item-card-info">
                  <span className="item-name">{item.item_name}</span>
                  <span className="item-price">SAR {Number(item.unit_price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  <span className="item-meta">Stock: {item.quantity_in_stock}</span>
                </div>
                <input
                  type="number"
                  min={0}
                  max={item.quantity_in_stock}
                  value={quantities[item.id] ?? ''}
                  onChange={(e) => setQty(item.id, e.target.value)}
                  placeholder="0"
                  className="item-card-qty"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI: name, description, price, quantity */}
      {mode === 'ai' && (
        <div className="form-block">
          <div className="form-group">
            <label>{t.nameOfService}</label>
            <input
              type="text"
              value={serviceName}
              onChange={(e) => onServiceNameChange?.(e.target.value)}
              placeholder="e.g. Voice assistant integration"
            />
          </div>
          <div className="form-group">
            <label>{t.description}</label>
            <textarea
              value={serviceText}
              onChange={(e) => onServiceTextChange(e.target.value)}
              placeholder="Describe the AI service you need..."
              rows={4}
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>{t.priceSar}</label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={servicePrice}
                onChange={(e) => onServicePriceChange?.(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="form-group">
              <label>{t.quantity}</label>
              <input
                type="number"
                min={1}
                value={serviceQty}
                onChange={(e) => onServiceQtyChange?.(Math.max(1, Number(e.target.value) || 1))}
                placeholder="1"
              />
            </div>
          </div>
        </div>
      )}

      {/* Rough: only show form when not using prebuilt (stepper is in SmartHomeRough) */}
      {mode === 'rough' && !prebuiltQuotation && (
        <div className="form-block">
          <p className="section-desc">Use the steps above to enter quantities, then press &quot;See quotation&quot;.</p>
        </div>
      )}

      {mode !== 'rough' && (
        <div className="form-actions">
          <button type="button" className="btn-primary" onClick={handleGenerate}>
            {t.generateQuotation}
          </button>
        </div>
      )}
      {mode === 'rough' && prebuiltQuotation && (
        <div className="form-actions" style={{ marginTop: 0 }} />
      )}

      {quotation && (
        <div className="quotation-result">
          <h3>{t.quotation}</h3>
          <table className="quotation-table">
            <thead>
              <tr>
                <th>{t.item}</th>
                <th>{t.qty}</th>
                <th>{t.rateSar}</th>
                <th>{t.amountSar}</th>
              </tr>
            </thead>
            <tbody>
              {quotation.lines.map((line, i) => (
                <tr key={i}>
                  <td>{line.name}</td>
                  <td>{line.subtotal > 0 ? line.qty : '—'}</td>
                  <td>{line.subtotal > 0 ? `SAR ${Number(line.unitPrice).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}</td>
                  <td>{line.subtotal > 0 ? `SAR ${Number(line.subtotal).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="quotation-total">
            <strong>{t.total}: SAR {Number(quotation.total).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
          </p>
          <div className="quotation-actions">
            <button
              type="button"
              className="btn-primary btn-download-pdf"
              onClick={handleDownloadPdf}
              disabled={false}
            >
              {t.downloadPdf}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={handleSaveQuotation}
              disabled={saving}
            >
              {saving ? t.saving : t.saveQuotation}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
