const express = require('express');
const router = express.Router();
const { body, validationResult, param } = require('express-validator');
const auth = require('../middleware/auth');
const Consultation = require('../models/Consultation');
const Consultant = require('../models/Consultant');
const Service = require('../models/Service');
const User = require('../models/User');

// Input validation schemas
const consultationValidation = [
  body('service').isMongoId().withMessage('Valid service ID is required'),
  body('consultant').isMongoId().withMessage('Valid consultant ID is required'),
  body('scheduledDate').isISO8601().withMessage('Valid scheduled date is required'),
  body('duration').isInt({ min: 15, max: 480 }).withMessage('Duration must be between 15 and 480 minutes'),
  body('timeSlot').notEmpty().withMessage('Time slot is required'),
  body('notes').optional().trim().isLength({ max: 1000 }).withMessage('Notes must be less than 1000 characters'),
  body('specialRequirements').optional().trim().isLength({ max: 500 }).withMessage('Special requirements must be less than 500 characters')
];

const rescheduleValidation = [
  body('scheduledDate').isISO8601().withMessage('Valid scheduled date is required'),
  body('timeSlot').notEmpty().withMessage('Time slot is required'),
  body('reason').optional().trim().isLength({ max: 500 }).withMessage('Reason must be less than 500 characters')
];

// @route   GET /api/consultations
// @desc    Get consultations with filtering
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const {
      status,
      type,
      page = 1,
      limit = 10,
      sortBy = 'scheduledDate',
      sortOrder = 'asc'
    } = req.query;

    // Build filter based on user role
    let filter = {};
    
    if (req.user.role === 'consultant') {
      filter.consultant = req.user.userId;
    } else {
      filter.user = req.user.userId;
    }
    
    if (status) {
      filter.status = status;
    }
    
    if (type) {
      filter.type = type;
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    // Execute query
    const consultations = await Consultation.find(filter)
      .populate('service', 'title description price')
      .populate('consultant', 'name email specialization avatar')
      .populate('user', 'name email phone')
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

// @route   GET /api/consultations/:id
// @desc    Get single consultation by ID
// @access  Private
router.get('/:id', [
  param('id').isMongoId().withMessage('Valid consultation ID is required')
], auth, async (req, res) => {
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

    const consultation = await Consultation.findById(req.params.id)
      .populate('service', 'title description price duration features')
      .populate('consultant', 'name email specialization avatar bio experience rating')
      .populate('user', 'name email phone location');

    if (!consultation) {
      return res.status(404).json({
        success: false,
        message: 'Consultation not found'
      });
    }

    // Check if user has access to this consultation
    if (consultation.user._id.toString() !== req.user.userId && 
        consultation.consultant._id.toString() !== req.user.userId &&
        req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this consultation'
      });
    }

    res.json({
      success: true,
      data: consultation
    });

  } catch (error) {
    console.error('Get consultation error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching consultation',
      error: error.message
    });
  }
});

// @route   POST /api/consultations
// @desc    Create a new consultation booking
// @access  Private
router.post('/', [auth, ...consultationValidation], async (req, res) => {
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
      service,
      consultant,
      scheduledDate,
      duration,
      timeSlot,
      notes,
      specialRequirements
    } = req.body;

    // Verify service exists and is active
    const serviceDoc = await Service.findOne({
      _id: service,
      isActive: true
    });

    if (!serviceDoc) {
      return res.status(404).json({
        success: false,
        message: 'Service not found or inactive'
      });
    }

    // Verify consultant exists and is active
    const consultantDoc = await Consultant.findOne({
      _id: consultant,
      isActive: true
    });

    if (!consultantDoc) {
      return res.status(404).json({
        success: false,
        message: 'Consultant not found or inactive'
      });
    }

    // Check if consultant offers this service
    if (consultantDoc._id.toString() !== serviceDoc.consultant.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Consultant does not offer this service'
      });
    }

    // Parse scheduled date
    const scheduledDateTime = new Date(scheduledDate);
    const now = new Date();

    // Check if scheduled date is in the future
    if (scheduledDateTime <= now) {
      return res.status(400).json({
        success: false,
        message: 'Scheduled date must be in the future'
      });
    }

    // Check for scheduling conflicts for consultant
    const conflictingConsultation = await Consultation.findOne({
      consultant,
      scheduledDate: scheduledDateTime,
      timeSlot,
      status: { $in: ['scheduled', 'confirmed'] }
    });

    if (conflictingConsultation) {
      return res.status(400).json({
        success: false,
        message: 'Consultant is not available at this time. Please choose another time slot.'
      });
    }

    // Calculate end time
    const endTime = new Date(scheduledDateTime.getTime() + duration * 60000);

    // Create consultation
    const consultation = new Consultation({
      user: req.user.userId,
      service,
      consultant,
      scheduledDate: scheduledDateTime,
      endTime,
      duration,
      timeSlot,
      notes,
      specialRequirements,
      amount: serviceDoc.price,
      status: 'scheduled'
    });

    await consultation.save();
    await consultation.populate('service', 'title description');
    await consultation.populate('consultant', 'name email specialization');

    // In production, you might want to:
    // 1. Send confirmation email to user
    // 2. Send notification to consultant
    // 3. Process payment

    res.status(201).json({
      success: true,
      message: 'Consultation booked successfully',
      data: consultation
    });

  } catch (error) {
    console.error('Create consultation error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while booking consultation',
      error: error.message
    });
  }
});

// @route   PUT /api/consultations/:id/reschedule
// @desc    Reschedule a consultation
// @access  Private
router.put('/:id/reschedule', [auth, ...rescheduleValidation], async (req, res) => {
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

    const consultation = await Consultation.findById(req.params.id);
    if (!consultation) {
      return res.status(404).json({
        success: false,
        message: 'Consultation not found'
      });
    }

    // Check if user can reschedule this consultation
    if (consultation.user.toString() !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to reschedule this consultation'
      });
    }

    // Check if consultation can be rescheduled
    if (!['scheduled', 'confirmed'].includes(consultation.status)) {
      return res.status(400).json({
        success: false,
        message: 'Only scheduled or confirmed consultations can be rescheduled'
      });
    }

    const { scheduledDate, timeSlot, reason } = req.body;
    const newScheduledDate = new Date(scheduledDate);
    const now = new Date();

    // Check if new scheduled date is in the future
    if (newScheduledDate <= now) {
      return res.status(400).json({
        success: false,
        message: 'New scheduled date must be in the future'
      });
    }

    // Check for scheduling conflicts for consultant
    const conflictingConsultation = await Consultation.findOne({
      consultant: consultation.consultant,
      scheduledDate: newScheduledDate,
      timeSlot,
      status: { $in: ['scheduled', 'confirmed'] },
      _id: { $ne: consultation._id }
    });

    if (conflictingConsultation) {
      return res.status(400).json({
        success: false,
        message: 'Consultant is not available at this time. Please choose another time slot.'
      });
    }

    // Update consultation
    consultation.scheduledDate = newScheduledDate;
    consultation.timeSlot = timeSlot;
    consultation.endTime = new Date(newScheduledDate.getTime() + consultation.duration * 60000);
    consultation.status = 'rescheduled';
    consultation.rescheduleHistory.push({
      previousDate: consultation.scheduledDate,
      newDate: newScheduledDate,
      reason: reason || 'No reason provided',
      rescheduledBy: req.user.userId,
      rescheduledAt: new Date()
    });
    consultation.updatedAt = new Date();

    await consultation.save();

    res.json({
      success: true,
      message: 'Consultation rescheduled successfully',
      data: consultation
    });

  } catch (error) {
    console.error('Reschedule consultation error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while rescheduling consultation',
      error: error.message
    });
  }
});

// @route   PUT /api/consultations/:id/status
// @desc    Update consultation status
// @access  Private
router.put('/:id/status', [
  auth,
  body('status').isIn(['confirmed', 'cancelled', 'completed', 'no-show']).withMessage('Valid status is required'),
  body('cancellationReason').optional().trim().isLength({ max: 500 }).withMessage('Cancellation reason must be less than 500 characters')
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

    const consultation = await Consultation.findById(req.params.id);
    if (!consultation) {
      return res.status(404).json({
        success: false,
        message: 'Consultation not found'
      });
    }

    const { status, cancellationReason } = req.body;

    // Check authorization based on status change
    let isAuthorized = false;
    
    if (status === 'confirmed' && consultation.consultant.toString() === req.user.userId) {
      isAuthorized = true;
    } else if (status === 'cancelled') {
      // Both user and consultant can cancel
      isAuthorized = consultation.user.toString() === req.user.userId || 
                    consultation.consultant.toString() === req.user.userId ||
                    req.user.role === 'admin';
    } else if (status === 'completed' && consultation.consultant.toString() === req.user.userId) {
      isAuthorized = true;
    } else if (status === 'no-show' && consultation.consultant.toString() === req.user.userId) {
      isAuthorized = true;
    } else if (req.user.role === 'admin') {
      isAuthorized = true;
    }

    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update consultation status'
      });
    }

    // Validate status transition
    const validTransitions = {
      scheduled: ['confirmed', 'cancelled'],
      confirmed: ['completed', 'cancelled', 'no-show'],
      rescheduled: ['confirmed', 'cancelled'],
      cancelled: [], // Once cancelled, cannot change
      completed: [], // Once completed, cannot change
      'no-show': [] // Once no-show, cannot change
    };

    if (!validTransitions[consultation.status]?.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot change status from ${consultation.status} to ${status}`
      });
    }

    // Update consultation
    consultation.status = status;
    consultation.updatedAt = new Date();

    if (status === 'cancelled' && cancellationReason) {
      consultation.cancellationReason = cancellationReason;
      consultation.cancelledBy = req.user.userId;
      consultation.cancelledAt = new Date();
    }

    if (status === 'completed') {
      consultation.completedAt = new Date();
    }

    await consultation.save();

    res.json({
      success: true,
      message: `Consultation ${status} successfully`,
      data: consultation
    });

  } catch (error) {
    console.error('Update consultation status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating consultation status',
      error: error.message
    });
  }
});

// @route   POST /api/consultations/:id/feedback
// @desc    Add feedback and rating for completed consultation
// @access  Private (User only)
router.post('/:id/feedback', [
  auth,
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('feedback').optional().trim().isLength({ max: 1000 }).withMessage('Feedback must be less than 1000 characters')
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

    const consultation = await Consultation.findById(req.params.id);
    if (!consultation) {
      return res.status(404).json({
        success: false,
        message: 'Consultation not found'
      });
    }

    // Check if user is the one who booked the consultation
    if (consultation.user.toString() !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to provide feedback for this consultation'
      });
    }

    // Check if consultation is completed
    if (consultation.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Feedback can only be provided for completed consultations'
      });
    }

    // Check if feedback already provided
    if (consultation.feedbackProvided) {
      return res.status(400).json({
        success: false,
        message: 'Feedback already provided for this consultation'
      });
    }

    const { rating, feedback } = req.body;

    // Update consultation with feedback
    consultation.rating = rating;
    consultation.feedback = feedback;
    consultation.feedbackProvided = true;
    consultation.feedbackDate = new Date();
    consultation.updatedAt = new Date();

    await consultation.save();

    // Update consultant's average rating
    await updateConsultantRating(consultation.consultant);

    res.json({
      success: true,
      message: 'Feedback submitted successfully',
      data: consultation
    });

  } catch (error) {
    console.error('Add feedback error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while submitting feedback',
      error: error.message
    });
  }
});

// @route   GET /api/consultations/consultant/availability
// @desc    Get consultant availability for a specific date
// @access  Private
router.get('/consultant/availability', auth, async (req, res) => {
  try {
    const { consultantId, date } = req.query;

    if (!consultantId || !date) {
      return res.status(400).json({
        success: false,
        message: 'Consultant ID and date are required'
      });
    }

    const targetDate = new Date(date);
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

    // Get consultant's booked time slots for the day
    const bookedConsultations = await Consultation.find({
      consultant: consultantId,
      scheduledDate: {
        $gte: startOfDay,
        $lte: endOfDay
      },
      status: { $in: ['scheduled', 'confirmed', 'rescheduled'] }
    }).select('scheduledDate timeSlot duration');

    // Generate available time slots (simplified version)
    // In production, you'd consider consultant's working hours, breaks, etc.
    const availableSlots = generateAvailableTimeSlots(bookedConsultations);

    res.json({
      success: true,
      data: {
        date: targetDate,
        availableSlots,
        bookedConsultations: bookedConsultations.map(c => ({
          time: c.scheduledDate,
          duration: c.duration
        }))
      }
    });

  } catch (error) {
    console.error('Get availability error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching availability',
      error: error.message
    });
  }
});

// Helper function to update consultant rating
async function updateConsultantRating(consultantId) {
  try {
    const ratingStats = await Consultation.aggregate([
      {
        $match: {
          consultant: consultantId,
          rating: { $gt: 0 }
        }
      },
      {
        $group: {
          _id: '$consultant',
          averageRating: { $avg: '$rating' },
          totalRatings: { $sum: 1 }
        }
      }
    ]);

    if (ratingStats.length > 0) {
      await Consultant.findByIdAndUpdate(consultantId, {
        rating: parseFloat(ratingStats[0].averageRating.toFixed(1)),
        totalRatings: ratingStats[0].totalRatings
      });
    }
  } catch (error) {
    console.error('Error updating consultant rating:', error);
  }
}

// Helper function to generate available time slots
function generateAvailableTimeSlots(bookedConsultations) {
  // This is a simplified version
  // In production, you'd generate slots based on consultant's schedule
  const timeSlots = [];
  const startHour = 9; // 9 AM
  const endHour = 17; // 5 PM
  
  for (let hour = startHour; hour < endHour; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      
      // Check if this time slot is booked
      const isBooked = bookedConsultations.some(consultation => {
        const consultationTime = consultation.scheduledDate.toTimeString().slice(0, 5);
        return consultationTime === timeString;
      });
      
      if (!isBooked) {
        timeSlots.push(timeString);
      }
    }
  }
  
  return timeSlots;
}

module.exports = router;