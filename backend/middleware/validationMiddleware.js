const { body, param, query, validationResult } = require('express-validator');

// Common validation rules
const commonRules = {
  email: body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  password: body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
  
  name: body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters')
    .isAlpha('en-US', { ignore: ' -' })
    .withMessage('Name can only contain letters, spaces, and hyphens'),
  
  objectId: param('id')
    .isMongoId()
    .withMessage('Invalid ID format'),
  
  page: query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  limit: query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
};

// Validation result handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => ({
      field: error.path,
      message: error.msg,
      value: error.value
    }));

    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errorMessages
    });
  }
  
  next();
};

// Specific validation chains
const authValidation = {
  register: [
    commonRules.email,
    commonRules.password,
    body('name')
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('Name must be between 2 and 50 characters'),
    handleValidationErrors
  ],
  
  login: [
    commonRules.email,
    body('password').notEmpty().withMessage('Password is required'),
    handleValidationErrors
  ]
};

const userValidation = {
  updateProfile: [
    body('name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('Name must be between 2 and 50 characters'),
    body('email')
      .optional()
      .isEmail()
      .withMessage('Please provide a valid email address'),
    handleValidationErrors
  ],
  
  changePassword: [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    commonRules.password,
    body('confirmPassword')
      .custom((value, { req }) => {
        if (value !== req.body.password) {
          throw new Error('Passwords do not match');
        }
        return true;
      }),
    handleValidationErrors
  ]
};

const resourceValidation = {
  create: [
    body('title')
      .trim()
      .isLength({ min: 3, max: 100 })
      .withMessage('Title must be between 3 and 100 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Description must not exceed 500 characters'),
    body('category')
      .optional()
      .isMongoId()
      .withMessage('Invalid category ID'),
    handleValidationErrors
  ],
  
  update: [
    commonRules.objectId,
    body('title')
      .optional()
      .trim()
      .isLength({ min: 3, max: 100 })
      .withMessage('Title must be between 3 and 100 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Description must not exceed 500 characters'),
    handleValidationErrors
  ],
  
  getById: [
    commonRules.objectId,
    handleValidationErrors
  ]
};

// Query validation for listing endpoints
const queryPagination = [
  commonRules.page,
  commonRules.limit,
  query('sort')
    .optional()
    .isIn(['asc', 'desc', 'newest', 'oldest'])
    .withMessage('Invalid sort parameter'),
  handleValidationErrors
];

const queryValidation = {
  pagination: queryPagination,
  search: [
    query('q')
      .optional()
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('Search query must be between 2 and 50 characters'),
    query('category')
      .optional()
      .isMongoId()
      .withMessage('Invalid category ID'),
    ...queryPagination
  ]
};

// File validation rules
const fileValidation = {
  singleFile: [
    body('file')
      .custom((value, { req }) => {
        if (!req.file) {
          throw new Error('File is required');
        }
        return true;
      })
  ],
  
  multipleFiles: [
    body('files')
      .custom((value, { req }) => {
        if (!req.files || req.files.length === 0) {
          throw new Error('At least one file is required');
        }
        return true;
      })
  ]
};

// Custom validation middleware
const validate = (validations) => {
  return async (req, res, next) => {
    await Promise.all(validations.map(validation => validation.run(req)));
    handleValidationErrors(req, res, next);
  };
};

// Sanitization middleware
const sanitizeInput = (req, res, next) => {
  // Trim string fields
  if (req.body) {
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        req.body[key] = req.body[key].trim();
      }
    });
  }
  next();
};

module.exports = {
  ...commonRules,
  handleValidationErrors,
  authValidation,
  userValidation,
  resourceValidation,
  queryValidation,
  fileValidation,
  validate,
  sanitizeInput
};