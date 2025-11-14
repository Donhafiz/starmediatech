// Re-export the multer upload instance so routes can require('../middleware/upload')
module.exports = require('./uploadMiddleware').upload;
