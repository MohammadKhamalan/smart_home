import { useState } from 'react';
import QuotationForm from '../components/QuotationForm';
import { useLanguage } from '../context/LanguageContext';
import { useTranslations } from '../translations';
import './Section.css';

export default function AIQuotation({ user }) {
  const { language } = useLanguage();
  const t = useTranslations(language);
  const [serviceName, setServiceName] = useState('');
  const [serviceText, setServiceText] = useState('');
  const [servicePrice, setServicePrice] = useState('');
  const [serviceQty, setServiceQty] = useState(1);

  const buildQuotation = () => {
    const name = serviceName.trim() || 'AI Service';
    const desc = serviceText.trim() ? ` — ${serviceText.trim().slice(0, 80)}${serviceText.length > 80 ? '...' : ''}` : '';
    const qty = Math.max(0, Number(serviceQty) || 1);
    const unitPrice = Math.max(0, Number(servicePrice) || 0);
    const subtotal = qty * unitPrice;
    const lines = [{ name: name + desc, qty, unitPrice, subtotal }];
    return { lines, total: subtotal };
  };

  return (
    <section className="section">
      <h2>{t.aiTitle}</h2>
      <p className="section-desc">{t.aiDesc}</p>
      <QuotationForm
        mode="ai"
        items={[]}
        serviceName={serviceName}
        onServiceNameChange={setServiceName}
        serviceText={serviceText}
        onServiceTextChange={setServiceText}
        servicePrice={servicePrice}
        onServicePriceChange={setServicePrice}
        serviceQty={serviceQty}
        onServiceQtyChange={setServiceQty}
        buildQuotation={buildQuotation}
        user={user}
      />
    </section>
  );
}
