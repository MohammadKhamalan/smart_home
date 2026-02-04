import { useState } from 'react';
import QuotationForm from '../components/QuotationForm';
import './Section.css';

// Dummy AI pricing: service description -> fixed or estimated cost
const DUMMY_AI_SERVICES = [
  { id: 'voice', name: 'Voice assistant integration', price: 150 },
  { id: 'analytics', name: 'Analytics dashboard', price: 280 },
  { id: 'custom', name: 'Custom AI service (per description)', price: 0, perHour: 45 },
];

export default function AIQuotation({ user }) {
  const [serviceText, setServiceText] = useState('');
  const [selectedService, setSelectedService] = useState('');

  const getEstimatedPrice = () => {
    if (selectedService === 'custom' && serviceText.trim()) {
      const words = serviceText.trim().split(/\s+/).length;
      const estimatedHours = Math.max(1, Math.ceil(words / 5));
      return DUMMY_AI_SERVICES.find((s) => s.id === 'custom').perHour * estimatedHours;
    }
    const s = DUMMY_AI_SERVICES.find((x) => x.id === selectedService);
    return s ? s.price : 0;
  };

  const buildQuotation = () => {
    const price = getEstimatedPrice();
    const name = selectedService
      ? DUMMY_AI_SERVICES.find((s) => s.id === selectedService)?.name || 'AI Service'
      : 'AI Service';
    const desc = serviceText.trim() ? ` — ${serviceText.trim().slice(0, 60)}${serviceText.length > 60 ? '...' : ''}` : '';
    const lines = [{ name: name + desc, qty: 1, unitPrice: price, subtotal: price }];
    return { lines, total: price };
  };

  const items = DUMMY_AI_SERVICES.map((s) => ({
    id: s.id,
    item_name: s.name,
    unit_price: s.price || s.perHour,
    quantity_in_stock: 999,
    category: 'ai',
  }));

  return (
    <section className="section">
      <h2>AI Quotation</h2>
      <p className="section-desc">Enter the service description and get a quotation on the same form.</p>
      <QuotationForm
        mode="ai"
        items={items}
        serviceText={serviceText}
        onServiceTextChange={setServiceText}
        selectedService={selectedService}
        onSelectedServiceChange={setSelectedService}
        buildQuotation={buildQuotation}
        user={user}
        dummyAiServices={DUMMY_AI_SERVICES}
      />
    </section>
  );
}
