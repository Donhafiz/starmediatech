const mongoose = require('mongoose');

const partnerSchema = new mongoose.Schema({
  // Basic Information
  name: {
    type: String,
    required: [true, 'Partner name is required'],
    trim: true,
    minlength: [2, 'Partner name must be at least 2 characters long'],
    maxlength: [100, 'Partner name cannot exceed 100 characters']
  },
  type: {
    type: String,
    required: [true, 'Partner type is required'],
    enum: {
      values: ['corporate', 'educational', 'technology', 'recruitment', 'community', 'other'],
      message: 'Please select a valid partner type'
    }
  },
  description: {
    type: String,
    required: [true, 'Partner description is required'],
    trim: true,
    minlength: [50, 'Description must be at least 50 characters long'],
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  shortDescription: {
    type: String,
    trim: true,
    maxlength: [200, 'Short description cannot exceed 200 characters']
  },
  // Contact Information
  email: {
    type: String,
    required: [true, 'Email is required'],
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
  },
  phone: {
    type: String,
    trim: true,
    match: [/^\+?[\d\s\-\(\)]{10,}$/, 'Please provide a valid phone number']
  },
  website: {
    type: String,
    trim: true,
    match: [/^https?:\/\/.+\..+/, 'Please provide a valid website URL']
  },
  // Location
  address: {
    street: { type: String, trim: true, maxlength: 200 },
    city: { type: String, trim: true, maxlength: 100 },
    state: { type: String, trim: true, maxlength: 100 },
    country: { type: String, trim: true, maxlength: 100 },
    zipCode: { type: String, trim: true, maxlength: 20 }
  },
  // Media
  logo: {
    url: { type: String, required: true },
    alt: { type: String, trim: true, maxlength: 100 }
  },
  images: [{
    url: { type: String, required: true },
    alt: { type: String, trim: true, maxlength: 100 },
    caption: { type: String, trim: true, maxlength: 200 }
  }],
  // Social Media
  socialMedia: {
    linkedin: { type: String, trim: true },
    twitter: { type: String, trim: true },
    facebook: { type: String, trim: true },
    instagram: { type: String, trim: true },
    youtube: { type: String, trim: true }
  },
  // Partnership Details
  partnershipType: {
    type: String,
    required: true,
    enum: {
      values: ['strategic', 'technology', 'content', 'affiliate', 'reseller', 'sponsor'],
      message: 'Please select a valid partnership type'
    }
  },
  partnershipLevel: {
    type: String,
    required: true,
    enum: {
      values: ['bronze', 'silver', 'gold', 'platinum', 'strategic'],
      message: 'Please select a valid partnership level'
    }
  },
  partnershipStartDate: {
    type: Date,
    required: true
  },
  partnershipEndDate: {
    type: Date,
    validate: {
      validator: function(value) {
        return !value || value > this.partnershipStartDate;
      },
      message: 'Partnership end date must be after start date'
    }
  },
  // Services and Offerings
  services: [{
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },
    description: {
      type: String,
      trim: true,
      maxlength: 300
    },
    category: {
      type: String,
      required: true,
      enum: ['consulting', 'training', 'software', 'recruitment', 'events', 'other']
    },
    isExclusive: {
      type: Boolean,
      default: false
    }
  }],
  benefits: [{
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },
    description: {
      type: String,
      trim: true,
      maxlength: 300
    },
    type: {
      type: String,
      enum: ['discount', 'access', 'support', 'training', 'other'],
      default: 'other'
    },
    value: {
      type: String,
      trim: true,
      maxlength: 100
    }
  }],
  // Contact Persons
  contactPersons: [{
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true
    },
    phone: {
      type: String,
      trim: true
    },
    isPrimary: {
      type: Boolean,
      default: false
    }
  }],
  // Performance Metrics
  metrics: {
    totalReferrals: {
      type: Number,
      default: 0
    },
    successfulReferrals: {
      type: Number,
      default: 0
    },
    revenueGenerated: {
      type: Number,
      default: 0
    },
    studentPlacements: {
      type: Number,
      default: 0
    },
    satisfactionScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    }
  },
  // Agreement Details
  agreement: {
    documentUrl: { type: String, trim: true },
    signedDate: { type: Date },
    renewalDate: { type: Date },
    terms: { type: String, trim: true, maxlength: 1000 },
    commissionRate: { type: Number, min: 0, max: 100 }, // Percentage
    minimumCommitment: { type: Number, min: 0 }
  },
  // Status and Settings
  status: {
    type: String,
    required: true,
    enum: {
      values: ['active', 'pending', 'suspended', 'terminated', 'expired'],
      message: 'Please select a valid status'
    },
    default: 'pending'
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
  // SEO and Marketing
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
  featuredText: {
    type: String,
    trim: true,
    maxlength: 300
  },
  // Internal Notes
  internalNotes: [{
    note: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
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

// Virtual for partnership duration
partnerSchema.virtual('partnershipDuration').get(function() {
  if (!this.partnershipStartDate) return 0;
  const endDate = this.partnershipEndDate || new Date();
  const diffTime = Math.abs(endDate - this.partnershipStartDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
});

// Virtual for conversion rate
partnerSchema.virtual('conversionRate').get(function() {
  if (this.metrics.totalReferrals === 0) return 0;
  return (this.metrics.successfulReferrals / this.metrics.totalReferrals) * 100;
});

// Virtual for partnership status
partnerSchema.virtual('isActivePartnership').get(function() {
  const now = new Date();
  return this.status === 'active' && 
         this.partnershipStartDate <= now && 
         (!this.partnershipEndDate || this.partnershipEndDate >= now);
});

// Indexes for better query performance
partnerSchema.index({ type: 1, status: 1 });
partnerSchema.index({ partnershipLevel: 1, status: 1 });
partnerSchema.index({ status: 1, isFeatured: 1 });
partnerSchema.index({ slug: 1 }, { unique: true });
partnerSchema.index({ 'metrics.revenueGenerated': -1 });
partnerSchema.index({ partnershipStartDate: 1, partnershipEndDate: 1 });

// Pre-save middleware to generate slug
partnerSchema.pre('save', async function(next) {
  if (this.isModified('name') && !this.slug) {
    const baseSlug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
    
    let slug = baseSlug;
    let counter = 1;
    
    while (await mongoose.model('Partner').findOne({ slug })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
    
    this.slug = slug;
  }
  
  // Update meta fields if not set
  if (!this.metaTitle) {
    this.metaTitle = this.name.substring(0, 60);
  }
  
  if (!this.metaDescription && this.shortDescription) {
    this.metaDescription = this.shortDescription.substring(0, 160);
  }
  
  next();
});

// Static method to get active partners
partnerSchema.statics.getActivePartners = function(options = {}) {
  const { type, partnershipLevel, limit = 50, page = 1 } = options;
  const skip = (page - 1) * limit;
  
  const filter = { status: 'active' };
  if (type) filter.type = type;
  if (partnershipLevel) filter.partnershipLevel = partnershipLevel;
  
  return this.find(filter)
    .sort({ 'metrics.revenueGenerated': -1, partnershipLevel: -1 })
    .skip(skip)
    .limit(limit);
};

// Static method to get featured partners
partnerSchema.statics.getFeatured = function(limit = 10) {
  return this.find({
    status: 'active',
    isFeatured: true
  })
  .sort({ partnershipLevel: -1, 'metrics.revenueGenerated': -1 })
  .limit(limit);
};

// Static method to search partners
partnerSchema.statics.search = function(query, options = {}) {
  const {
    type,
    partnershipLevel,
    status = 'active',
    page = 1,
    limit = 12,
    sortBy = 'partnershipLevel',
    sortOrder = 'desc'
  } = options;
  
  const filter = {
    status,
    $or: [
      { name: { $regex: query, $options: 'i' } },
      { description: { $regex: query, $options: 'i' } },
      { 'services.title': { $regex: query, $options: 'i' } }
    ]
  };
  
  if (type) filter.type = type;
  if (partnershipLevel) filter.partnershipLevel = partnershipLevel;
  
  const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };
  const skip = (page - 1) * limit;
  
  return this.find(filter)
    .sort(sort)
    .skip(skip)
    .limit(limit);
};

// Instance method to update metrics
partnerSchema.methods.updateMetrics = function(metricsUpdate) {
  Object.keys(metricsUpdate).forEach(key => {
    if (this.metrics[key] !== undefined) {
      this.metrics[key] += metricsUpdate[key];
    }
  });
  return this.save();
};

// Instance method to add contact person
partnerSchema.methods.addContactPerson = function(contactData) {
  // If setting as primary, remove primary from others
  if (contactData.isPrimary) {
    this.contactPersons.forEach(person => {
      person.isPrimary = false;
    });
  }
  
  this.contactPersons.push(contactData);
  return this.save();
};

// Instance method to get primary contact
partnerSchema.methods.getPrimaryContact = function() {
  return this.contactPersons.find(person => person.isPrimary) || this.contactPersons[0];
};

// Instance method to check if partnership is expiring soon (within 30 days)
partnerSchema.methods.isExpiringSoon = function() {
  if (!this.partnershipEndDate || this.status !== 'active') {
    return false;
  }
  
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
  
  return this.partnershipEndDate <= thirtyDaysFromNow;
};

module.exports = mongoose.model('Partner', partnerSchema);