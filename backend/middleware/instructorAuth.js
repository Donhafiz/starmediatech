const { protect, authorize } = require('./authMiddleware');

// instructorAuth middleware: protect then authorize 'consultant' or 'admin'
module.exports = (req, res, next) => {
  protect(req, res, (err) => {
    if (err) return next(err);
    return authorize('consultant', 'admin')(req, res, next);
  });
};
