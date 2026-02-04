# Deploy: Backend (Railway) + Frontend (Vercel)

## Repo prep (done)

- [x] `backend/.gitignore`: `quotation.db`, `node_modules`
- [x] `backend/package.json`: `engines.node: "20.x"`, `postinstall: "node initDb.js"`, `start: "node server.js"`
- [x] Frontend uses `VITE_API_URL` via `src/api.js` (`API_BASE`)
- [x] Backend CORS allows `localhost:5173`, `localhost:3000`, and `FRONTEND_URL` (set in Railway)

## Part A — Push to GitHub

```bash
git add .
git commit -m "Prepare for deployment"
git push
```

## Part B — Deploy backend on Railway

1. **New Project → Deploy from GitHub repo** → select this repo.
2. **Settings** for the service:
   - **Root Directory**: `backend`
   - **Start Command**: `npm start`
   - **Build Command** (optional): leave default, or `npm install` (postinstall will run `node initDb.js`).
3. After deploy, copy the public URL (e.g. `https://your-app.up.railway.app`).
4. **Variables**: add `FRONTEND_URL` = your Vercel frontend URL (e.g. `https://your-frontend.vercel.app`) after you deploy the frontend.
5. Test: open `https://your-app.up.railway.app/api/health` → should return `{"status":"ok"}`.

## Part C — Deploy frontend on Vercel

1. **New Project → Import** this GitHub repo.
2. **Settings**:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
3. **Environment Variables**:
   - Key: `VITE_API_URL`
   - Value: `https://your-app.up.railway.app` (your Railway backend URL, no trailing slash)
4. Deploy. Copy the frontend URL (e.g. `https://your-frontend.vercel.app`).
5. In **Railway**, set `FRONTEND_URL` to that Vercel URL (for CORS).

## Test end-to-end

- Open the Vercel URL → login (e.g. admin / password123), stock, quotations should work.

## Notes

- SQLite on Railway can reset on redeploy/restart; fine for demo/MVP. For production persistence, consider PostgreSQL.
- Multiple frontend origins: set `FRONTEND_URL` to comma-separated URLs (e.g. main + Vercel preview URLs).
