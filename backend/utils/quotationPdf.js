const { jsPDF } = require('jspdf');
const { applyPlugin } = require('jspdf-autotable');

applyPlugin(jsPDF);

const formatNum = (n) => Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const defaultCompany = {
  name: 'Zuccess',
  address: 'Al Khobar',
  country: 'Kingdom of Saudi Arabia',
  phone: '+966 56 119 1797',
  email: 'info@zuccess.net',
  website: 'www.zuccess.ai',
  licenseNumber: '7042632393',
  vatNumber: '312668821500003',
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

  const logoW = 70;
  const logoH = 27;
  const logoY = 12;
  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, 'PNG', pageW - margin - logoW, logoY, logoW, logoH);
    } catch (_) {}
  }

  doc.setTextColor(0, 0, 0);
  y = logoY + logoH + 10;

  const rightColX = pageW - margin - 58;
  const rowH = 6;

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

  text('Subject:', margin, y);
  text(subject, margin + 16, y);
  y += 5;
  const dateStr = quoteDate instanceof Date ? quoteDate : new Date(quoteDate);
  const dateFormatted = dateStr.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  text(`${labels.quoteDate}: ${dateFormatted}`, margin, y);
  y += 12;

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
      fillColor: [25, 55, 95],
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
