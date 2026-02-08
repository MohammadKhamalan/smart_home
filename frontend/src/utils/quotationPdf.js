import { jsPDF } from 'jspdf';
import { applyPlugin } from 'jspdf-autotable';

// Required: attach autoTable to jsPDF (ESM doesn't use window.jsPDF)
applyPlugin(jsPDF);

const formatNum = (n) => Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const defaultCompany = {
  name: 'Zuccess',
  address: 'Al Khobar',
  country: 'Kingdom of Saudi Arabia',
  phone: '+971 54-437 5797',
  email: 'info@zuccess.net',
  website: 'www.zuccess.ai',
  licenseNumber: '7042632393',
  vatNumber: '312668821500003',
};

const defaultTerms = {
  payment: [
    'Initial Payment: 50% of the total amount to be paid upon signing the contract.',
    'Final Payment: The remaining 50% to be paid upon completion of delivery, installation, and successful testing of all devices.',
  ],
  installation: [
    'Installation Start: Installation works will commence 25 days after contract signing.',
    'The expected installation and configuration period is 3 to 7 working days, depending on project size and site conditions.',
  ],
  warranty: [
    'All devices include a 24-month manufacturer warranty.',
    'Installation and programming works are covered by a 3-month service warranty.',
    'Any additional requests or upgrades outside the listed scope will be quoted separately.',
  ],
  validity: 'This quotation is valid for 30 days from the date of issue.',
  exclusions:
    'The extension or provision of neutral lines is the responsibility of the client\'s appointed electrical technician. If this work is carried out by our team, it will be considered an additional item and subject to separate charges as per the approved rates.',
};

/**
 * Generate a 2-page quotation PDF matching the Zuccess sample layout.
 * @param {Object} opts
 * @param {Object} opts.quotation - { lines: [{ name, qty, unitPrice, subtotal }], total }
 * @param {string} [opts.quoteNumber] - e.g. 'QT-000166'
 * @param {string} [opts.billTo] - Client name, e.g. 'MKN'
 * @param {string} [opts.subject] - e.g. 'Smart Home Quotation for 3 Bedroom Apartment'
 * @param {Date|string} [opts.quoteDate] - Quote date
 * @param {Object} [opts.company] - Override company info
 * @param {string} [opts.notes] - e.g. 'Looking forward for your business.'
 * @param {string} [opts.signatureName] - e.g. 'Anas Salem'
 * @param {string} [opts.signatureTitle] - e.g. 'Operation Manager'
 * @param {Object} [opts.terms] - Override default terms text
 * @param {string} [opts.language] - 'en' | 'ar' (PDF uses English labels for reliability)
 * @param {string} [opts.logoDataUrl] - data URL of logo image (placed top-right)
 * @param {string} [opts.signatureDataUrl] - data URL of signature image (before signature name)
 */
const pdfLabels = {
  en: { quote: 'Quote', billTo: 'Bill To', quoteDate: 'Quote Date', itemDesc: 'Item & Description', rateSar: 'Rate (SAR)', amountSar: 'Amount (SAR)', subTotal: 'Sub Total (SAR)', total: 'Total with tax (SAR)', notes: 'Notes' },
};

/** Fetch image URL and return as data URL for use in jsPDF addImage. */
export async function imageUrlToDataUrl(url) {
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (_) {
    return null;
  }
}
const TAX_RATE = 0.15;

const isTaxLine = (line) => {
  const name = (line.name || '').toLowerCase();
  return name.includes('tax') || name.includes('vat') || name.includes('ضريبة');
};

const isProgrammingOrInstallation = (line) => {
  const name = (line.name || '').toLowerCase();
  return (
    name.includes('programming') ||
    name.includes('installation') ||
    name.includes('برمجة') ||
    name.includes('تركيب')
  );
};

export function generateQuotationPdf(opts) {
  const {
    quotation,
    quoteNumber = 'QT-000001',
    billTo = 'Client',
    subject = 'Smart Home Quotation',
    quoteDate = new Date(),
    company = {},
    notes = 'Looking forward for your business.',
    signatureName = 'Anas Salem',
    signatureTitle = 'Operation Manager',
    terms = {},
    language = 'en',
    logoDataUrl = null,
    signatureDataUrl = null,
  } = opts;
  const labels = pdfLabels.en;

  const comp = { ...defaultCompany, ...company };
  const termsText = { ...defaultTerms, ...terms };

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  doc.setFont('helvetica');

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 18;
  let y = 18;

  const font = (size = 10, style = 'normal') => {
    doc.setFontSize(size);
    doc.setFont('helvetica', style);
  };
  const text = (str, x, yPos, options = {}) => doc.text(str, x, yPos, options);

  // ----- Page 1: Colored header band then logo (above), then company row -----
  const headerBandHeight = 7;
doc.setFillColor(2, 1, 43); // #02012B
  doc.rect(0, 0, pageW, headerBandHeight, 'F');

const logoW = 100; // was 70
const logoH = 20; // increase proportionally

  const logoY = 12;
  if (logoDataUrl) {
    try {
doc.addImage(
  logoDataUrl,
  'PNG',
  pageW - margin - logoW,
  logoY,
  logoW,
  logoH
);
    } catch (_) {}
  }

  doc.setTextColor(0, 0, 0);
  y = logoY + logoH + 10;

  const rightColX = pageW - margin - 58;
  const rowH = 6;

  // Left column at margin | right column (Quote, contact, License, VAT)
  font(14, 'bold');
  text(comp.name, margin, y);
  font(16, 'bold');
  text(labels.quote, rightColX, y);

  font(10, 'normal');
  text(comp.address, margin, y + rowH);
  font(11, 'normal');
  text(`# ${quoteNumber}`, rightColX, y + rowH);

  text(comp.country, margin, y + rowH * 2);
  text(comp.phone, rightColX, y + rowH * 2);

  font(10, 'bold');
  text(labels.billTo, margin, y + rowH * 3);
  font(10, 'normal');
  text(comp.email, rightColX, y + rowH * 3);

  text(billTo, margin, y + rowH * 4);
  text(comp.website, rightColX, y + rowH * 4);

  if (comp.licenseNumber) {
    font(9, 'normal');
    text(`License: ${comp.licenseNumber}`, rightColX, y + rowH * 5);
  }
  if (comp.vatNumber) {
    text(`VAT: ${comp.vatNumber}`, rightColX, comp.licenseNumber ? y + rowH * 6 : y + rowH * 5);
    font(10, 'normal');
  }

  y += (comp.licenseNumber || comp.vatNumber ? rowH * 7 : rowH * 5) + 6;

  // Subject & Date
  text('Subject:', margin, y);
  text(subject, margin + 16, y);
  y += 5;
  const dateStr = quoteDate instanceof Date ? quoteDate : new Date(quoteDate);
  const dateFormatted = dateStr.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  text(`${labels.quoteDate}: ${dateFormatted}`, margin, y);
  y += 12;

  const lines = quotation.lines || [];

// 1️⃣ remove tax line from table
const tableLines = lines.filter((line) => !isTaxLine(line));

const tableData = tableLines.length
  ? tableLines.map((line, i) => {
      let unitPrice = Number(line.unitPrice) || 0;
      let subtotal = Number(line.subtotal) || 0;

      // 2️⃣ remove 15% ONLY for programming & installation (table only)
      if (isProgrammingOrInstallation(line)) {
        unitPrice = unitPrice / (1 + TAX_RATE);
        subtotal = subtotal / (1 + TAX_RATE);
      }

    // remove "(15%)" or any percentage text from table display
const cleanName = (line.name || '').replace(/\s*\(\s*\d+%\s*\)/g, '');

return [
  i + 1,
  cleanName || '—',
  formatNum(line.qty ?? 0),
  formatNum(unitPrice),
  formatNum(subtotal),
];

    })
  : [[1, 'No items', '0.00', '0.00', '0.00']];

  doc.autoTable({
    startY: y,
    head: [['#', labels.itemDesc, 'Qty', labels.rateSar, labels.amountSar]],
    body: tableData,
    margin: { left: margin, right: margin },
    theme: 'grid',
    headStyles: {
     fillColor: [2, 1, 43],
      textColor: [255, 255, 255],
      fontSize: 10,
      fontStyle: 'bold',
    },
    bodyStyles: { fontSize: 10 },
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 22 },
      3: { cellWidth: 28 },
      4: { cellWidth: 28 },
    },
  });
  y = doc.lastAutoTable.finalY + 8;


  const subTotalWithoutTax = (quotation.lines || [])
    .filter((line) => !isTaxLine(line))
    .reduce((sum, line) => sum + (Number(line.subtotal) || 0), 0);
const totalWithTax =
  Math.round(subTotalWithoutTax * (1 + TAX_RATE) * 100) / 100;
  const amountX = margin + 48;

  font(10);
  text(labels.subTotal, margin, y);
  text(formatNum(subTotalWithoutTax), amountX, y);
  y += 7;
  font(11, 'bold');
  text(labels.total, margin, y);
  font(11, 'normal');
  text(formatNum(totalWithTax), amountX, y);
  y += 16;

  // Notes
  font(10, 'bold');
  text(labels.notes, margin, y);
  font(10, 'normal');
  y += 6;
  const noteLines = doc.splitTextToSize(notes, pageW - 2 * margin);
  noteLines.forEach((line) => {
    text(line, margin, y);
    y += 5;
  });
  y += 8;

  // Signature image + name + title (larger for clarity)
  const sigW = 45;
  const sigH = 45;
  if (signatureDataUrl) {
    try {
      doc.addImage(signatureDataUrl, 'PNG', margin, y, sigW, sigH);
      y += sigH + 5;
    } catch (_) {
      y += 2;
    }
  }
  font(10, 'bold');
  text(signatureName, margin, y);
  font(10, 'normal');
  y += 5;
  text(signatureTitle, margin, y);

  return doc;
}

/**
 * Generate and download the PDF immediately (sync). Caller must pass logoDataUrl and signatureDataUrl (e.g. from preload).
 */
export function downloadQuotationPdf(opts, filename) {
  const name = filename || 'Quotation.pdf';
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

  // ⏳ Let UI breathe (prevents freeze)
  setTimeout(() => {
    const doc = generateQuotationPdf(opts);

    if (isIOS) {
      // ✅ ONLY method Safari allows
      const blob = doc.output('blob');
      const url = URL.createObjectURL(blob);

      // MUST be same-tab navigation
      window.location.href = url;

      // cleanup
      setTimeout(() => URL.revokeObjectURL(url), 15000);
    } else {
      doc.save(name);
    }
  }, 0);
}

