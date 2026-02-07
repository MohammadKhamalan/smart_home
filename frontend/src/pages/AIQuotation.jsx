import { useState } from 'react';
import QuotationForm from '../components/QuotationForm';
import { useLanguage } from '../context/LanguageContext';
import { useTranslations } from '../translations';
import './Section.css';

const TAX_PERCENT = 15;
const INSTALLATION_PERCENT = 15;

const emptyService = () => ({ id: Date.now(), name: '', description: '', price: '', qty: 1 });

export default function AIQuotation({ user }) {
  const { language } = useLanguage();
  const t = useTranslations(language);
  const [services, setServices] = useState([emptyService()]);
  const [includeInstallation, setIncludeInstallation] = useState(false);

  const buildQuotation = () => {
    const lines = [];
    let servicesSubtotal = 0;
    services.forEach((svc) => {
      const name = (svc.name || 'AI Service').trim();
      const desc = (svc.description || '').trim()
        ? ` — ${(svc.description || '').trim().slice(0, 80)}${(svc.description || '').length > 80 ? '...' : ''}`
        : '';
      const qty = Math.max(0, Number(svc.qty) || 1);
      const unitPrice = Math.max(0, Number(svc.price) || 0);
      const subtotal = qty * unitPrice;
      servicesSubtotal += subtotal;
      lines.push({ name: name + desc, qty, unitPrice, subtotal });
    });
    let total = servicesSubtotal;
    const tax = servicesSubtotal * (TAX_PERCENT / 100);
    lines.push({ name: `Tax (${TAX_PERCENT}%)`, qty: 1, unitPrice: tax, subtotal: tax });
    total += tax;
    if (includeInstallation) {
      const installation = servicesSubtotal * (INSTALLATION_PERCENT / 100);
      lines.push({
        name: `Installation & programming (${INSTALLATION_PERCENT}%)`,
        qty: 1,
        unitPrice: installation,
        subtotal: installation,
      });
      total += installation;
    }
    return { lines, total };
  };

  return (
    <section className="section">
      <h2>{t.aiTitle}</h2>
      <p className="section-desc">{t.aiDesc}</p>
      <QuotationForm
        mode="ai"
        items={[]}
        aiServices={services}
        onAiServicesChange={setServices}
        buildQuotation={buildQuotation}
        includeInstallation={includeInstallation}
        onIncludeInstallationChange={setIncludeInstallation}
        user={user}
      />
    </section>
  );
}
