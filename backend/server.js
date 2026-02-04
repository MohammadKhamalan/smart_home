const express = require('express');
const cors = require('cors');
const path = require('path');
const Database = require('better-sqlite3');

const app = express();
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  ...(process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(',').map((u) => u.trim()).filter(Boolean)
    : []),
];
app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

// SQLite database
const db = new Database(path.join(__dirname, 'quotation.db'));

/* =========================
   AUTH
========================= */

// Login
app.post('/api/login', (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res
      .status(400)
      .json({ success: false, message: 'Username and password required' });
  }

  const stmt = db.prepare(
    'SELECT id, username FROM users WHERE username = ? AND password = ?'
  );
  const user = stmt.get(username, password);

  if (!user) {
    return res
      .status(401)
      .json({ success: false, message: 'Invalid username or password' });
  }

  res.json({ success: true, user });
});

/* =========================
   STOCK
========================= */

app.get('/api/stock', (req, res) => {
  const { category } = req.query;

  let rows;
  if (category) {
    rows = db
      .prepare('SELECT * FROM stock WHERE category = ? ORDER BY item_name')
      .all(category);
  } else {
    rows = db
      .prepare('SELECT * FROM stock ORDER BY category, item_name')
      .all();
  }

  res.json(rows);
});

/* =========================
   ROOM COSTS
========================= */

app.get('/api/room-costs', (req, res) => {
  const rows = db.prepare('SELECT * FROM room_costs').all();
  res.json(rows);
});

/* =========================
   QUOTATIONS
========================= */

app.post('/api/quotations', (req, res) => {
  const { userId, type, data, total } = req.body;

  if (!type || total == null) {
    return res
      .status(400)
      .json({ success: false, message: 'Invalid quotation data' });
  }

  db.prepare(`
    INSERT INTO quotations (user_id, type, data, total)
    VALUES (?, ?, ?, ?)
  `).run(userId || null, type, JSON.stringify(data || {}), total);

  res.json({ success: true });
});

/* =========================
   HEALTH CHECK
========================= */

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

/* =========================
   START SERVER
========================= */

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});
