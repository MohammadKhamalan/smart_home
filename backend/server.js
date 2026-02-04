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

  db.prepare(`
    INSERT INTO quotations (user_id, type, data, total)
    VALUES (?, ?, ?, ?)
  `).run(userId || null, type, JSON.stringify(data || {}), total);

  res.json({ success: true });
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
