const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Course title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  description: {
    type: String,
    required: [true, 'Course description is required'],
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  shortDescription: {
    type: String,
    required: true,
    maxlength: [200, 'Short description cannot exceed 200 characters']
  },
  instructor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  category: {
    type: String,
    required: true,
    enum: [
      'web-development',
      'graphic-design',
      'data-science',
      'photoshop',
      'it-solutions',
      'tech-consultancy'
    ]
  },
  level: {
    type: String,
    required: true,
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'beginner'
  },
  price: {
    type: Number,
    required: true,
    min: [0, 'Price cannot be negative']
  },
  discountedPrice: {
    type: Number,
    validate: {
      validator: function(value) {
        return value <= this.price;
      },
      message: 'Discounted price cannot be higher than regular price'
    }
  },
  thumbnail: {
    public_id: String,
    url: String
  },
  previewVideo: {
    public_id: String,
    url: String
  },
  curriculum: [{
    moduleTitle: {
      type: String,
      required: true
    },
    moduleDescription: String,
    lessons: [{
      lessonTitle: {
        type: String,
        required: true
      },
      lessonType: {
        type: String,
        enum: ['video', 'text', 'quiz', 'assignment'],
        default: 'video'
      },
      duration: Number, // in minutes
      content: String, // video URL or text content
      isFree: {
        type: Boolean,
        default: false
      },
      resources: [{
        title: String,
        url: String,
        type: String
      }]
    }]
  }],
  requirements: [String],
  learningOutcomes: [String],
  tags: [String],
  ratings: {
    average: {
      type: Number,
      default: 0,
      min: [0, 'Rating cannot be less than 0'],
      max: [5, 'Rating cannot be more than 5']
    },
    count: {
      type: Number,
      default: 0
    }
  },
  studentsEnrolled: {
    type: Number,
    default: 0
  },
  duration: {
    type: Number, // total course duration in hours
    required: true
  },
  isPublished: {
    type: Boolean,
    default: false
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  certificateAvailable: {
    type: Boolean,
    default: true
  },
  language: {
    type: String,
    default: 'English'
  },
  supportAvailable: {
    type: Boolean,
    default: true
  },
  lifetimeAccess: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for discount percentage
courseSchema.virtual('discountPercentage').get(function() {
  if (this.discountedPrice && this.price > 0) {
    return Math.round(((this.price - this.discountedPrice) / this.price) * 100);
  }
  return 0;
});

// Index for search functionality
courseSchema.index({
  title: 'text',
  description: 'text',
  shortDescription: 'text',
  tags: 'text'
});

// Pre-save middleware to generate slug
courseSchema.pre('save', function(next) {
  if (this.isModified('title')) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9 -]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }
  next();
});

// Static method to get featured courses
courseSchema.statics.getFeaturedCourses = function() {
  return this.find({ isPublished: true, isFeatured: true })
    .populate('instructor', 'firstName lastName avatar')
    .sort({ createdAt: -1 })
    .limit(8);
};

// Instance method to update ratings
courseSchema.methods.updateRatings = async function() {
  const Enrollment = mongoose.model('Enrollment');
  const result = await Enrollment.aggregate([
    {
      $match: { course: this._id, rating: { $gt: 0 } }
    },
    {
      $group: {
        _id: '$course',
        averageRating: { $avg: '$rating' },
        ratingCount: { $sum: 1 }
      }
    }
  ]);

  if (result.length > 0) {
    this.ratings.average = Math.round(result[0].averageRating * 10) / 10;
    this.ratings.count = result[0].ratingCount;
  } else {
    this.ratings.average = 0;
    this.ratings.count = 0;
  }

  await this.save();
};

module.exports = mongoose.model('Course', courseSchema);