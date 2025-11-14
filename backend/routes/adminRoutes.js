const express = require('express');
const router = express.Router();
const { body, validationResult, param } = require('express-validator');
const adminAuth = require('../middleware/adminAuth');
const User = require('../models/User');
const Consultant = require('../models/Consultant');
const Course = require('../models/Course');
const Service = require('../models/Service');
const Consultation = require('../models/Consultation');
const Enrollment = require('../models/Enrollment');

// @route   GET /api/admin/dashboard
// @desc    Get admin dashboard statistics
// @access  Private (Admin only)
router.get('/dashboard', adminAuth, async (req, res) => {
  try {
    // Get total counts
    const totalUsers = await User.countDocuments();
    const totalConsultants = await Consultant.countDocuments();
    const totalCourses = await Course.countDocuments();
    const totalServices = await Service.countDocuments();
    const totalConsultations = await Consultation.countDocuments();
    const totalEnrollments = await Enrollment.countDocuments();

    // Get recent registrations (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentUsers = await User.countDocuments({
      createdAt: { $gte: thirtyDaysAgo }
    });

    const recentConsultants = await Consultant.countDocuments({
      createdAt: { $gte: thirtyDaysAgo }
    });

    // Get revenue statistics (last 30 days)
    const revenueStats = await Consultation.aggregate([
      {
        $match: {
          status: 'completed',
          scheduledDate: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$amount' },
          averageRevenue: { $avg: '$amount' },
          totalConsultations: { $sum: 1 }
        }
      }
    ]);

    // Get popular courses
    const popularCourses = await Course.find({ isPublished: true })
      .populate('instructor', 'name')
      .sort({ enrollmentCount: -1 })
      .limit(5)
      .select('title enrollmentCount rating price');

    // Get pending consultant approvals
    const pendingConsultants = await Consultant.countDocuments({
      approvalStatus: 'pending'
    });

    // Get consultation status distribution
    const consultationStatus = await Consultation.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const dashboardData = {
      overview: {
        totalUsers,
        totalConsultants,
        totalCourses,
        totalServices,
        totalConsultations,
        totalEnrollments,
        recentUsers,
        recentConsultants,
        pendingConsultants
      },
      revenue: revenueStats[0] || {
        totalRevenue: 0,
        averageRevenue: 0,
        totalConsultations: 0
      },
      popularCourses,
      consultationStatus
    };

    res.json({
      success: true,
      data: dashboardData
    });

  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching dashboard data',
      error: error.message
    });
  }
});

// @route   GET /api/admin/users
// @desc    Get all users with pagination and filtering
// @access  Private (Admin only)
router.get('/users', adminAuth, async (req, res) => {
  try {
    const {
      role,
      status,
      search,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter object
    const filter = {};
    
    if (role) {
      filter.role = role;
    }
    
    if (status) {
      filter.isActive = status === 'active';
    }
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    // Execute query
    const users = await User.find(filter)
      .select('-password -resetPasswordToken -resetPasswordExpire')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(filter);
    const totalPages = Math.ceil(total / parseInt(limit));

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalUsers: total,
          hasNext: parseInt(page) < totalPages,
          hasPrev: parseInt(page) > 1
        }
      }
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching users',
      error: error.message
    });
  }
});

// @route   GET /api/admin/consultants/pending
// @desc    Get pending consultant approvals
// @access  Private (Admin only)
router.get('/consultants/pending', adminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const consultants = await Consultant.find({ approvalStatus: 'pending' })
      .populate('user', 'name email createdAt')
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Consultant.countDocuments({ approvalStatus: 'pending' });

    res.json({
      success: true,
      data: {
        consultants,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalPending: total
        }
      }
    });

  } catch (error) {
    console.error('Get pending consultants error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching pending consultants',
      error: error.message
    });
  }
});

// @route   PUT /api/admin/consultants/:id/approval
// @desc    Approve or reject consultant application
// @access  Private (Admin only)
router.put('/consultants/:id/approval', [
  adminAuth,
  body('action').isIn(['approve', 'reject']).withMessage('Action must be either approve or reject'),
  body('reason').optional().trim().isLength({ max: 500 }).withMessage('Reason must be less than 500 characters')
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

    const consultant = await Consultant.findById(req.params.id)
      .populate('user', 'name email role');

    if (!consultant) {
      return res.status(404).json({
        success: false,
        message: 'Consultant not found'
      });
    }

    const { action, reason } = req.body;

    if (action === 'approve') {
      consultant.approvalStatus = 'approved';
      consultant.isActive = true;
      consultant.approvedAt = new Date();
      consultant.approvedBy = req.user.userId;

      // Update user role to consultant if not already
      if (consultant.user.role !== 'consultant') {
        await User.findByIdAndUpdate(consultant.user._id, {
          role: 'consultant'
        });
      }
    } else {
      consultant.approvalStatus = 'rejected';
      consultant.rejectionReason = reason;
      consultant.rejectedAt = new Date();
      consultant.rejectedBy = req.user.userId;
    }

    consultant.updatedAt = new Date();
    await consultant.save();

    res.json({
      success: true,
      message: `Consultant application ${action}d successfully`,
      data: consultant
    });

  } catch (error) {
    console.error('Update consultant approval error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating consultant approval',
      error: error.message
    });
  }
});

// @route   PUT /api/admin/users/:id/status
// @desc    Activate or deactivate user account
// @access  Private (Admin only)
router.put('/users/:id/status', [
  adminAuth,
  body('isActive').isBoolean().withMessage('isActive must be a boolean')
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

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const { isActive } = req.body;

    user.isActive = isActive;
    user.updatedAt = new Date();
    await user.save();

    res.json({
      success: true,
      message: `User account ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        isActive: user.isActive
      }
    });

  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating user status',
      error: error.message
    });
  }
});

// @route   PUT /api/admin/users/:id/role
// @desc    Update user role
// @access  Private (Admin only)
router.put('/users/:id/role', [
  adminAuth,
  body('role').isIn(['student', 'consultant', 'instructor', 'admin']).withMessage('Valid role is required')
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

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const { role } = req.body;

    // If changing to consultant, ensure there's a consultant profile
    if (role === 'consultant') {
      const existingConsultant = await Consultant.findOne({ user: user._id });
      if (!existingConsultant) {
        // Create basic consultant profile
        const consultant = new Consultant({
          user: user._id,
          name: user.name,
          email: user.email,
          approvalStatus: 'approved',
          isActive: true,
          approvedAt: new Date(),
          approvedBy: req.user.userId
        });
        await consultant.save();
      } else {
        // Activate existing consultant profile
        existingConsultant.approvalStatus = 'approved';
        existingConsultant.isActive = true;
        existingConsultant.approvedAt = new Date();
        existingConsultant.approvedBy = req.user.userId;
        await existingConsultant.save();
      }
    }

    user.role = role;
    user.updatedAt = new Date();
    await user.save();

    res.json({
      success: true,
      message: `User role updated to ${role} successfully`,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating user role',
      error: error.message
    });
  }
});

// @route   GET /api/admin/courses
// @desc    Get all courses for admin management
// @access  Private (Admin only)
router.get('/courses', adminAuth, async (req, res) => {
  try {
    const {
      status,
      instructor,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter object
    const filter = {};
    
    if (status) {
      filter.status = status;
    }
    
    if (instructor) {
      filter.instructor = instructor;
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    // Execute query
    const courses = await Course.find(filter)
      .populate('category', 'name slug')
      .populate('instructor', 'name email')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Course.countDocuments(filter);
    const totalPages = Math.ceil(total / parseInt(limit));

    res.json({
      success: true,
      data: {
        courses,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalCourses: total,
          hasNext: parseInt(page) < totalPages,
          hasPrev: parseInt(page) > 1
        }
      }
    });

  } catch (error) {
    console.error('Get courses error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching courses',
      error: error.message
    });
  }
});

// @route   PUT /api/admin/courses/:id/status
// @desc    Update course status
// @access  Private (Admin only)
router.put('/courses/:id/status', [
  adminAuth,
  body('status').isIn(['published', 'draft', 'archived']).withMessage('Valid status is required')
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

    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    const { status } = req.body;

    course.status = status;
    course.isPublished = status === 'published';
    course.updatedAt = new Date();
    await course.save();

    res.json({
      success: true,
      message: `Course status updated to ${status} successfully`,
      data: course
    });

  } catch (error) {
    console.error('Update course status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating course status',
      error: error.message
    });
  }
});

// @route   GET /api/admin/consultations
// @desc    Get all consultations for admin management
// @access  Private (Admin only)
router.get('/consultations', adminAuth, async (req, res) => {
  try {
    const {
      status,
      consultant,
      user,
      page = 1,
      limit = 20,
      sortBy = 'scheduledDate',
      sortOrder = 'desc'
    } = req.query;

    // Build filter object
    const filter = {};
    
    if (status) {
      filter.status = status;
    }
    
    if (consultant) {
      filter.consultant = consultant;
    }
    
    if (user) {
      filter.user = user;
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    // Execute query
    const consultations = await Consultation.find(filter)
      .populate('service', 'title')
      .populate('consultant', 'name email')
      .populate('user', 'name email')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Consultation.countDocuments(filter);
    const totalPages = Math.ceil(total / parseInt(limit));

    res.json({
      success: true,
      data: {
        consultations,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalConsultations: total,
          hasNext: parseInt(page) < totalPages,
          hasPrev: parseInt(page) > 1
        }
      }
    });

  } catch (error) {
    console.error('Get consultations error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching consultations',
      error: error.message
    });
  }
});

// @route   GET /api/admin/analytics/revenue
// @desc    Get revenue analytics
// @access  Private (Admin only)
router.get('/analytics/revenue', adminAuth, async (req, res) => {
  try {
    const { period = '30d' } = req.query;

    // Calculate date range based on period
    const endDate = new Date();
    const startDate = new Date();
    
    switch (period) {
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(startDate.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        startDate.setDate(startDate.getDate() - 30);
    }

    // Revenue from consultations
    const consultationRevenue = await Consultation.aggregate([
      {
        $match: {
          status: 'completed',
          scheduledDate: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$scheduledDate' },
            month: { $month: '$scheduledDate' },
            day: { $dayOfMonth: '$scheduledDate' }
          },
          totalRevenue: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);

    // Revenue from course enrollments
    const courseRevenue = await Enrollment.aggregate([
      {
        $match: {
          status: 'active',
          enrolledAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$enrolledAt' },
            month: { $month: '$enrolledAt' },
            day: { $dayOfMonth: '$enrolledAt' }
          },
          totalRevenue: { $sum: '$amountPaid' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);

    // Top consultants by revenue
    const topConsultants = await Consultation.aggregate([
      {
        $match: {
          status: 'completed',
          scheduledDate: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: '$consultant',
          totalRevenue: { $sum: '$amount' },
          consultationCount: { $sum: 1 }
        }
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'consultants',
          localField: '_id',
          foreignField: '_id',
          as: 'consultant'
        }
      },
      { $unwind: '$consultant' },
      {
        $project: {
          name: '$consultant.name',
          email: '$consultant.email',
          totalRevenue: 1,
          consultationCount: 1
        }
      }
    ]);

    // Top courses by revenue
    const topCourses = await Enrollment.aggregate([
      {
        $match: {
          status: 'active',
          enrolledAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: '$course',
          totalRevenue: { $sum: '$amountPaid' },
          enrollmentCount: { $sum: 1 }
        }
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'courses',
          localField: '_id',
          foreignField: '_id',
          as: 'course'
        }
      },
      { $unwind: '$course' },
      {
        $project: {
          title: '$course.title',
          instructor: '$course.instructor',
          totalRevenue: 1,
          enrollmentCount: 1
        }
      }
    ]);

    const analyticsData = {
      period: {
        start: startDate,
        end: endDate
      },
      consultationRevenue,
      courseRevenue,
      topConsultants,
      topCourses
    };

    res.json({
      success: true,
      data: analyticsData
    });

  } catch (error) {
    console.error('Revenue analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching revenue analytics',
      error: error.message
    });
  }
});

// @route   POST /api/admin/announcements
// @desc    Create system announcement
// @access  Private (Admin only)
router.post('/announcements', [
  adminAuth,
  body('title').trim().isLength({ min: 5, max: 200 }).withMessage('Title must be between 5 and 200 characters'),
  body('content').trim().isLength({ min: 10, max: 2000 }).withMessage('Content must be between 10 and 2000 characters'),
  body('type').isIn(['info', 'warning', 'success', 'error']).withMessage('Valid type is required'),
  body('targetAudience').isIn(['all', 'students', 'consultants', 'instructors']).withMessage('Valid target audience is required'),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean')
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

    const {
      title,
      content,
      type,
      targetAudience,
      isActive = true
    } = req.body;

    // In production, you would save this to an Announcement model
    // const announcement = new Announcement({ ... });

    res.status(201).json({
      success: true,
      message: 'Announcement created successfully',
      data: {
        title,
        content,
        type,
        targetAudience,
        isActive,
        createdBy: req.user.userId,
        createdAt: new Date()
      }
    });

  } catch (error) {
    console.error('Create announcement error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating announcement',
      error: error.message
    });
  }
});

module.exports = router;