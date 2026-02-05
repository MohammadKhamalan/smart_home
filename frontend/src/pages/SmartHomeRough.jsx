import { useState, useEffect } from 'react';
import QuotationForm from '../components/QuotationForm';
import { API_BASE } from '../api';
import { useLanguage } from '../context/LanguageContext';
import { useTranslations } from '../translations';
import './Section.css';

const TAX_PERCENT = 15;
const INSTALLATION_PERCENT = 15;

const ROUGH_STEPS = [
  { key: 'floors', labelAr: 'كم طابق؟', labelEn: 'Number of floors' },
  { key: 'bedrooms', labelAr: 'كم غرفة نوم؟', labelEn: 'Number of bedrooms' },
  { key: 'bathrooms', labelAr: 'كم حمام؟', labelEn: 'Number of bathrooms' },
  { key: 'livingRooms', labelAr: 'كم صالة؟', labelEn: 'Number of living rooms' },
  { key: 'corridors', labelAr: 'كم ممر؟', labelEn: 'Number of corridors' },
  { key: 'windows', labelAr: 'كم شباك؟', labelEn: 'Number of windows' },
  { key: 'doors', labelAr: 'كم باب؟', labelEn: 'Number of doors' },
];

function derivePrices(stock) {
  const byCat = {};
  (stock || []).forEach((item) => {
    if (!byCat[item.category]) byCat[item.category] = [];
    byCat[item.category].push(item);
  });
  const maxPrice = (arr) => (arr && arr.length ? Math.max(...arr.map((i) => Number(i.unit_price) || 0)) : 0);
  const firstPrice = (arr) => (arr && arr.length ? (Number(arr[0].unit_price) || 0) : 0);
  const switches = byCat.switches || [];
  const ac = byCat.ac || [];
  const sensors = byCat.sensors || [];
  const curtain = byCat.curtain || [];
  const locks = byCat.smart_door_locks || [];
  const panels = byCat.control_panels || [];
  const panel10 = panels.filter((p) => (p.item_name || '').toLowerCase().includes('10'));

  return {
    maxSwitch: maxPrice(switches) || 190,
    ac: maxPrice(ac) || 556,
    motionSensor: firstPrice(sensors) || 191,
    curtain: firstPrice(curtain) || 1200,
    doorLock: maxPrice(locks) || 1300,
    screen10: panel10.length ? Number(panel10[0].unit_price) : (maxPrice(panels) || 2515),
  };
}

export default function SmartHomeRough({ user }) {
  const { language } = useLanguage();
  const t = useTranslations(language);
  const [stock, setStock] = useState([]);
  const [step, setStep] = useState(0);
  const [includeInstallation, setIncludeInstallation] = useState(false);
  const [values, setValues] = useState({
    floors: 1,
    bedrooms: 1,
    bathrooms: 1,
    livingRooms: 1,
    corridors: 0,
    windows: 0,
    doors: 1,
  });

  useEffect(() => {
    fetch(`${API_BASE}/api/stock`)
      .then((res) => res.json())
      .then(setStock)
      .catch(() => setStock([]));
  }, []);

  const prices = derivePrices(stock);
  const isResultStep = step >= ROUGH_STEPS.length;

  const setValue = (key, n) => {
    const num = Math.max(0, Math.floor(Number(n) || 0));
    setValues((prev) => ({ ...prev, [key]: num }));
  };

  const inc = (key) => setValue(key, (values[key] || 0) + 1);
  const dec = (key) => setValue(key, Math.max(0, (values[key] || 0) - 1));

  const buildQuotation = () => {
    const v = values;
    const { maxSwitch, ac, motionSensor, curtain, doorLock, screen10 } = prices;

    const lines = [];
    let subtotal = 0;

    const add = (name, qty, unitPrice) => {
      if (qty <= 0) return;
      const st = qty * unitPrice;
      subtotal += st;
      lines.push({ name, qty, unitPrice, subtotal: st });
    };

    add(`${v.bedrooms} × Bedroom (3 switches + 1 AC)`, v.bedrooms, 3 * maxSwitch + ac);
    add(`${v.bathrooms} × Bathroom (1 switch + 1 motion sensor)`, v.bathrooms, maxSwitch + motionSensor);
    add(`${v.corridors} × Corridor (1 switch + 1 motion sensor)`, v.corridors, maxSwitch + motionSensor);
    add(`${v.windows} × Window (1 curtain)`, v.windows, curtain);
    add(`${v.doors} × Door (1 door lock)`, v.doors, doorLock);
    add(`${v.livingRooms} × Living room (4 switches + 1 AC)`, v.livingRooms, 4 * maxSwitch + ac);
    add(`${v.floors} × Floor (1× 10" screen)`, v.floors, screen10);

    const devicesSubtotal = subtotal;
    const tax = devicesSubtotal * (TAX_PERCENT / 100);
    lines.push({
      name: `Tax (${TAX_PERCENT}%)`,
      qty: 1,
      unitPrice: tax,
      subtotal: tax,
    });
    subtotal += tax;

    if (includeInstallation) {
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

  const prebuiltQuotation = isResultStep ? buildQuotation() : null;

  return (
    <section className="section">
      <h2>{t.roughTitle}</h2>
      <p className="section-desc">{t.roughDesc}</p>

      {!isResultStep ? (
        <div className="rough-stepper">
          <div className="rough-step-card">
            <p className="rough-step-label-ar">{ROUGH_STEPS[step].labelAr}</p>
            <p className="rough-step-label-en">{ROUGH_STEPS[step].labelEn}</p>
            <div className="rough-step-controls">
              <button type="button" className="rough-btn rough-btn-minus" onClick={() => dec(ROUGH_STEPS[step].key)} aria-label="Decrease">
                −
              </button>
              <input
                type="number"
                min={0}
                value={values[ROUGH_STEPS[step].key]}
                onChange={(e) => setValue(ROUGH_STEPS[step].key, e.target.value)}
                className="rough-input"
              />
              <button type="button" className="rough-btn rough-btn-plus" onClick={() => inc(ROUGH_STEPS[step].key)} aria-label="Increase">
                +
              </button>
            </div>
            <div className="rough-step-actions">
              {step > 0 && (
                <button type="button" className="btn-secondary" onClick={() => setStep(step - 1)}>
                  {t.previous}
                </button>
              )}
              <button
                type="button"
                className="btn-primary"
                onClick={() => (step + 1 >= ROUGH_STEPS.length ? setStep(ROUGH_STEPS.length) : setStep(step + 1))}
              >
                {step + 1 >= ROUGH_STEPS.length ? t.seeQuotation : t.next}
              </button>
            </div>
          </div>
          <p className="rough-step-progress">
            {step + 1} / {ROUGH_STEPS.length}
          </p>
        </div>
      ) : (
        <>
          <div className="rough-summary">
            <p>
              {values.floors} طابق · {values.bedrooms} غرف نوم · {values.bathrooms} حمام · {values.livingRooms} صالة · {values.corridors} ممر · {values.windows} شباك · {values.doors} باب
            </p>
            <button type="button" className="btn-secondary" onClick={() => setStep(0)}>
              {t.editAnswers}
            </button>
          </div>
          <label className="rough-option-checkbox">
            <input
              type="checkbox"
              checked={includeInstallation}
              onChange={(e) => setIncludeInstallation(e.target.checked)}
            />
            <span>{t.installationOption}</span>
          </label>
          <QuotationForm
            mode="rough"
            buildQuotation={buildQuotation}
            user={user}
            prebuiltQuotation={prebuiltQuotation}
          />
        </>
      )}
    </section>
  );
}
