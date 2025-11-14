const Consultation = require('../models/Consultation');
const User = require('../models/User');
const { sendEmail } = require('../utils/emailService');

// @desc    Request a consultation
// @route   POST /api/consultations
// @access  Private
const requestConsultation = async (req, res) => {
  try {
    const { 
      serviceType, 
      preferredDate, 
      preferredTime, 
      duration, 
      message,
      contactMethod 
    } = req.body;

    // Find available consultants for the service type
    const consultants = await User.find({
      role: 'consultant',
      'consultationSettings.services': serviceType,
      'consultationSettings.isAvailable': true
    });

    if (consultants.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No consultants available for this service type'
      });
    }

    // Assign to first available consultant (you can implement more sophisticated matching)
    const assignedConsultant = consultants[0];

    const consultation = await Consultation.create({
      client: req.user.id,
      consultant: assignedConsultant._id,
      serviceType,
      preferredDate,
      preferredTime,
      duration,
      message,
      contactMethod,
      status: 'pending'
    });

    // Send notification to consultant
    await sendEmail({
      email: assignedConsultant.email,
      subject: 'New Consultation Request - Star Media Tech',
      template: 'consultationRequest',
      data: {
        consultantName: assignedConsultant.firstName,
        clientName: req.user.firstName,
        serviceType,
        preferredDate,
        preferredTime,
        message
      }
    });

    res.status(201).json({
      success: true,
      message: 'Consultation request submitted successfully',
      data: { consultation }
    });

  } catch (error) {
    console.error('Request consultation error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while requesting consultation'
    });
  }
};

// @desc    Get user's consultations
// @route   GET /api/consultations/my-consultations
// @access  Private
const getMyConsultations = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;

    const filter = {
      $or: [
        { client: req.user.id },
        { consultant: req.user.id }
      ]
    };
    
    if (status) filter.status = status;

    const consultations = await Consultation.find(filter)
      .populate('client', 'firstName lastName avatar')
      .populate('consultant', 'firstName lastName avatar specialization')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Consultation.countDocuments(filter);

    res.json({
      success: true,
      data: {
        consultations,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total
        }
      }
    });

  } catch (error) {
    console.error('Get consultations error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching consultations'
    });
  }
};

// @desc    Update consultation status
// @route   PUT /api/consultations/:id/status
// @access  Private (Consultant)
const updateConsultationStatus = async (req, res) => {
  try {
    const { status, scheduledDate, scheduledTime, notes, price } = req.body;

    const consultation = await Consultation.findById(req.params.id);

    if (!consultation) {
      return res.status(404).json({
        success: false,
        message: 'Consultation not found'
      });
    }

    // Check if user is the assigned consultant
    if (consultation.consultant.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this consultation'
      });
    }

    const updateData = { status };
    if (scheduledDate) updateData.scheduledDate = scheduledDate;
    if (scheduledTime) updateData.scheduledTime = scheduledTime;
    if (notes) updateData.consultantNotes = notes;
    if (price) updateData.price = price;

    if (status === 'confirmed') {
      updateData.confirmedAt = new Date();
    } else if (status === 'completed') {
      updateData.completedAt = new Date();
    } else if (status === 'cancelled') {
      updateData.cancelledAt = new Date();
    }

    const updatedConsultation = await Consultation.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('client', 'firstName lastName email');

    // Send notification to client based on status change
    if (status === 'confirmed') {
      await sendEmail({
        email: updatedConsultation.client.email,
        subject: 'Consultation Confirmed - Star Media Tech',
        template: 'consultationConfirmed',
        data: {
          clientName: updatedConsultation.client.firstName,
          serviceType: consultation.serviceType,
          scheduledDate: consultation.scheduledDate,
          scheduledTime: consultation.scheduledTime,
          consultantNotes: consultation.consultantNotes
        }
      });
    }

    res.json({
      success: true,
      message: `Consultation ${status} successfully`,
      data: { consultation: updatedConsultation }
    });

  } catch (error) {
    console.error('Update consultation status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating consultation status'
    });
  }
};

// @desc    Add consultation notes
// @route   PUT /api/consultations/:id/notes
// @access  Private (Consultant)
const addConsultationNotes = async (req, res) => {
  try {
    const { notes, recommendations, followUpRequired } = req.body;

    const consultation = await Consultation.findById(req.params.id);

    if (!consultation) {
      return res.status(404).json({
        success: false,
        message: 'Consultation not found'
      });
    }

    // Check if user is the assigned consultant
    if (consultation.consultant.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to add notes to this consultation'
      });
    }

    const updatedConsultation = await Consultation.findByIdAndUpdate(
      req.params.id,
      {
        consultationNotes: notes,
        recommendations,
        followUpRequired,
        ...(followUpRequired && { followUpDate: req.body.followUpDate })
      },
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Consultation notes added successfully',
      data: { consultation: updatedConsultation }
    });

  } catch (error) {
    console.error('Add consultation notes error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while adding consultation notes'
    });
  }
};

// @desc    Get consultant availability
// @route   GET /api/consultations/availability
// @access  Public
const getConsultantAvailability = async (req, res) => {
  try {
    const { serviceType, date } = req.query;

    const consultants = await User.find({
      role: 'consultant',
      'consultationSettings.services': serviceType,
      'consultationSettings.isAvailable': true
    }).select('firstName lastName consultationSettings avatar specialization');

    // Get already booked time slots for the date
    const bookedConsultations = await Consultation.find({
      scheduledDate: new Date(date),
      status: { $in: ['confirmed', 'scheduled'] }
    }).select('scheduledTime consultant');

    const availability = consultants.map(consultant => {
      const consultantBookings = bookedConsultations
        .filter(booking => booking.consultant.toString() === consultant._id.toString())
        .map(booking => booking.scheduledTime);

      const availableSlots = consultant.consultationSettings.workingHours
        .filter(slot => !consultantBookings.includes(slot));

      return {
        consultant: {
          _id: consultant._id,
          firstName: consultant.firstName,
          lastName: consultant.lastName,
          avatar: consultant.avatar,
          specialization: consultant.specialization,
          hourlyRate: consultant.consultationSettings.hourlyRate
        },
        availableSlots
      };
    });

    res.json({
      success: true,
      data: { availability }
    });

  } catch (error) {
    console.error('Get availability error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching consultant availability'
    });
  }
};

// @desc    Rate consultation
// @route   POST /api/consultations/:id/rating
// @access  Private (Client)
const rateConsultation = async (req, res) => {
  try {
    const { rating, review } = req.body;

    const consultation = await Consultation.findById(req.params.id);

    if (!consultation) {
      return res.status(404).json({
        success: false,
        message: 'Consultation not found'
      });
    }

    // Check if user is the client and consultation is completed
    if (consultation.client.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to rate this consultation'
      });
    }

    if (consultation.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Can only rate completed consultations'
      });
    }

    consultation.clientRating = rating;
    consultation.clientReview = review;
    consultation.ratedAt = new Date();
    
    await consultation.save();

    // Update consultant's average rating
    const consultantRatings = await Consultation.aggregate([
      { $match: { consultant: consultation.consultant, clientRating: { $exists: true } } },
      { $group: { _id: '$consultant', avgRating: { $avg: '$clientRating' } } }
    ]);

    if (consultantRatings.length > 0) {
      await User.findByIdAndUpdate(consultation.consultant, {
        rating: consultantRatings[0].avgRating
      });
    }

    res.json({
      success: true,
      message: 'Consultation rated successfully',
      data: { consultation }
    });

  } catch (error) {
    console.error('Rate consultation error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while rating consultation'
    });
  }
};

module.exports = {
  requestConsultation,
  getMyConsultations,
  updateConsultationStatus,
  addConsultationNotes,
  getConsultantAvailability,
  rateConsultation
};