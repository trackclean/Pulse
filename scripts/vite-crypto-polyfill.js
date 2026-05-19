// Ensure getRandomValues is available on Node's crypto for Vite runtime
try {
  const crypto = require('node:crypto');
  // If node:crypto doesn't expose getRandomValues, map the webcrypto one
  if (typeof crypto.getRandomValues !== 'function' && crypto.webcrypto && typeof crypto.webcrypto.getRandomValues === 'function') {
    crypto.getRandomValues = crypto.webcrypto.getRandomValues.bind(crypto.webcrypto);
  }
  // Also ensure globalThis.crypto exists (some code reads globalThis.crypto)
  if (typeof globalThis.crypto === 'undefined' && crypto.webcrypto) {
    globalThis.crypto = crypto.webcrypto;
  }
} catch (e) {
  // best-effort; if this fails, let Vite surface the original error
}
