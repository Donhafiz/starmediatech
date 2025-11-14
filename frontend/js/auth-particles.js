// Lightweight shim for auth pages (login/register)
// If a particle library is available, initialize it here. Otherwise no-op.
(function(){
  try {
    if (window.particlesJS) {
      // Example initialization if particlesJS exists
      particlesJS.load('particles-js', '/assets/particles.json');
    }
  } catch (e) {
    // no-op
    console.debug('auth-particles shim loaded');
  }
})();
