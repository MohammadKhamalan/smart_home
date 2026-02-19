const { jsPDF } = require('jspdf');
const { applyPlugin } = require('jspdf-autotable');

applyPlugin(jsPDF);

const formatNum = (n) => Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const defaultCompany = {
  name: 'Zuccess',
  nameAr: 'شركة الصفقة المضمونة',
  nameEn: 'Guaranteed Deal Company',
  address: 'AL Khobar',
  country: 'Kingdom of Saudi Arabia',
  phone: '+966 56 119 1797',
  email: 'info@zuccess.ai',
  website: 'www.zuccess.ai',
  licenseNumber: '2051247739',
  vatNumber: '311640292300003',
};

const pdfLabels = {
  en: { quote: 'Quote', billTo: 'Bill To', quoteDate: 'Quote Date', itemDesc: 'Item & Description', rateSar: 'Rate (SAR)', amountSar: 'Amount (SAR)', subTotal: 'Sub Total (SAR)', total: 'Total with tax (SAR)', notes: 'Notes' },
};

function generateQuotationPdf(opts) {
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
    logoDataUrl = null,
    signatureDataUrl = null,
  } = opts;
  const labels = pdfLabels.en;
  const comp = { ...defaultCompany, ...company };

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

  const headerBandHeight = 7;
  doc.setFillColor(25, 55, 95);
  doc.rect(0, 0, pageW, headerBandHeight, 'F');

  // Logo top-left (expanded width and height); no text block next to logo
  const logoW = 38;
  const logoH = 38;
  const logoY = 10;
  const logoX = 5;
  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, 'PNG', logoX, logoY, logoW, logoH);
    } catch (_) {}
  }

  const rightEdgeX = pageW - margin;
  const rowH = 5.5;
  let headerY = logoY + 14;
  doc.setTextColor(130, 147, 179);
  font(16, 'bold');
  text(labels.quote, rightEdgeX, headerY, { align: 'right' });
  font(11, 'normal');
  text(`#${quoteNumber}`, rightEdgeX, headerY + rowH, { align: 'right' });
  doc.setTextColor(0, 0, 0);

  // Left column below logo: Zuccess (blue), address, country, email (blue), website (blue)
  y = logoY + logoH + 18;
  const blue = [0, 51, 153];
  font(12, 'bold');
  doc.setTextColor(blue[0], blue[1], blue[2]);
  text(comp.name, margin, y);
  doc.setTextColor(0, 0, 0);
  font(10, 'normal');
  text(comp.address, margin, y + rowH);
  text(comp.country, margin, y + rowH * 2);
  doc.setTextColor(blue[0], blue[1], blue[2]);
  text(comp.email, margin, y + rowH * 3);
  text(comp.website, margin, y + rowH * 4);
  doc.setTextColor(0, 0, 0);

  // Right column: Quote Date, Commercial Registration (CR), VAT Registration No.
  const dateStr = quoteDate instanceof Date ? quoteDate : new Date(quoteDate);
  const dateFormatted = dateStr.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  font(10, 'normal');
  text(`${labels.quoteDate} : ${dateFormatted}`, rightEdgeX, y, { align: 'right' });
  if (comp.licenseNumber) {
    text(`Commercial Registration (CR): ${comp.licenseNumber}`, rightEdgeX, y + rowH, { align: 'right' });
  }
  if (comp.vatNumber) {
    text(`VAT Registration No.: ${comp.vatNumber}`, rightEdgeX, y + rowH * (comp.licenseNumber ? 2 : 1), { align: 'right' });
  }

  y += (comp.licenseNumber && comp.vatNumber ? rowH * 3 : comp.licenseNumber || comp.vatNumber ? rowH * 2 : rowH) + 12;

  const lines = quotation.lines || [];

  const isTaxLine = (line) => {
    const name = (line.name || '').toLowerCase();
    return name.includes('tax') || name.includes('ضريبة');
  };

  const displayLines = lines.filter((line) => !isTaxLine(line));

  // Bill To above the table
  font(10, 'bold');
  text(labels.billTo, margin, y);
  font(10, 'normal');
  text(billTo, margin + 18, y);
  y += 8;

  const tableData = displayLines.length
    ? displayLines.map((line, i) => {
        const rawName = line.name || '—';
        const lower = rawName.toLowerCase();
        let displayName = rawName;
        if (lower.includes('installation') && lower.includes('programming')) {
          displayName = rawName.replace(/15\s*%/gi, '').replace(/\(\s*\)/g, '').replace(/\s{2,}/g, ' ').trim();
        }
        return [
          i + 1,
          displayName,
          formatNum(line.qty ?? 0),
          formatNum(line.unitPrice ?? 0),
          formatNum(line.subtotal ?? 0),
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
      fillColor: [25, 55, 95],
      textColor: [255, 255, 255],
      fontSize: 10,
      fontStyle: 'bold',
    },
    bodyStyles: { fontSize: 10 },
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 'auto', overflow: 'linebreak', cellPadding: 3 },
      2: { cellWidth: 22 },
      3: { cellWidth: 28 },
      4: { cellWidth: 28 },
    },
  });
  y = doc.lastAutoTable.finalY + 8;

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

module.exports = { generateQuotationPdf };
