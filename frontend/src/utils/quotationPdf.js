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
 * @param {string} [opts.language] - 'en' | 'ar' (PDF uses English labels for reliable rendering)
 */
const pdfLabels = {
  en: { quote: 'Quote', billTo: 'Bill To', quoteDate: 'Quote Date', itemDesc: 'Item & Description', rateSar: 'Rate (SAR)', amountSar: 'Amount (SAR)', subTotal: 'Sub Total (SAR)', total: 'Total (SAR)', notes: 'Notes' },
  ar: { quote: 'Quote', billTo: 'Bill To', quoteDate: 'Quote Date', itemDesc: 'Item & Description', rateSar: 'Rate (SAR)', amountSar: 'Amount (SAR)', subTotal: 'Sub Total (SAR)', total: 'Total (SAR)', notes: 'Notes' },
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
  } = opts;
  const labels = pdfLabels[language === 'ar' ? 'ar' : 'en'] || pdfLabels.en;

  const comp = { ...defaultCompany, ...company };
  const termsText = { ...defaultTerms, ...terms };

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 18;
  let y = 20;

  const font = (size = 10) => doc.setFontSize(size);
  const text = (str, x, yPos, options = {}) => doc.text(str, x, yPos, options);

  // ----- Page 1 -----
  font(18);
  text(labels.quote, margin, y);
  y += 10;

  font(11);
  text(`# ${quoteNumber}`, margin, y);
  y += 8;

  // Company block
  font(10);
  text(comp.name, margin, y);
  y += 5;
  text(comp.address, margin, y);
  y += 5;
  text(comp.country, margin, y);
  y += 5;
  text(comp.phone, margin, y);
  y += 5;
  text(comp.email, margin, y);
  y += 5;
  text(comp.website, margin, y);
  if (comp.licenseNumber) {
    y += 5;
    text(`License Number: ${comp.licenseNumber}`, margin, y);
  }
  if (comp.vatNumber) {
    y += 5;
    text(`VAT Number: ${comp.vatNumber}`, margin, y);
  }
  y += 10;

  // Bill To
  text(labels.billTo, margin, y);
  y += 5;
  text(billTo, margin, y);
  y += 8;

  // Subject & Date
  text(': Subject', margin, y);
  text(subject, margin + 22, y);
  y += 6;
  const dateStr = quoteDate instanceof Date ? quoteDate : new Date(quoteDate);
  const dateFormatted = dateStr.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  text(`${labels.quoteDate} : ${dateFormatted}`, margin, y);
  y += 12;

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
    headStyles: { fillColor: [60, 60, 60], fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 22 },
      3: { cellWidth: 28 },
      4: { cellWidth: 28 },
    },
  });
  y = doc.lastAutoTable.finalY + 8;

  // Sub Total / Total
  const totalX = pageW - margin - 45;
  text(labels.subTotal, totalX - 35, y);
  text(formatNum(quotation.total ?? 0), totalX, y);
  y += 6;
  font(11);
  text(labels.total, totalX - 35, y);
  text(formatNum(quotation.total ?? 0), totalX, y);
  y += 14;

  font(10);
  text(labels.notes, margin, y);
  y += 5;
  const noteLines = doc.splitTextToSize(notes, pageW - 2 * margin);
  noteLines.forEach((line) => {
    text(line, margin, y);
    y += 5;
  });
  y += 5;
  text(signatureName, margin, y);
  y += 5;
  text(signatureTitle, margin, y);
  y += 10;

  // Footer page 1
  font(9);
  text('-- 1 of 2 --', pageW / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });

  // ----- Page 2 -----
  doc.addPage();
  y = 20;

  font(12);
  text('Payment Terms:', margin, y);
  y += 8;
  font(10);
  (termsText.payment || []).forEach((item) => {
    const lines = doc.splitTextToSize(`• ${item}`, pageW - 2 * margin - 6);
    lines.forEach((line) => {
      text(line, margin + 4, y);
      y += 5;
    });
    y += 2;
  });
  y += 4;

  font(12);
  text('Installation Duration (Per Apartment):', margin, y);
  y += 8;
  font(10);
  (termsText.installation || []).forEach((item) => {
    const lines = doc.splitTextToSize(`• ${item}`, pageW - 2 * margin - 6);
    lines.forEach((line) => {
      text(line, margin + 4, y);
      y += 5;
    });
    y += 2;
  });
  y += 4;

  font(12);
  text('Warranty & Support:', margin, y);
  y += 8;
  font(10);
  (termsText.warranty || []).forEach((item) => {
    const lines = doc.splitTextToSize(`• ${item}`, pageW - 2 * margin - 6);
    lines.forEach((line) => {
      text(line, margin + 4, y);
      y += 5;
    });
    y += 2;
  });
  y += 4;

  font(12);
  text('Validity of Quotation', margin, y);
  y += 6;
  font(10);
  const validityLines = doc.splitTextToSize(`• ${termsText.validity || ''}`, pageW - 2 * margin - 6);
  validityLines.forEach((line) => {
    text(line, margin + 4, y);
    y += 5;
  });
  y += 6;

  font(12);
  text('Exclusions:', margin, y);
  y += 6;
  font(10);
  const exclLines = doc.splitTextToSize(`• ${termsText.exclusions || ''}`, pageW - 2 * margin - 6);
  exclLines.forEach((line) => {
    text(line, margin + 4, y);
    y += 5;
  });

  text('-- 2 of 2 --', pageW / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });

  return doc;
}

/**
 * Generate and download the PDF with a filename.
 */
export function downloadQuotationPdf(opts, filename) {
  const doc = generateQuotationPdf(opts);
  const name = filename || `Quotation-${opts.quoteNumber || 'QT-000001'}.pdf`;
  doc.save(name);
}
