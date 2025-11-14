const mongoose = require('mongoose');

const enrollmentSchema = new mongoose.Schema({
  // Basic Information
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User reference is required']
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: [true, 'Course reference is required']
  },
  // Enrollment Details
  enrollmentDate: {
    type: Date,
    default: Date.now
  },
  enrollmentType: {
    type: String,
    enum: {
      values: ['free', 'paid', 'trial', 'corporate', 'scholarship'],
      message: 'Please select a valid enrollment type'
    },
    default: 'paid'
  },
  status: {
    type: String,
    required: true,
    enum: {
      values: ['active', 'completed', 'cancelled', 'paused', 'expired'],
      message: 'Please select a valid enrollment status'
    },
    default: 'active'
  },
  // Progress Tracking
  progress: {
    overall: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    completedLessons: [{
      lesson: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Lesson'
      },
      completedAt: {
        type: Date,
        default: Date.now
      },
      timeSpent: { // in minutes
        type: Number,
        default: 0
      },
      quizScore: {
        type: Number,
        min: 0,
        max: 100
      }
    }],
    currentLesson: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lesson'
    },
    lastAccessed: {
      type: Date,
      default: Date.now
    },
    totalTimeSpent: { // in minutes
      type: Number,
      default: 0
    }
  },
  // Assessment and Grading
  assessments: [{
    assessment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Assessment'
    },
    attempts: [{
      attemptNumber: {
        type: Number,
        required: true
      },
      startedAt: {
        type: Date,
        default: Date.now
      },
      submittedAt: Date,
      score: {
        type: Number,
        min: 0,
        max: 100
      },
      totalQuestions: Number,
      correctAnswers: Number,
      timeSpent: Number, // in minutes
      answers: [{
        question: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Question'
        },
        selectedOption: mongoose.Schema.Types.Mixed,
        isCorrect: Boolean,
        timeSpent: Number // in seconds
      }],
      feedback: String
    }],
    bestScore: {
      type: Number,
      min: 0,
      max: 100
    },
    passed: {
      type: Boolean,
      default: false
    }
  }],
  finalGrade: {
    score: {
      type: Number,
      min: 0,
      max: 100
    },
    grade: {
      type: String,
      enum: ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D', 'F', 'Incomplete']
    },
    awardedAt: Date,
    notes: String
  },
  // Certificate Information
  certificate: {
    issued: {
      type: Boolean,
      default: false
    },
    issuedAt: Date,
    certificateId: {
      type: String,
      unique: true,
      sparse: true
    },
    downloadUrl: String,
    verificationUrl: String
  },
  // Payment Information
  payment: {
    amountPaid: {
      type: Number,
      required: function() {
        return this.enrollmentType === 'paid';
      },
      min: 0
    },
    currency: {
      type: String,
      default: 'USD'
    },
    paymentMethod: {
      type: String,
      enum: ['credit_card', 'paypal', 'bank_transfer', 'crypto', 'free']
    },
    transactionId: String,
    paymentDate: Date,
    refunded: {
      type: Boolean,
      default: false
    },
    refundAmount: {
      type: Number,
      min: 0
    },
    refundDate: Date,
    refundReason: String
  },
  // Course Access and Settings
  accessSettings: {
    startDate: {
      type: Date,
      default: Date.now
    },
    endDate: Date,
    isLifetimeAccess: {
      type: Boolean,
      default: false
    },
    extensions: [{
      extendedTo: Date,
      extendedAt: Date,
      extendedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      reason: String
    }]
  },
  // Learning Preferences
  preferences: {
    playbackSpeed: {
      type: Number,
      default: 1,
      min: 0.5,
      max: 2
    },
    subtitles: {
      enabled: {
        type: Boolean,
        default: false
      },
      language: {
        type: String,
        default: 'en'
      }
    },
    autoPlay: {
      type: Boolean,
      default: true
    },
    quality: {
      type: String,
      enum: ['auto', '144p', '240p', '360p', '480p', '720p', '1080p'],
      default: 'auto'
    }
  },
  // Notes and Bookmarks
  personalNotes: [{
    lesson: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lesson'
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000
    },
    timestamp: Number, // Video timestamp in seconds
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: Date
  }],
  bookmarks: [{
    lesson: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lesson'
    },
    title: {
      type: String,
      trim: true,
      maxlength: 100
    },
    timestamp: Number, // Video timestamp in seconds
    note: {
      type: String,
      trim: true,
      maxlength: 500
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  // Interactions and Engagement
  interactions: [{
    type: {
      type: String,
      required: true,
      enum: ['video_play', 'quiz_attempt', 'note_created', 'bookmark_added', 'forum_post', 'download']
    },
    lesson: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lesson'
    },
    metadata: mongoose.Schema.Types.Mixed,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  // Rating and Feedback
  rating: {
    score: {
      type: Number,
      min: 1,
      max: 5
    },
    review: {
      type: String,
      trim: true,
      maxlength: 1000
    },
    submittedAt: Date,
    isPublic: {
      type: Boolean,
      default: true
    },
    helpful: {
      count: {
        type: Number,
        default: 0
      },
      users: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }]
    }
  },
  // Support and Communication
  supportTickets: [{
    ticket: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SupportTicket'
    },
    subject: String,
    status: String,
    createdAt: Date
  }],
  // Completion Information
  completion: {
    completedAt: Date,
    completionCertificate: {
      type: Boolean,
      default: false
    },
    completionNotes: String
  },
  // Audit fields
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for course completion status
enrollmentSchema.virtual('isCompleted').get(function() {
  return this.status === 'completed';
});

// Virtual for days since enrollment
enrollmentSchema.virtual('daysSinceEnrollment').get(function() {
  const diffTime = Math.abs(new Date() - this.enrollmentDate);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual for estimated time to completion
enrollmentSchema.virtual('estimatedTimeToCompletion').get(function() {
  if (this.progress.overall === 0) return null;
  const timePerPercent = this.progress.totalTimeSpent / this.progress.overall;
  return Math.round(timePerPercent * (100 - this.progress.overall));
});

// Compound index for unique enrollment per user per course
enrollmentSchema.index({ user: 1, course: 1 }, { unique: true });

// Indexes for better query performance
enrollmentSchema.index({ user: 1, status: 1 });
enrollmentSchema.index({ course: 1, status: 1 });
enrollmentSchema.index({ enrollmentDate: -1 });
enrollmentSchema.index({ 'progress.overall': -1 });
enrollmentSchema.index({ 'certificate.issued': 1 });
enrollmentSchema.index({ 'payment.amountPaid': -1 });
enrollmentSchema.index({ 'progress.lastAccessed': -1 });

// Pre-save middleware to update progress
enrollmentSchema.pre('save', function(next) {
  // Update overall progress based on completed lessons
  if (this.isModified('progress.completedLessons')) {
    // This would be calculated based on total lessons in the course
    // For now, we'll set a placeholder calculation
    if (this.progress.completedLessons.length > 0) {
      // In a real scenario, you'd get total lessons from the course
      const totalLessons = 10; // This should come from course.lessons.length
      this.progress.overall = Math.min(100, (this.progress.completedLessons.length / totalLessons) * 100);
    }
  }
  
  // Update last accessed timestamp
  if (this.isModified('progress.lastAccessed') || this.isNew) {
    this.progress.lastAccessed = new Date();
  }
  
  next();
});

// Static method to get enrollments by user
enrollmentSchema.statics.getByUser = function(userId, options = {}) {
  const { status, page = 1, limit = 20 } = options;
  const skip = (page - 1) * limit;
  
  const filter = { user: userId };
  if (status) filter.status = status;
  
  return this.find(filter)
    .populate('course', 'title description instructor thumbnail duration level')
    .populate('course.instructor', 'name avatar')
    .sort({ 'progress.lastAccessed': -1 })
    .skip(skip)
    .limit(limit);
};

// Static method to get enrollments by course
enrollmentSchema.statics.getByCourse = function(courseId, options = {}) {
  const { status = 'active', page = 1, limit = 50 } = options;
  const skip = (page - 1) * limit;
  
  return this.find({
    course: courseId,
    status
  })
  .populate('user', 'name email avatar')
  .sort({ enrollmentDate: -1 })
  .skip(skip)
  .limit(limit);
};

// Static method to get active enrollments count for a course
enrollmentSchema.statics.getActiveEnrollmentsCount = function(courseId) {
  return this.countDocuments({
    course: courseId,
    status: 'active'
  });
};

// Static method to get completion rate for a course
enrollmentSchema.statics.getCompletionRate = async function(courseId) {
  const totalEnrollments = await this.countDocuments({ course: courseId });
  const completedEnrollments = await this.countDocuments({
    course: courseId,
    status: 'completed'
  });
  
  return totalEnrollments > 0 ? (completedEnrollments / totalEnrollments) * 100 : 0;
};

// Instance method to mark lesson as completed
enrollmentSchema.methods.markLessonCompleted = function(lessonId, quizScore = null, timeSpent = 0) {
  // Check if lesson is already completed
  const existingCompletion = this.progress.completedLessons.find(
    completed => completed.lesson.toString() === lessonId.toString()
  );
  
  if (!existingCompletion) {
    this.progress.completedLessons.push({
      lesson: lessonId,
      completedAt: new Date(),
      quizScore,
      timeSpent
    });
    
    // Update total time spent
    this.progress.totalTimeSpent += timeSpent;
  }
  
  return this.save();
};

// Instance method to update current lesson
enrollmentSchema.methods.updateCurrentLesson = function(lessonId) {
  this.progress.currentLesson = lessonId;
  this.progress.lastAccessed = new Date();
  return this.save();
};

// Instance method to add interaction
enrollmentSchema.methods.addInteraction = function(interactionType, lessonId = null, metadata = {}) {
  this.interactions.push({
    type: interactionType,
    lesson: lessonId,
    metadata,
    timestamp: new Date()
  });
  
  return this.save();
};

// Instance method to calculate average quiz score
enrollmentSchema.methods.getAverageQuizScore = function() {
  const completedWithScores = this.progress.completedLessons.filter(
    lesson => lesson.quizScore !== null && lesson.quizScore !== undefined
  );
  
  if (completedWithScores.length === 0) return 0;
  
  const totalScore = completedWithScores.reduce((sum, lesson) => sum + lesson.quizScore, 0);
  return totalScore / completedWithScores.length;
};

// Instance method to check if user can access course
enrollmentSchema.methods.canAccessCourse = function() {
  const now = new Date();
  
  // Check if enrollment is active
  if (this.status !== 'active') return false;
  
  // Check access dates
  if (this.accessSettings.startDate && now < this.accessSettings.startDate) return false;
  if (this.accessSettings.endDate && now > this.accessSettings.endDate) return false;
  
  return true;
};

// Instance method to issue certificate
enrollmentSchema.methods.issueCertificate = function() {
  if (this.status !== 'completed') {
    throw new Error('Certificate can only be issued for completed enrollments');
  }
  
  this.certificate.issued = true;
  this.certificate.issuedAt = new Date();
  this.certificate.certificateId = `CERT-${this._id.toString().slice(-12).toUpperCase()}-${Date.now().toString(36)}`;
  
  return this.save();
};

module.exports = mongoose.model('Enrollment', enrollmentSchema);