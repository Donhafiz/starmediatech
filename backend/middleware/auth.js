const { protect } = require('./authMiddleware');

// Export the protective middleware as the default "auth" shim
module.exports = protect;
