const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const { generateQuotationPdf } = require('./utils/quotationPdf');

const app = express();

/* =========================
   CORS (FINAL, SAFE VERSION)
========================= */

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://smart-home-sand-six.vercel.app',
  ...(process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean) : []),
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(null, false);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // IMPORTANT

app.use(express.json({ limit: '512kb' }));

/* =========================
   DATABASE
========================= */

const db = new Database(
  process.env.DB_PATH || path.join(__dirname, 'quotation.db')
);

/* =========================
   AUTH
========================= */

app.post('/api/login', (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({
      success: false,
      message: 'Username and password required',
    });
  }

  const user = db
    .prepare(
      'SELECT id, username FROM users WHERE username = ? AND password = ?'
    )
    .get(username, password);

  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Invalid username or password',
    });
  }

  res.json({ success: true, user });
});

/* =========================
   STOCK
========================= */

app.get('/api/stock', (req, res) => {
  const { category } = req.query;

  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  const rows = category
    ? db
        .prepare('SELECT * FROM stock WHERE category = ? ORDER BY item_name')
        .all(category)
    : db
        .prepare('SELECT * FROM stock ORDER BY category, item_name')
        .all();

  res.json(rows);
});

/* =========================
   ROOM COSTS
========================= */

app.get('/api/room-costs', (req, res) => {
  res.json(db.prepare('SELECT * FROM room_costs').all());
});

/* =========================
   QUOTATIONS
========================= */

app.post('/api/quotations', (req, res) => {
  const { userId, type, data, total } = req.body;

  if (!type || total == null) {
    return res.status(400).json({
      success: false,
      message: 'Invalid quotation data',
    });
  }

  try {
    const insertQuotation = db.prepare(`
      INSERT INTO quotations (user_id, type, data, total)
      VALUES (?, ?, ?, ?)
    `);
    const updateStock = db.prepare(
      'UPDATE stock SET quantity_in_stock = MAX(0, quantity_in_stock - ?) WHERE id = ?'
    );

    const saveQuotationAndUpdateStock = db.transaction(() => {
      insertQuotation.run(userId || null, type, JSON.stringify(data || {}), total);

      // Deduct stock when saving smart-home quotation (lines with item id)
      if (type === 'smart-home' && data && Array.isArray(data.lines)) {
        for (const line of data.lines) {
          if (line.id != null && (line.qty || 0) > 0) {
            updateStock.run(line.qty, line.id);
          }
        }
      }
    });

    saveQuotationAndUpdateStock();

    // Return updated stock for smart-home so the UI can show new values immediately
    if (type === 'smart-home') {
      const updatedStock = db.prepare('SELECT * FROM stock ORDER BY category, item_name').all();
      return res.json({ success: true, updatedStock });
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Save quotation / update stock failed:', err);
    res.status(500).json({ success: false, message: 'Failed to save quotation or update stock' });
  }
});

/* =========================
   PDF (server-side): generate and save to public/pdf, return URL
========================= */

const publicDir = path.join(__dirname, 'public');
const pdfDir = path.join(publicDir, 'pdf');

function loadLocalImageDataUrl(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    const buf = fs.readFileSync(filePath);
    const base64 = buf.toString('base64');
    const ext = path.extname(filePath).toLowerCase();
    const mime = ext === '.png' ? 'image/png' : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'image/png';
    return `data:${mime};base64,${base64}`;
  } catch (_) {
    return null;
  }
}

app.post('/api/quotation/pdf', (req, res) => {
  try {
    const {
      quotation,
      quoteNumber = 'QT-000001',
      billTo = 'Client',
      subject = 'Smart Home Quotation',
      quoteDate,
      notes,
      signatureName,
      signatureTitle,
    } = req.body || {};

    if (!quotation) {
      return res.status(400).json({ success: false, message: 'quotation required' });
    }

    const assetsDir = path.join(__dirname, 'assets');
    const logoDataUrl = loadLocalImageDataUrl(path.join(assetsDir, 'logo.png'));
    const signatureDataUrl = loadLocalImageDataUrl(path.join(assetsDir, 'signature.png')) || loadLocalImageDataUrl(path.join(assetsDir, 'signiture.png'));

    const opts = {
      quotation,
      quoteNumber,
      billTo: (billTo && String(billTo).trim()) || 'Client',
      subject: subject || 'Smart Home Quotation',
      quoteDate: quoteDate ? new Date(quoteDate) : new Date(),
      notes: notes || 'Looking forward for your business.',
      signatureName: signatureName || 'Anas Salem',
      signatureTitle: signatureTitle || 'Operation Manager',
      logoDataUrl,
      signatureDataUrl,
    };

    const doc = generateQuotationPdf(opts);
    const safeNumber = String(quoteNumber).replace(/[^a-zA-Z0-9-_]/g, '_');
    const filename = `Quotation-${safeNumber}.pdf`;

    if (!fs.existsSync(pdfDir)) {
      fs.mkdirSync(pdfDir, { recursive: true });
    }
    const filePath = path.join(pdfDir, filename);
    const buffer = Buffer.from(doc.output('arraybuffer'));
    fs.writeFileSync(filePath, buffer);

    const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
    const url = `${baseUrl}/pdf/${filename}`;
    res.json({ success: true, url, filename });
  } catch (err) {
    console.error('PDF generation failed:', err);
    res.status(500).json({ success: false, message: 'Failed to generate PDF' });
  }
});

/* =========================
   Serve generated PDFs from public/pdf
========================= */

if (fs.existsSync(pdfDir)) {
  app.use('/pdf', express.static(pdfDir));
} else {
  fs.mkdirSync(pdfDir, { recursive: true });
  app.use('/pdf', express.static(pdfDir));
}

/* =========================
   HEALTH
========================= */

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

/* =========================
   START
========================= */

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Backend running on port ${PORT}`);
});
