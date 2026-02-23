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
  'https://smart-home-b61362i9o-mohammad-khalanas-projects.vercel.app',
  ...(process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean) : []),
];

// Allow any Vercel deployment (*.vercel.app) so preview and production URLs work
function originAllowed(origin) {
  if (!origin) return true;
  if (allowedOrigins.includes(origin)) return true;
  try {
    const u = new URL(origin);
    if (u.hostname.endsWith('.vercel.app')) return true;
  } catch (_) {}
  return false;
}

const corsOptions = {
  origin: function (origin, callback) {
    callback(null, originAllowed(origin));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // IMPORTANT

// Ensure CORS is set on every response (helps when Render returns or app errors)
function setCorsIfAllowed(req, res, next) {
  const origin = req.get('Origin');
  if (origin && originAllowed(origin)) {
    res.set('Access-Control-Allow-Origin', origin);
  }
  res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
}
app.use(setCorsIfAllowed);

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

// Max 800KB per image to avoid OOM on Render (512MB limit)
const MAX_IMAGE_BYTES = 800 * 1024;

function loadLocalImageDataUrl(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    const stat = fs.statSync(filePath);
    if (stat.size > MAX_IMAGE_BYTES) return null;
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

    // Limit lines to avoid huge payloads and OOM
    const lines = Array.isArray(quotation.lines) ? quotation.lines.slice(0, 200) : [];
    const safeQuotation = { ...quotation, lines };

    const assetsDir = path.join(__dirname, 'assets');
    const logoDataUrl = loadLocalImageDataUrl(path.join(assetsDir, 'logo.png'));
    const signatureDataUrl = loadLocalImageDataUrl(path.join(assetsDir, 'signature.png')) || loadLocalImageDataUrl(path.join(assetsDir, 'signiture.png'));

    const opts = {
      quotation: safeQuotation,
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
    const arrayBuffer = doc.output('arraybuffer');
    const buffer = Buffer.from(arrayBuffer);
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
   Serve generated PDFs from public/pdf (read file from there; works on iPhone)
========================= */

if (!fs.existsSync(pdfDir)) {
  fs.mkdirSync(pdfDir, { recursive: true });
}

// Serve PDF with Content-Disposition so opening the URL can trigger download
app.get('/pdf/:filename', (req, res, next) => {
  const filename = path.basename(req.params.filename);
  if (!filename.endsWith('.pdf')) return next();
  const filePath = path.join(pdfDir, filename);
  if (!fs.existsSync(filePath)) return res.status(404).send('Not found');
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.sendFile(path.resolve(filePath));
});

app.use('/pdf', express.static(pdfDir));

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
