const { protect, authorize } = require('./authMiddleware');

// adminAuth middleware: protect then authorize 'admin'
module.exports = (req, res, next) => {
  // call protect; when it calls next(), we then call authorize
  protect(req, res, (err) => {
    if (err) return next(err);
    return authorize('admin')(req, res, next);
  });
};
