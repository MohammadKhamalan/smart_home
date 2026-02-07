/**
 * Web Worker: generate PDF off the main thread so the page stays responsive
 * (avoids "page unresponsive" on mobile and slow/frozen UI on laptop).
 */
import { generateQuotationPdf } from './quotationPdf.js';

self.onmessage = (e) => {
  const { opts, filename } = e.data || {};
  try {
    const doc = generateQuotationPdf(opts);
    const blob = doc.output('blob');
    self.postMessage({ blob, filename }, [blob]);
  } catch (err) {
    self.postMessage({ error: String(err && err.message) });
  }
};
