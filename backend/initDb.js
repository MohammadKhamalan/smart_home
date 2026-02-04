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

// Stock
db.exec(`
  CREATE TABLE IF NOT EXISTS stock (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_type TEXT NOT NULL,
    item_name TEXT NOT NULL,
    unit_price REAL NOT NULL,
    quantity_in_stock INTEGER DEFAULT 0,
    category TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

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

// Stock
const insertStock = db.prepare(`
  INSERT OR IGNORE INTO stock
  (id, item_type, item_name, unit_price, quantity_in_stock, category)
  VALUES (?, ?, ?, ?, ?, ?)
`);

[
  [1, 'button', 'Smart Switch Single', 45, 120, 'buttons'],
  [2, 'button', 'Smart Switch Double', 65, 85, 'buttons'],
  [3, 'button', 'Smart Dimmer', 55, 60, 'buttons'],
  [4, 'screen', '7" Touch Panel', 180, 40, 'screens'],
  [5, 'screen', '10" Wall Mount Display', 320, 25, 'screens'],
  [6, 'screen', 'Tablet Hub 8"', 250, 35, 'screens'],
  [7, 'sensor', 'Motion Sensor', 35, 200, 'sensors'],
  [8, 'sensor', 'Door/Window Sensor', 28, 150, 'sensors'],
  [9, 'sensor', 'Temperature/Humidity', 42, 90, 'sensors'],
  [10, 'sensor', 'Smart Thermostat', 95, 45, 'sensors'],
].forEach(row => insertStock.run(...row));

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
