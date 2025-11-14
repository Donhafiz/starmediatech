const express = require('express');
const router = express.Router();
const { body, validationResult, param } = require('express-validator');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const instructorAuth = require('../middleware/instructorAuth');
const upload = require('../middleware/upload');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const Category = require('../models/Category');

// Input validation schemas
const courseValidation = [
  body('title').trim().isLength({ min: 5, max: 100 }).withMessage('Title must be between 5 and 100 characters'),
  body('description').trim().isLength({ min: 50, max: 2000 }).withMessage('Description must be between 50 and 2000 characters'),
  body('shortDescription').trim().isLength({ min: 20, max: 200 }).withMessage('Short description must be between 20 and 200 characters'),
  body('category').isMongoId().withMessage('Valid category ID is required'),
  body('level').isIn(['beginner', 'intermediate', 'advanced']).withMessage('Please select a valid level'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('duration').isInt({ min: 1, max: 1000 }).withMessage('Duration must be between 1 and 1000 hours'),
  body('language').isIn(['english', 'spanish', 'french', 'german', 'other']).withMessage('Please select a valid language'),
  body('objectives').isArray({ min: 3, max: 20 }).withMessage('Please provide 3-20 learning objectives'),
  body('prerequisites').optional().isArray().withMessage('Prerequisites must be an array'),
  body('targetAudience').optional().isArray().withMessage('Target audience must be an array'),
  body('isPublished').optional().isBoolean().withMessage('isPublished must be a boolean')
];

// @route   GET /api/courses
// @desc    Get all courses with filtering and pagination
// @access  Public
router.get('/', async (req, res) => {
  try {
    const {
      category,
      level,
      minPrice,
      maxPrice,
      language,
      instructor,
      search,
      page = 1,
      limit = 12,
      sortBy = 'rating',
      sortOrder = 'desc'
    } = req.query;

    // Build filter object
    const filter = { isPublished: true, status: 'published' };
    
    if (category) {
      filter.category = category;
    }
    
    if (level) {
      filter.level = level;
    }
    
    if (language) {
      filter.language = language;
    }
    
    if (instructor) {
      filter.instructor = instructor;
    }
    
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = parseFloat(minPrice);
      if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
    }
    
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { shortDescription: { $regex: search, $options: 'i' } }
      ];
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    // Execute query
    const courses = await Course.find(filter)
      .populate('category', 'name slug')
      .populate('instructor', 'name email bio avatar specialization')
      .select('-sections.content -sections.videoUrl') // Don't send full content in listing
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

// @route   GET /api/courses/categories
// @desc    Get all course categories
// @access  Public
router.get('/categories', async (req, res) => {
  try {
    const categories = await Category.find({ type: 'course', isActive: true })
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

// @route   GET /api/courses/:id
// @desc    Get single course by ID
// @access  Public
router.get('/:id', [
  param('id').isMongoId().withMessage('Valid course ID is required')
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

    const course = await Course.findById(req.params.id)
      .populate('category', 'name slug description')
      .populate('instructor', 'name email bio avatar specialization socialLinks');

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Increment view count
    course.views += 1;
    await course.save();

    // Get enrollment count
    const enrollmentCount = await Enrollment.countDocuments({
      course: course._id,
      status: { $in: ['active', 'completed'] }
    });

    // Get average rating
    const ratingStats = await Enrollment.aggregate([
      { $match: { course: course._id, rating: { $gt: 0 } } },
      { $group: { _id: null, avgRating: { $avg: '$rating' }, totalRatings: { $sum: 1 } } }
    ]);

    const courseData = course.toObject();
    courseData.enrollmentCount = enrollmentCount;
    courseData.ratingStats = ratingStats[0] || { avgRating: 0, totalRatings: 0 };

    res.json({
      success: true,
      data: courseData
    });

  } catch (error) {
    console.error('Get course error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching course',
      error: error.message
    });
  }
});

// @route   POST /api/courses
// @desc    Create a new course (Instructors only)
// @access  Private (Instructor/Admin)
router.post('/', [auth, ...courseValidation], async (req, res) => {
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

    // Check if user is instructor or admin
    if (req.user.role !== 'instructor' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only instructors and admins can create courses'
      });
    }

    const {
      title,
      description,
      shortDescription,
      category,
      level,
      price,
      duration,
      language,
      objectives,
      prerequisites,
      targetAudience,
      requirements,
      thumbnail,
      isPublished = false
    } = req.body;

    // Create course
    const course = new Course({
      title,
      description,
      shortDescription,
      category,
      level,
      price,
      duration,
      language,
      objectives,
      prerequisites: prerequisites || [],
      targetAudience: targetAudience || [],
      requirements: requirements || [],
      thumbnail,
      isPublished,
      instructor: req.user.userId,
      status: isPublished ? 'published' : 'draft'
    });

    await course.save();
    await course.populate('category', 'name slug');

    res.status(201).json({
      success: true,
      message: 'Course created successfully',
      data: course
    });

  } catch (error) {
    console.error('Create course error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating course',
      error: error.message
    });
  }
});

// @route   PUT /api/courses/:id
// @desc    Update a course
// @access  Private (Instructor/Admin)
router.put('/:id', [auth, ...courseValidation], async (req, res) => {
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

    // Check if user owns the course or is admin
    if (course.instructor.toString() !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this course'
      });
    }

    const updateFields = { ...req.body, updatedAt: new Date() };
    
    // Update status based on isPublished
    if (updateFields.isPublished !== undefined) {
      updateFields.status = updateFields.isPublished ? 'published' : 'draft';
    }

    // Remove instructor field if not admin (instructors can't transfer courses)
    if (req.user.role !== 'admin') {
      delete updateFields.instructor;
    }

    const updatedCourse = await Course.findByIdAndUpdate(
      req.params.id,
      { $set: updateFields },
      { new: true, runValidators: true }
    )
    .populate('category', 'name slug')
    .populate('instructor', 'name email');

    res.json({
      success: true,
      message: 'Course updated successfully',
      data: updatedCourse
    });

  } catch (error) {
    console.error('Update course error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating course',
      error: error.message
    });
  }
});

// @route   DELETE /api/courses/:id
// @desc    Delete a course
// @access  Private (Instructor/Admin)
router.delete('/:id', auth, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Check if user owns the course or is admin
    if (course.instructor.toString() !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this course'
      });
    }

    // Check if there are active enrollments
    const activeEnrollments = await Enrollment.countDocuments({
      course: course._id,
      status: { $in: ['active', 'completed'] }
    });

    if (activeEnrollments > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete course with active enrollments. Please archive instead.'
      });
    }

    await Course.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Course deleted successfully'
    });

  } catch (error) {
    console.error('Delete course error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting course',
      error: error.message
    });
  }
});

// @route   GET /api/courses/instructor/my-courses
// @desc    Get current instructor's courses
// @access  Private (Instructor/Admin)
router.get('/instructor/my-courses', auth, async (req, res) => {
  try {
    // Check if user is instructor or admin
    if (req.user.role !== 'instructor' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only instructors can access this endpoint'
      });
    }

    const { page = 1, limit = 10, status } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build filter
    const filter = { instructor: req.user.userId };
    if (status) {
      filter.status = status;
    }

    const courses = await Course.find(filter)
      .populate('category', 'name slug')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Course.countDocuments(filter);

    // Get enrollment stats for each course
    const coursesWithStats = await Promise.all(
      courses.map(async (course) => {
        const courseObj = course.toObject();
        const enrollmentCount = await Enrollment.countDocuments({
          course: course._id,
          status: { $in: ['active', 'completed'] }
        });
        
        const revenue = await Enrollment.aggregate([
          { $match: { course: course._id, status: { $in: ['active', 'completed'] } } },
          { $group: { _id: null, total: { $sum: '$amountPaid' } } }
        ]);

        courseObj.enrollmentCount = enrollmentCount;
        courseObj.revenue = revenue[0]?.total || 0;
        return courseObj;
      })
    );

    res.json({
      success: true,
      data: {
        courses: coursesWithStats,
        pagination: {
          currentPage: parseInt(page),
          totalCourses: total,
          totalPages: Math.ceil(total / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('Get instructor courses error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching instructor courses',
      error: error.message
    });
  }
});

// @route   POST /api/courses/:id/enroll
// @desc    Enroll in a course
// @access  Private
router.post('/:id/enroll', auth, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Check if course is published
    if (!course.isPublished || course.status !== 'published') {
      return res.status(400).json({
        success: false,
        message: 'Course is not available for enrollment'
      });
    }

    // Check if user is already enrolled
    const existingEnrollment = await Enrollment.findOne({
      user: req.user.userId,
      course: course._id,
      status: { $in: ['active', 'completed'] }
    });

    if (existingEnrollment) {
      return res.status(400).json({
        success: false,
        message: 'You are already enrolled in this course'
      });
    }

    // Create enrollment
    const enrollment = new Enrollment({
      user: req.user.userId,
      course: course._id,
      amountPaid: course.price,
      status: 'active'
    });

    await enrollment.save();
    await enrollment.populate('course', 'title description instructor');

    // Increment enrollment count
    course.enrollmentCount += 1;
    await course.save();

    res.status(201).json({
      success: true,
      message: 'Successfully enrolled in course',
      data: enrollment
    });

  } catch (error) {
    console.error('Enroll in course error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while enrolling in course',
      error: error.message
    });
  }
});

// @route   GET /api/courses/:id/content
// @desc    Get course content for enrolled students
// @access  Private (Enrolled students)
router.get('/:id/content', auth, async (req, res) => {
  try {
    // Check if user is enrolled in the course
    const enrollment = await Enrollment.findOne({
      user: req.user.userId,
      course: req.params.id,
      status: 'active'
    });

    if (!enrollment && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You are not enrolled in this course'
      });
    }

    const course = await Course.findById(req.params.id)
      .populate('sections.lessons', 'title duration type content videoUrl resources')
      .select('+sections.content +sections.videoUrl');

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    res.json({
      success: true,
      data: course
    });

  } catch (error) {
    console.error('Get course content error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching course content',
      error: error.message
    });
  }
});

// @route   POST /api/courses/:id/thumbnail
// @desc    Upload course thumbnail
// @access  Private (Instructor/Admin)
router.post('/:id/thumbnail', [auth, upload.single('thumbnail')], async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload an image file'
      });
    }

    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Check if user owns the course or is admin
    if (course.instructor.toString() !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this course'
      });
    }

    course.thumbnail = req.file.path;
    course.updatedAt = new Date();
    await course.save();

    res.json({
      success: true,
      message: 'Thumbnail uploaded successfully',
      data: {
        thumbnail: course.thumbnail
      }
    });

  } catch (error) {
    console.error('Upload thumbnail error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while uploading thumbnail',
      error: error.message
    });
  }
});

module.exports = router;