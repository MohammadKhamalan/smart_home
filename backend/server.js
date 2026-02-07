const express = require('express');
const cors = require('cors');
const path = require('path');
const Database = require('better-sqlite3');

const app = express();

/* =========================
   CORS (FINAL, SAFE VERSION)
========================= */

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://smart-home-sand-six.vercel.app',
];

const corsOptions = {
  origin: function (origin, callback) {
    // allow server-to-server, curl, postman
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // DO NOT throw error — just block silently
    return callback(null, false);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // IMPORTANT

app.use(express.json());

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
