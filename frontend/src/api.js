export const API_BASE = import.meta.env.VITE_API_URL;

if (!API_BASE) {
  console.error('❌ VITE_API_URL is not defined');
}
