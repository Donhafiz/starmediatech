// Portfolio page scripts (shim)
document.addEventListener('DOMContentLoaded', () => {
  // If portfolio-specific functions are present, call them safely
  if (typeof initPortfolio === 'function') {
    initPortfolio();
  }
});
