// Backend base URL: set VITE_API_URL in Vercel to your Railway backend (e.g. https://your-app.up.railway.app)
// Leave unset in dev to use Vite proxy (/api -> localhost:5000)
export const API_BASE = import.meta.env.VITE_API_URL || '';
