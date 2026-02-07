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
 * @param {string} [opts.language] - 'en' | 'ar'
 * @param {string} [opts.arabicFontBase64] - optional base64 TTF for Arabic rendering
 * @param {string} [opts.logoDataUrl] - data URL of logo image (placed top-right)
 * @param {string} [opts.signatureDataUrl] - data URL of signature image (before signature name)
 */
const pdfLabels = {
  en: { quote: 'Quote', billTo: 'Bill To', quoteDate: 'Quote Date', itemDesc: 'Item & Description', rateSar: 'Rate (SAR)', amountSar: 'Amount (SAR)', subTotal: 'Sub Total (SAR)', total: 'Total with tax (SAR)', notes: 'Notes' },
  ar: { quote: 'عرض سعر', billTo: 'إلى', quoteDate: 'تاريخ العرض', itemDesc: 'البند والوصف', rateSar: 'السعر (ر.س)', amountSar: 'المبلغ (ر.س)', subTotal: 'المجموع الفرعي (ر.س)', total: 'الإجمالي (ر.س)', notes: 'ملاحظات' },
};

let cachedArabicFontBase64 = null;

function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

/** Load Arabic font once; use when generating PDF in Arabic so text renders correctly. */
export async function loadArabicFont() {
  if (cachedArabicFontBase64) return cachedArabicFontBase64;
  try {
    const url = 'https://cdn.jsdelivr.net/npm/@fontsource/amiri@5.0.8/files/amiri-arabic-400-normal.ttf';
    const res = await fetch(url);
    if (!res.ok) return null;
    const ab = await res.arrayBuffer();
    cachedArabicFontBase64 = arrayBufferToBase64(ab);
    return cachedArabicFontBase64;
  } catch (_) {
    return null;
  }
}

/** Fetch image URL and return as data URL for use in jsPDF addImage. */
async function imageUrlToDataUrl(url) {
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
    arabicFontBase64 = null,
    logoDataUrl = null,
    signatureDataUrl = null,
  } = opts;
  const isArabic = language === 'ar';
  const labels = pdfLabels[isArabic ? 'ar' : 'en'] || pdfLabels.en;

  const comp = { ...defaultCompany, ...company };
  const termsText = { ...defaultTerms, ...terms };

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  doc.setFont('helvetica');
  if (isArabic && arabicFontBase64) {
    try {
      doc.addFileToVFS('Amiri-Regular.ttf', arabicFontBase64);
      doc.addFont('Amiri-Regular.ttf', 'Amiri', 'normal');
      doc.setFont('Amiri', 'normal');
    } catch (_) {}
  }

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 18;
  let y = 18;

  const font = (size = 10, style = 'normal') => {
    doc.setFontSize(size);
    if (!isArabic || !arabicFontBase64) doc.setFont('helvetica', style);
  };
  const text = (str, x, yPos, options = {}) => doc.text(str, x, yPos, options);

  // ----- Page 1: Colored header band then logo and title -----
  const headerBandHeight = 7;
  doc.setFillColor(41, 98, 255); // blue header
  doc.rect(0, 0, pageW, headerBandHeight, 'F');

  const logoW = 32;
  const logoH = 14;
  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, 'PNG', pageW - margin - logoW, y, logoW, logoH);
    } catch (_) {}
  }

  doc.setTextColor(0, 0, 0);
  font(16, 'bold');
  text(labels.quote, margin, y + 5);
  font(11, 'normal');
  text(`# ${quoteNumber}`, margin, y + 10);
  y += 18;

  // Company block — left column: name, address, country | right column: contact + legal
  const rightColX = margin + 95;
  let yLeft = y;
  let yRight = y;

  font(14, 'bold');
  text(comp.name, margin, yLeft);
  yLeft += 7;

  font(10, 'normal');
  text(comp.address, margin, yLeft);
  yLeft += 5;
  text(comp.country, margin, yLeft);
  yLeft += 5;

  text(comp.phone, rightColX, yRight);
  yRight += 5;
  text(comp.email, rightColX, yRight);
  yRight += 5;
  text(comp.website, rightColX, yRight);
  yRight += 5;
  if (comp.licenseNumber || comp.vatNumber) {
    font(9, 'normal');
    const licenseStr = comp.licenseNumber ? `License: ${comp.licenseNumber}` : '';
    const vatStr = comp.vatNumber ? `VAT: ${comp.vatNumber}` : '';
    const legalLine = [licenseStr, vatStr].filter(Boolean).join('   ·   ');
    text(legalLine, rightColX, yRight);
    font(10, 'normal');
    yRight += 5;
  }

  y = Math.max(yLeft, yRight) + 10;

  // Bill To
  font(10, 'bold');
  text(labels.billTo, margin, y);
  font(10, 'normal');
  y += 6;
  text(billTo, margin, y);
  y += 10;

  // Subject & Date
  text('Subject:', margin, y);
  text(subject, margin + 22, y);
  y += 6;
  const dateStr = quoteDate instanceof Date ? quoteDate : new Date(quoteDate);
  const dateFormatted = dateStr.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  text(`${labels.quoteDate}: ${dateFormatted}`, margin, y);
  y += 14;

  // Table: # | Item & Description | Qty | Rate | Amount (include all lines so table is never empty)
  const lines = quotation.lines || [];
  const tableData = lines.length
    ? lines.map((line, i) => [
        i + 1,
        line.name || '—',
        formatNum(line.qty ?? 0),
        formatNum(line.unitPrice ?? 0),
        formatNum(line.subtotal ?? 0),
      ])
    : [[1, 'No items', '0.00', '0.00', '0.00']];

  doc.autoTable({
    startY: y,
    head: [['#', labels.itemDesc, 'Qty', labels.rateSar, labels.amountSar]],
    body: tableData,
    margin: { left: margin, right: margin },
    theme: 'grid',
    headStyles: {
      fillColor: [41, 98, 255],
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

  // Sub Total = sum of all lines except tax. Total = sub total + 15% tax.
  const isTaxLine = (line) => {
    const name = (line.name || '').toLowerCase();
    return name.includes('tax') || name.includes('ضريبة');
  };
  const subTotalWithoutTax = (quotation.lines || [])
    .filter((line) => !isTaxLine(line))
    .reduce((sum, line) => sum + (Number(line.subtotal) || 0), 0);
  const totalWithTax = Math.round(subTotalWithoutTax * 1.15 * 100) / 100;
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
  y += 12;

  // Footer page 1
  font(9);
  text('-- 1 of 2 --', pageW / 2, pageH - 10, { align: 'center' });

  // ----- Page 2 -----
  doc.addPage();
  y = 22;

  font(11, 'bold');
  text('Payment Terms:', margin, y);
  font(10, 'normal');
  y += 8;
  (termsText.payment || []).forEach((item) => {
    const lines = doc.splitTextToSize(`• ${item}`, pageW - 2 * margin - 6);
    lines.forEach((line) => {
      text(line, margin + 4, y);
      y += 5;
    });
    y += 2;
  });
  y += 4;

  font(11, 'bold');
  text('Installation Duration (Per Apartment):', margin, y);
  font(10, 'normal');
  y += 8;
  (termsText.installation || []).forEach((item) => {
    const lines = doc.splitTextToSize(`• ${item}`, pageW - 2 * margin - 6);
    lines.forEach((line) => {
      text(line, margin + 4, y);
      y += 5;
    });
    y += 2;
  });
  y += 4;

  font(11, 'bold');
  text('Warranty & Support:', margin, y);
  font(10, 'normal');
  y += 8;
  (termsText.warranty || []).forEach((item) => {
    const lines = doc.splitTextToSize(`• ${item}`, pageW - 2 * margin - 6);
    lines.forEach((line) => {
      text(line, margin + 4, y);
      y += 5;
    });
    y += 2;
  });
  y += 4;

  font(11, 'bold');
  text('Validity of Quotation', margin, y);
  font(10, 'normal');
  y += 6;
  const validityLines = doc.splitTextToSize(`• ${termsText.validity || ''}`, pageW - 2 * margin - 6);
  validityLines.forEach((line) => {
    text(line, margin + 4, y);
    y += 5;
  });
  y += 6;

  font(11, 'bold');
  text('Exclusions:', margin, y);
  font(10, 'normal');
  y += 6;
  const exclLines = doc.splitTextToSize(`• ${termsText.exclusions || ''}`, pageW - 2 * margin - 6);
  exclLines.forEach((line) => {
    text(line, margin + 4, y);
    y += 5;
  });

  text('-- 2 of 2 --', pageW / 2, pageH - 10, { align: 'center' });

  return doc;
}

/**
 * Generate and download the PDF with a filename.
 * When opts.language is 'ar', loads Arabic font. When opts.logoUrl/signatureUrl are set, loads images.
 */
export async function downloadQuotationPdf(opts, filename) {
  opts = { ...opts };
  if (opts.language === 'ar') {
    const fontBase64 = await loadArabicFont();
    if (fontBase64) opts.arabicFontBase64 = fontBase64;
  }
  if (opts.logoUrl) {
    const dataUrl = await imageUrlToDataUrl(opts.logoUrl);
    if (dataUrl) opts.logoDataUrl = dataUrl;
  }
  if (opts.signatureUrl) {
    const dataUrl = await imageUrlToDataUrl(opts.signatureUrl);
    if (dataUrl) opts.signatureDataUrl = dataUrl;
  }
  const doc = generateQuotationPdf(opts);
  const name = filename || `Quotation-${opts.quoteNumber || 'QT-000001'}.pdf`;
  doc.save(name);
}
