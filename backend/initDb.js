const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'quotation.db'));

/* =========================
   TABLES
========================= */

// Users
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Stock (categories: curtain, switches, control_panels, smart_door_locks, sensors, ac)
db.exec(`
  CREATE TABLE IF NOT EXISTS stock (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_type TEXT NOT NULL,
    item_name TEXT NOT NULL,
    unit_price REAL NOT NULL,
    quantity_in_stock INTEGER DEFAULT 0,
    category TEXT NOT NULL,
    photo TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);
try { db.exec('ALTER TABLE stock ADD COLUMN photo TEXT DEFAULT ""'); } catch (_) {}

// Quotations
db.exec(`
  CREATE TABLE IF NOT EXISTS quotations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    type TEXT NOT NULL,
    data TEXT,
    total REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )
`);

// Room costs
db.exec(`
  CREATE TABLE IF NOT EXISTS room_costs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_type TEXT NOT NULL,
    default_buttons INTEGER DEFAULT 2,
    default_ac_units INTEGER DEFAULT 1,
    cost_per_button REAL DEFAULT 50,
    cost_per_ac REAL DEFAULT 120,
    notes TEXT
  )
`);

/* =========================
   SEED DATA
========================= */

// Users (demo only)
const insertUser = db.prepare(`
  INSERT OR IGNORE INTO users (username, password)
  VALUES (?, ?)
`);

insertUser.run('admin', 'password123');
insertUser.run('user1', 'password123');

// Stock: your catalog — curtain, switches, control_panels, smart_door_locks, sensors, ac
db.exec('DELETE FROM stock');
const insertStock = db.prepare(`
  INSERT INTO stock
  (id, item_type, item_name, unit_price, quantity_in_stock, category, photo)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

const PH = 'https://placehold.co/120x120/e2e8f0/64748b?text=';
const stockRows = [
  [1, 'curtain', 'Smart curtain', 1200, 50, 'curtain', PH + 'Curtain'],
  [2, 'switch', 'smart switch 1gang', 190, 100, 'switches', PH + '1gang'],
  [3, 'switch', 'smart switch 2gang', 175, 100, 'switches', PH + '2gang'],
  [4, 'switch', 'smart switch 3gang', 168, 100, 'switches', PH + '3gang'],
  [5, 'panel', '4 Inch Smart Control Panel (Built-in Alexa)', 912, 40, 'control_panels', PH + '4in'],
  [6, 'panel', '10 inch Smart Home Control Panel', 2515, 25, 'control_panels', PH + '10in'],
  [7, 'lock', 'Smart Door Lock', 850, 30, 'smart_door_locks', PH + 'Lock'],
  [8, 'lock', 'Smart Door Lock', 1300, 30, 'smart_door_locks', PH + 'Lock2'],
  [9, 'sensor', 'Motion Sensors', 191, 80, 'sensors', PH + 'Motion'],
  [10, 'ac', 'Smart Thermostat Controller(IR)', 220, 60, 'ac', PH + 'IR'],
  [11, 'ac', 'Smart Thermostat Controller', 556, 50, 'ac', PH + 'Thermo'],
];
stockRows.forEach(row => insertStock.run(...row));

// Room costs
const insertRoomCost = db.prepare(`
  INSERT OR IGNORE INTO room_costs
  (id, room_type, default_buttons, default_ac_units, cost_per_button, cost_per_ac, notes)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

[
  [1, 'living_room', 4, 2, 50, 120, 'Living room typically has more switches and AC'],
  [2, 'bedroom', 2, 1, 50, 120, 'Standard bedroom'],
  [3, 'kitchen', 3, 1, 50, 120, 'Kitchen with extra switches'],
  [4, 'bathroom', 2, 0, 50, 0, 'Bathroom usually no AC'],
  [5, 'other', 2, 1, 50, 120, 'Other rooms'],
].forEach(row => insertRoomCost.run(...row));

console.log('✅ Database initialized successfully');
db.close();
