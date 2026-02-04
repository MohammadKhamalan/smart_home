# Smart Home & AI Quotation System

Web app with login, three quotation modes (Smart Home, AI, Smart Home Rough), and a unified quotation form. Uses SQLite for users and stock.

## Features

- **Login**: Username & password (stored in SQLite)
- **Dashboard**: Three options — Smart Home, AI, Smart Home (Rough)
- **Smart Home**: Choose buttons, screens, sensors (types & quantities). Quotation based on stock and unit prices.
- **AI**: Enter service description and type. Get a quotation on the same form.
- **Smart Home (Rough)**: Select number of rooms, area (m²), house shape. Approximate quotation based on dummy room data (e.g. typical buttons + AC per room).
- **Database**: Users table for login; stock table for quantities and prices; quotations table to save quotations.

## Run the project

### 1. Backend (Node.js)

```bash
cd quotation-app/backend
npm install
node initDb.js
npm start
```

Backend runs on **http://localhost:5000**.

### 2. Frontend (React + Vite)

```bash
cd quotation-app/frontend
npm install
npm run dev
```

Frontend runs on **http://localhost:3000** and proxies `/api` to the backend.

### 3. Login

- **Username**: `admin` or `user1`
- **Password**: `password123`

## Tech

- **Backend**: Express, SQLite (better-sqlite3), CORS
- **Frontend**: React 18, React Router, Vite
- **DB**: `quotation.db` (created in `backend/` by `initDb.js`)

## Database

- **users**: id, username, password
- **stock**: id, item_type, item_name, unit_price, quantity_in_stock, category (buttons/screens/sensors)
- **room_costs**: default costs per room type for rough quotation
- **quotations**: saved quotations (user_id, type, data, total)

Dummy data is seeded by `node initDb.js`.
