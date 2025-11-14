const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Service title is required'],
    trim: true,
    minlength: [5, 'Service title must be at least 5 characters long'],
    maxlength: [100, 'Service title cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Service description is required'],
    trim: true,
    minlength: [20, 'Service description must be at least 20 characters long'],
    maxlength: [1000, 'Service description cannot exceed 1000 characters']
  },
  shortDescription: {
    type: String,
    trim: true,
    maxlength: [200, 'Short description cannot exceed 200 characters']
  },
  consultant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Consultant',
    required: [true, 'Consultant reference is required']
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, 'Service category is required']
  },
  price: {
    type: Number,
    required: [true, 'Service price is required'],
    min: [0, 'Price cannot be negative'],
    max: [10000, 'Price seems too high']
  },
  duration: {
    type: Number, // in minutes
    required: [true, 'Service duration is required'],
    min: [15, 'Duration must be at least 15 minutes'],
    max: [480, 'Duration cannot exceed 8 hours']
  },
  currency: {
    type: String,
    default: 'USD',
    enum: ['USD', 'EUR', 'GBP', 'CAD', 'AUD']
  },
  features: [{
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },
    description: {
      type: String,
      trim: true,
      maxlength: 200
    },
    included: {
      type: Boolean,
      default: true
    }
  }],
  requirements: [{
    type: String,
    trim: true,
    maxlength: 200
  }],
  whatYouGet: [{
    type: String,
    trim: true,
    maxlength: 200
  }],
  tags: [{
    type: String,
    trim: true,
    lowercase: true,
    maxlength: 50
  }],
  images: [{
    url: {
      type: String,
      required: true
    },
    alt: {
      type: String,
      trim: true,
      maxlength: 100
    },
    isPrimary: {
      type: Boolean,
      default: false
    }
  }],
  availability: {
    monday: { type: Boolean, default: true },
    tuesday: { type: Boolean, default: true },
    wednesday: { type: Boolean, default: true },
    thursday: { type: Boolean, default: true },
    friday: { type: Boolean, default: true },
    saturday: { type: Boolean, default: false },
    sunday: { type: Boolean, default: false }
  },
  timeSlots: [{
    startTime: {
      type: String,
      required: true,
      match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please provide a valid time format (HH:MM)']
    },
    endTime: {
      type: String,
      required: true,
      match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please provide a valid time format (HH:MM)']
    },
    isAvailable: {
      type: Boolean,
      default: true
    }
  }],
  // Statistics
  totalBookings: {
    type: Number,
    default: 0
  },
  completedBookings: {
    type: Number,
    default: 0
  },
  rating: {
    average: {
      type: Number,
      default: 0,
      min: [0, 'Rating cannot be less than 0'],
      max: [5, 'Rating cannot exceed 5']
    },
    count: {
      type: Number,
      default: 0
    },
    distribution: {
      1: { type: Number, default: 0 },
      2: { type: Number, default: 0 },
      3: { type: Number, default: 0 },
      4: { type: Number, default: 0 },
      5: { type: Number, default: 0 }
    }
  },
  views: {
    type: Number,
    default: 0
  },
  // Status and visibility
  isActive: {
    type: Boolean,
    default: true
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  verification: {
    verifiedAt: Date,
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    notes: String
  },
  // Booking settings
  maxBookingsPerDay: {
    type: Number,
    default: 5,
    min: [1, 'Must allow at least 1 booking per day'],
    max: [50, 'Cannot exceed 50 bookings per day']
  },
  advanceBookingDays: {
    type: Number,
    default: 30,
    min: [1, 'Must allow at least 1 day advance booking'],
    max: [365, 'Cannot exceed 365 days advance booking']
  },
  cancellationPolicy: {
    type: String,
    enum: ['flexible', 'moderate', 'strict'],
    default: 'moderate'
  },
  // SEO and marketing
  slug: {
    type: String,
    unique: true,
    lowercase: true,
    trim: true
  },
  metaTitle: {
    type: String,
    trim: true,
    maxlength: 60
  },
  metaDescription: {
    type: String,
    trim: true,
    maxlength: 160
  },
  // Audit fields
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
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

// Virtual for popular score (combines rating and bookings)
serviceSchema.virtual('popularityScore').get(function() {
  const ratingWeight = 0.7;
  const bookingsWeight = 0.3;
  return (this.rating.average * ratingWeight) + (this.totalBookings * bookingsWeight / 100);
});

// Virtual for estimated earnings
serviceSchema.virtual('estimatedEarnings').get(function() {
  return this.completedBookings * this.price;
});

// Indexes for better query performance
serviceSchema.index({ consultant: 1, isActive: 1 });
serviceSchema.index({ category: 1, isActive: 1 });
serviceSchema.index({ price: 1 });
serviceSchema.index({ rating: -1 });
serviceSchema.index({ totalBookings: -1 });
serviceSchema.index({ slug: 1 }, { unique: true });
serviceSchema.index({ tags: 1 });
serviceSchema.index({ isFeatured: 1, isActive: 1 });
serviceSchema.index({ 'availability.monday': 1, 'availability.tuesday': 1 });

// Pre-save middleware to generate slug
serviceSchema.pre('save', async function(next) {
  if (this.isModified('title') && !this.slug) {
    const baseSlug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
    
    let slug = baseSlug;
    let counter = 1;
    
    // Check for existing slugs
    while (await mongoose.model('Service').findOne({ slug })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
    
    this.slug = slug;
  }
  
  // Update meta fields if not set
  if (!this.metaTitle) {
    this.metaTitle = this.title.substring(0, 60);
  }
  
  if (!this.metaDescription && this.shortDescription) {
    this.metaDescription = this.shortDescription.substring(0, 160);
  }
  
  next();
});

// Static method to get featured services
serviceSchema.statics.getFeatured = function(limit = 10) {
  return this.find({
    isFeatured: true,
    isActive: true,
    'rating.average': { $gte: 4.0 }
  })
  .populate('consultant', 'name avatar specialization rating')
  .populate('category', 'name slug')
  .sort({ 'rating.average': -1, totalBookings: -1 })
  .limit(limit);
};

// Static method to get services by consultant
serviceSchema.statics.getByConsultant = function(consultantId, options = {}) {
  const { isActive = true, limit = 50, page = 1 } = options;
  const skip = (page - 1) * limit;
  
  return this.find({
    consultant: consultantId,
    isActive
  })
  .populate('category', 'name slug')
  .sort({ createdAt: -1 })
  .skip(skip)
  .limit(limit);
};

// Static method to search services
serviceSchema.statics.search = function(query, options = {}) {
  const {
    category,
    minPrice,
    maxPrice,
    minRating,
    duration,
    consultant,
    page = 1,
    limit = 12,
    sortBy = 'rating.average',
    sortOrder = 'desc'
  } = options;
  
  const filter = {
    isActive: true,
    $or: [
      { title: { $regex: query, $options: 'i' } },
      { description: { $regex: query, $options: 'i' } },
      { tags: { $in: [new RegExp(query, 'i')] } }
    ]
  };
  
  if (category) filter.category = category;
  if (consultant) filter.consultant = consultant;
  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = minPrice;
    if (maxPrice) filter.price.$lte = maxPrice;
  }
  if (minRating) filter['rating.average'] = { $gte: minRating };
  if (duration) filter.duration = duration;
  
  const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };
  const skip = (page - 1) * limit;
  
  return this.find(filter)
    .populate('consultant', 'name avatar specialization rating totalRatings')
    .populate('category', 'name slug')
    .sort(sort)
    .skip(skip)
    .limit(limit);
};

// Instance method to update rating
serviceSchema.methods.updateRating = function(newRating) {
  const oldRating = this.rating.average;
  const oldCount = this.rating.count;
  
  // Calculate new average
  const newAverage = ((oldRating * oldCount) + newRating) / (oldCount + 1);
  
  // Update rating distribution
  const ratingKey = Math.floor(newRating);
  this.rating.distribution.set(ratingKey.toString(), this.rating.distribution.get(ratingKey.toString()) + 1);
  
  // Update average and count
  this.rating.average = parseFloat(newAverage.toFixed(1));
  this.rating.count = oldCount + 1;
  
  return this.save();
};

// Instance method to check availability for a time slot
serviceSchema.methods.isTimeSlotAvailable = function(date, timeSlot) {
  const dayOfWeek = date.getDay();
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayName = dayNames[dayOfWeek];
  
  // Check if service is available on this day
  if (!this.availability[dayName]) {
    return false;
  }
  
  // Check if time slot exists and is available
  const slot = this.timeSlots.find(s => s.startTime === timeSlot);
  return slot && slot.isAvailable;
};

// Instance method to increment views
serviceSchema.methods.incrementViews = function() {
  this.views += 1;
  return this.save();
};

// Instance method to toggle active status
serviceSchema.methods.toggleActive = function() {
  this.isActive = !this.isActive;
  return this.save();
};

module.exports = mongoose.model('Service', serviceSchema);