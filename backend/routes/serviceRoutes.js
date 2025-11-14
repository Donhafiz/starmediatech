const express = require('express');
const router = express.Router();
const { body, validationResult, param } = require('express-validator');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const Service = require('../models/Service');
const Category = require('../models/Category');

// Input validation schemas
const serviceValidation = [
  body('title').trim().isLength({ min: 5, max: 100 }).withMessage('Title must be between 5 and 100 characters'),
  body('description').trim().isLength({ min: 20, max: 1000 }).withMessage('Description must be between 20 and 1000 characters'),
  body('category').isMongoId().withMessage('Valid category ID is required'),
  body('duration').isInt({ min: 15, max: 480 }).withMessage('Duration must be between 15 and 480 minutes'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean')
];

// @route   GET /api/services
// @desc    Get all services with filtering and pagination
// @access  Public
router.get('/', async (req, res) => {
  try {
    const {
      category,
      minPrice,
      maxPrice,
      duration,
      search,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter object
    const filter = { isActive: true };
    
    if (category) {
      filter.category = category;
    }
    
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = parseFloat(minPrice);
      if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
    }
    
    if (duration) {
      filter.duration = parseInt(duration);
    }
    
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    // Execute query
    const services = await Service.find(filter)
      .populate('category', 'name slug')
      .populate('consultant', 'name email specialization rating')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Service.countDocuments(filter);
    const totalPages = Math.ceil(total / parseInt(limit));

    res.json({
      success: true,
      data: {
        services,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalServices: total,
          hasNext: parseInt(page) < totalPages,
          hasPrev: parseInt(page) > 1
        }
      }
    });

  } catch (error) {
    console.error('Get services error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching services',
      error: error.message
    });
  }
});

// @route   GET /api/services/categories
// @desc    Get all service categories
// @access  Public
router.get('/categories', async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true })
      .sort({ name: 1 });

    res.json({
      success: true,
      data: categories
    });

  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching categories',
      error: error.message
    });
  }
});

// @route   GET /api/services/:id
// @desc    Get single service by ID
// @access  Public
router.get('/:id', [
  param('id').isMongoId().withMessage('Valid service ID is required')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const service = await Service.findById(req.params.id)
      .populate('category', 'name slug description')
      .populate('consultant', 'name email specialization experience rating bio');

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    // Increment view count
    service.views += 1;
    await service.save();

    res.json({
      success: true,
      data: service
    });

  } catch (error) {
    console.error('Get service error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching service',
      error: error.message
    });
  }
});

// @route   POST /api/services
// @desc    Create a new service (Consultants only)
// @access  Private (Consultant)
router.post('/', [auth, ...serviceValidation], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    // Check if user is a consultant
    if (req.user.role !== 'consultant') {
      return res.status(403).json({
        success: false,
        message: 'Only consultants can create services'
      });
    }

    const {
      title,
      description,
      category,
      duration,
      price,
      features,
      requirements,
      isActive = true
    } = req.body;

    // Check if consultant already has a service with same title
    const existingService = await Service.findOne({
      title,
      consultant: req.user.userId
    });

    if (existingService) {
      return res.status(400).json({
        success: false,
        message: 'You already have a service with this title'
      });
    }

    // Create service
    const service = new Service({
      title,
      description,
      category,
      duration,
      price,
      features: features || [],
      requirements: requirements || [],
      isActive,
      consultant: req.user.userId
    });

    await service.save();
    await service.populate('category', 'name slug');

    res.status(201).json({
      success: true,
      message: 'Service created successfully',
      data: service
    });

  } catch (error) {
    console.error('Create service error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating service',
      error: error.message
    });
  }
});

// @route   PUT /api/services/:id
// @desc    Update a service
// @access  Private (Consultant/Admin)
router.put('/:id', [auth, ...serviceValidation], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const service = await Service.findById(req.params.id);
    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    // Check if user owns the service or is admin
    if (service.consultant.toString() !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this service'
      });
    }

    const updateFields = { ...req.body, updatedAt: new Date() };
    
    // Remove consultant field if not admin (consultants can't transfer services)
    if (req.user.role !== 'admin') {
      delete updateFields.consultant;
    }

    const updatedService = await Service.findByIdAndUpdate(
      req.params.id,
      { $set: updateFields },
      { new: true, runValidators: true }
    ).populate('category', 'name slug')
     .populate('consultant', 'name email specialization');

    res.json({
      success: true,
      message: 'Service updated successfully',
      data: updatedService
    });

  } catch (error) {
    console.error('Update service error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating service',
      error: error.message
    });
  }
});

// @route   DELETE /api/services/:id
// @desc    Delete a service
// @access  Private (Consultant/Admin)
router.delete('/:id', auth, async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);
    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    // Check if user owns the service or is admin
    if (service.consultant.toString() !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this service'
      });
    }

    // Soft delete by setting isActive to false
    service.isActive = false;
    service.updatedAt = new Date();
    await service.save();

    res.json({
      success: true,
      message: 'Service deleted successfully'
    });

  } catch (error) {
    console.error('Delete service error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting service',
      error: error.message
    });
  }
});

// @route   GET /api/services/consultant/my-services
// @desc    Get current consultant's services
// @access  Private (Consultant)
router.get('/consultant/my-services', auth, async (req, res) => {
  try {
    // Check if user is a consultant
    if (req.user.role !== 'consultant') {
      return res.status(403).json({
        success: false,
        message: 'Only consultants can access this endpoint'
      });
    }

    const { page = 1, limit = 10, status = 'all' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build filter
    const filter = { consultant: req.user.userId };
    if (status === 'active') {
      filter.isActive = true;
    } else if (status === 'inactive') {
      filter.isActive = false;
    }

    const services = await Service.find(filter)
      .populate('category', 'name slug')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Service.countDocuments(filter);

    res.json({
      success: true,
      data: {
        services,
        pagination: {
          currentPage: parseInt(page),
          totalServices: total,
          totalPages: Math.ceil(total / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('Get consultant services error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching consultant services',
      error: error.message
    });
  }
});

// @route   GET /api/services/consultant/:consultantId
// @desc    Get services by consultant ID
// @access  Public
router.get('/consultant/:consultantId', [
  param('consultantId').isMongoId().withMessage('Valid consultant ID is required')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const services = await Service.find({
      consultant: req.params.consultantId,
      isActive: true
    })
    .populate('category', 'name slug')
    .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: services
    });

  } catch (error) {
    console.error('Get consultant services error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching consultant services',
      error: error.message
    });
  }
});

// @route   POST /api/services/:id/toggle-active
// @desc    Toggle service active status
// @access  Private (Consultant/Admin)
router.post('/:id/toggle-active', auth, async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);
    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    // Check if user owns the service or is admin
    if (service.consultant.toString() !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to modify this service'
      });
    }

    service.isActive = !service.isActive;
    service.updatedAt = new Date();
    await service.save();

    res.json({
      success: true,
      message: `Service ${service.isActive ? 'activated' : 'deactivated'} successfully`,
      data: {
        isActive: service.isActive
      }
    });

  } catch (error) {
    console.error('Toggle service active error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while toggling service status',
      error: error.message
    });
  }
});

module.exports = router;