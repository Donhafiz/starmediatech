const mongoose = require('mongoose');

const consultationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  consultant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  serviceType: {
    type: String,
    required: true,
    enum: [
      'web-development',
      'graphic-design',
      'it-solutions',
      'tech-consultancy',
      'career-guidance',
      'project-review'
    ]
  },
  title: {
    type: String,
    required: [true, 'Consultation title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  scheduledDate: {
    type: Date,
    required: true
  },
  duration: {
    type: Number, // in minutes
    required: true,
    enum: [30, 60, 90, 120],
    default: 60
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'completed', 'cancelled', 'rescheduled'],
    default: 'pending'
  },
  meetingLink: String,
  meetingPassword: String,
  price: {
    type: Number,
    required: true,
    min: [0, 'Price cannot be negative']
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'refunded', 'failed'],
    default: 'pending'
  },
  paymentIntentId: String,
  cancellationReason: String,
  rescheduledFrom: Date,
  userNotes: String,
  consultantNotes: String,
  rating: {
    type: Number,
    min: 1,
    max: 5
  },
  review: {
    type: String,
    maxlength: [500, 'Review cannot exceed 500 characters']
  },
  reminderSent: {
    type: Boolean,
    default: false
  },
  followUpSent: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index for efficient queries
consultationSchema.index({ user: 1, scheduledDate: 1 });
consultationSchema.index({ consultant: 1, scheduledDate: 1 });
consultationSchema.index({ status: 1, scheduledDate: 1 });

// Virtual for meeting end time
consultationSchema.virtual('endTime').get(function() {
  return new Date(this.scheduledDate.getTime() + this.duration * 60000);
});

// Check if consultation is in the past
consultationSchema.virtual('isPast').get(function() {
  return this.scheduledDate < new Date();
});

// Check if consultation can be cancelled (at least 24 hours before)
consultationSchema.virtual('canBeCancelled').get(function() {
  const twentyFourHoursBefore = new Date(this.scheduledDate.getTime() - 24 * 60 * 60000);
  return new Date() < twentyFourHoursBefore && this.status === 'confirmed';
});

// Static method to get consultant's availability
consultationSchema.statics.getConsultantSchedule = async function(consultantId, startDate, endDate) {
  return this.find({
    consultant: consultantId,
    scheduledDate: {
      $gte: startDate,
      $lte: endDate
    },
    status: { $in: ['confirmed', 'pending'] }
  }).select('scheduledDate duration');
};

// Instance method to check time conflict
consultationSchema.methods.hasTimeConflict = async function() {
  const Consultation = mongoose.model('Consultation');
  const existingConsultation = await Consultation.findOne({
    consultant: this.consultant,
    scheduledDate: {
      $lt: this.endTime,
      $gt: new Date(this.scheduledDate.getTime() - this.duration * 60000)
    },
    status: { $in: ['confirmed', 'pending'] },
    _id: { $ne: this._id }
  });

  return !!existingConsultation;
};

module.exports = mongoose.model('Consultation', consultationSchema);