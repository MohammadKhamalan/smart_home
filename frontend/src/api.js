// In production (Vercel): set VITE_API_URL to your Railway backend URL.
// In local dev: leave unset → use '' so /api/* goes through Vite proxy to localhost:5000.
export const API_BASE = import.meta.env.VITE_API_URL || '';
