import { useState, useEffect, useRef } from 'react';
import { API_BASE } from '../api';
import { downloadQuotationPdf, imageUrlToDataUrl } from '../utils/quotationPdf';
import { getItemImage } from '../assets/itemImages';
import logoUrl from '../assets/logo.png';
import signatureUrl from '../assets/signiture.png';
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
  aiServices = [],
  onAiServicesChange,
  selectedService = '',
  onSelectedServiceChange,
  buildQuotation,
  includeInstallation = false,
  onIncludeInstallationChange,
  onStockUpdated,
  user,
  dummyAiServices = [],
  prebuiltQuotation = null,
}) {
  const { language } = useLanguage();
  const t = useTranslations(language);
  const [quantities, setQuantities] = useState({});
  const [quotation, setQuotation] = useState(null);
  const [saving, setSaving] = useState(false);
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [pdfQuoteNumber] = useState(() => 'QT-' + String(Math.floor(100000 + Math.random() * 900000)));
  const preloadRef = useRef(null);
  const workerRef = useRef(null);

  useEffect(() => {
    if (prebuiltQuotation) setQuotation(prebuiltQuotation);
  }, [prebuiltQuotation]);

  // Preload logo and signature once
  useEffect(() => {
    if (!preloadRef.current) {
      preloadRef.current = Promise.all([
        logoUrl ? imageUrlToDataUrl(logoUrl) : Promise.resolve(null),
        signatureUrl ? imageUrlToDataUrl(signatureUrl) : Promise.resolve(null),
      ]).then(([logo, sig]) => ({ logo, sig }));
    }
  }, [logoUrl, signatureUrl]);

  const handleDownloadPdf = async () => {
    if (!quotation || pdfGenerating) return;
    const subject = mode === 'smart-home' ? 'Smart Home Quotation' : mode === 'ai' ? 'AI Service Quotation' : 'Smart Home Rough Quotation';
    const filename = `Quotation-${pdfQuoteNumber}.pdf`;
    const opts = {
      quotation,
      quoteNumber: pdfQuoteNumber,
      billTo: 'Client',
      subject,
      quoteDate: new Date(),
      language,
      logoDataUrl: null,
      signatureDataUrl: null,
    };
    try {
      const { logo, sig } = await (preloadRef.current || Promise.resolve({ logo: null, sig: null }));
      opts.logoDataUrl = logo;
      opts.signatureDataUrl = sig;
    } catch (_) {}

    const useWorker = typeof Worker !== 'undefined';
    if (useWorker) {
      setPdfGenerating(true);
      try {
        if (!workerRef.current) {
          workerRef.current = new Worker(new URL('../utils/quotationPdf.worker.js', import.meta.url), { type: 'module' });
        }
        const worker = workerRef.current;
        await new Promise((resolve, reject) => {
          const onMessage = (e) => {
            worker.removeEventListener('message', onMessage);
            worker.removeEventListener('error', onError);
            if (e.data && e.data.error) {
              reject(new Error(e.data.error));
              return;
            }
            const blob = e.data && e.data.blob;
            if (blob) {
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = e.data.filename || filename;
              a.click();
              URL.revokeObjectURL(url);
            }
            resolve();
          };
          const onError = () => {
            worker.removeEventListener('message', onMessage);
            worker.removeEventListener('error', onError);
            reject(new Error('Worker failed'));
          };
          worker.addEventListener('message', onMessage);
          worker.addEventListener('error', onError);
          worker.postMessage({ opts, filename });
        });
      } catch (err) {
        console.error('PDF worker failed:', err);
        downloadQuotationPdf(opts, filename);
      } finally {
        setPdfGenerating(false);
      }
    } else {
      downloadQuotationPdf(opts, filename);
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
      setQuotation(buildQuotation(selections, { includeInstallation }));
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
      const res = await fetch(`${API_BASE}/api/quotations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          type: mode,
          data: quotation,
          total: quotation.total,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && mode === 'smart-home') {
        if (data.updatedStock && Array.isArray(data.updatedStock) && onStockUpdated) {
          onStockUpdated(data.updatedStock);
        } else {
          window.dispatchEvent(new CustomEvent('quotation-saved'));
        }
      }
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
                <div className="item-card-qty-controls">
                  <button
                    type="button"
                    className="qty-btn qty-minus"
                    onClick={() => setQty(item.id, Math.max(0, (quantities[item.id] || 0) - 1))}
                    aria-label="Decrease"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min={0}
                    max={item.quantity_in_stock}
                    value={quantities[item.id] ?? ''}
                    onChange={(e) => setQty(item.id, e.target.value)}
                    placeholder="0"
                    className="item-card-qty"
                  />
                  <button
                    type="button"
                    className="qty-btn qty-plus"
                    onClick={() => setQty(item.id, Math.min(item.quantity_in_stock, (quantities[item.id] || 0) + 1))}
                    aria-label="Increase"
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>
          {(onIncludeInstallationChange != null) && (
            <label className="rough-option-checkbox" style={{ marginTop: 12, display: 'block' }}>
              <input
                type="checkbox"
                checked={includeInstallation}
                onChange={(e) => onIncludeInstallationChange(e.target.checked)}
              />
              <span>{t.installationOption}</span>
            </label>
          )}
        </div>
      )}

      {/* AI: multiple services — name, description, price, quantity per service */}
      {mode === 'ai' && aiServices && onAiServicesChange && (
        <div className="form-block">
          {aiServices.map((svc, index) => (
            <div key={svc.id} className="ai-service-card">
              <div className="ai-service-card-header">
                <span className="ai-service-card-title">{t.nameOfService} {aiServices.length > 1 ? index + 1 : ''}</span>
                {aiServices.length > 1 && (
                  <button
                    type="button"
                    className="btn-remove-service"
                    onClick={() => onAiServicesChange(aiServices.filter((_, i) => i !== index))}
                    aria-label={t.removeService}
                  >
                    {t.removeService}
                  </button>
                )}
              </div>
              <div className="form-group">
                <label>{t.nameOfService}</label>
                <input
                  type="text"
                  value={svc.name}
                  onChange={(e) => {
                    const next = [...aiServices];
                    next[index] = { ...next[index], name: e.target.value };
                    onAiServicesChange(next);
                  }}
                  placeholder="e.g. Voice assistant integration"
                />
              </div>
              <div className="form-group">
                <label>{t.description}</label>
                <textarea
                  value={svc.description}
                  onChange={(e) => {
                    const next = [...aiServices];
                    next[index] = { ...next[index], description: e.target.value };
                    onAiServicesChange(next);
                  }}
                  placeholder="Describe the AI service..."
                  rows={3}
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>{t.priceSar}</label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={svc.price}
                    onChange={(e) => {
                      const next = [...aiServices];
                      next[index] = { ...next[index], price: e.target.value };
                      onAiServicesChange(next);
                    }}
                    placeholder="0.00"
                  />
                </div>
                <div className="form-group">
                  <label>{t.quantity}</label>
                  <input
                    type="number"
                    min={1}
                    value={svc.qty}
                    onChange={(e) => {
                      const next = [...aiServices];
                      next[index] = { ...next[index], qty: Math.max(1, Number(e.target.value) || 1) };
                      onAiServicesChange(next);
                    }}
                    placeholder="1"
                  />
                </div>
              </div>
            </div>
          ))}
          <button
            type="button"
            className="btn-secondary btn-add-service"
            onClick={() => onAiServicesChange([...aiServices, { id: Date.now(), name: '', description: '', price: '', qty: 1 }])}
          >
            + {t.addService}
          </button>
          {(onIncludeInstallationChange != null) && (
            <label className="rough-option-checkbox" style={{ marginTop: 12, display: 'block' }}>
              <input
                type="checkbox"
                checked={includeInstallation}
                onChange={(e) => onIncludeInstallationChange(e.target.checked)}
              />
              <span>{t.installationOption}</span>
            </label>
          )}
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
              disabled={pdfGenerating}
            >
              {pdfGenerating ? t.preparingPdf : t.downloadPdf}
            </button>
            {mode === 'smart-home' && (
              <button
                type="button"
                className="btn-secondary"
                onClick={handleSaveQuotation}
                disabled={saving}
              >
                {saving ? t.saving : t.saveQuotation}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
