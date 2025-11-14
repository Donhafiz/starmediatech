const Service = require('../models/Service');
const ServiceBooking = require('../models/ServiceBooking');
const { uploadToCloudinary } = require('../utils/cloudinaryUpload');

// @desc    Get all services with filtering and pagination
// @route   GET /api/services
// @access  Public
const getServices = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      category,
      minPrice,
      maxPrice,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter object
    const filter = { status: 'active' };
    
    if (category) filter.category = category;
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = parseInt(minPrice);
      if (maxPrice) filter.price.$lte = parseInt(maxPrice);
    }

    // Search functionality
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    // Sort options
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const services = await Service.find(filter)
      .populate('provider', 'firstName lastName avatar rating bio')
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Service.countDocuments(filter);

    res.json({
      success: true,
      data: {
        services,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total
        }
      }
    });

  } catch (error) {
    console.error('Get services error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching services'
    });
  }
};

// @desc    Get single service
// @route   GET /api/services/:id
// @access  Public
const getService = async (req, res) => {
  try {
    const service = await Service.findById(req.params.id)
      .populate('provider', 'firstName lastName avatar rating bio socialLinks');

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    res.json({
      success: true,
      data: { service }
    });

  } catch (error) {
    console.error('Get service error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching service'
    });
  }
};

// @desc    Create service
// @route   POST /api/services
// @access  Private (Service Provider/Admin)
const createService = async (req, res) => {
  try {
    const serviceData = {
      ...req.body,
      provider: req.user.id
    };

    // Handle service images upload
    if (req.files && req.files.images) {
      const imageUploads = req.files.images.map(file => 
        uploadToCloudinary(file.path, 'services/images')
      );
      serviceData.images = await Promise.all(imageUploads);
    }

    const service = await Service.create(serviceData);

    res.status(201).json({
      success: true,
      message: 'Service created successfully',
      data: { service }
    });

  } catch (error) {
    console.error('Create service error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating service'
    });
  }
};

// @desc    Update service
// @route   PUT /api/services/:id
// @access  Private (Service Provider/Admin)
const updateService = async (req, res) => {
  try {
    let service = await Service.findById(req.params.id);

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    // Check ownership
    if (service.provider.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this service'
      });
    }

    const updateData = { ...req.body };

    // Handle new images upload
    if (req.files && req.files.images) {
      const imageUploads = req.files.images.map(file => 
        uploadToCloudinary(file.path, 'services/images')
      );
      const newImages = await Promise.all(imageUploads);
      updateData.images = [...service.images, ...newImages];
    }

    service = await Service.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true
    });

    res.json({
      success: true,
      message: 'Service updated successfully',
      data: { service }
    });

  } catch (error) {
    console.error('Update service error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating service'
    });
  }
};

// @desc    Book a service
// @route   POST /api/services/:id/book
// @access  Private
const bookService = async (req, res) => {
  try {
    const { date, time, duration, notes, contactInfo } = req.body;

    const service = await Service.findById(req.params.id);
    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    // Check if service is available
    if (service.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Service is not available for booking'
      });
    }

    // Check for conflicting bookings
    const conflictingBooking = await ServiceBooking.findOne({
      service: service._id,
      date: new Date(date),
      status: { $in: ['pending', 'confirmed'] }
    });

    if (conflictingBooking) {
      return res.status(400).json({
        success: false,
        message: 'Service is already booked for this date and time'
      });
    }

    const booking = await ServiceBooking.create({
      service: service._id,
      client: req.user.id,
      provider: service.provider,
      date,
      time,
      duration,
      notes,
      contactInfo,
      totalPrice: service.price * duration
    });

    // Send notification to service provider (you can implement this)
    // await sendNotification(service.provider, 'new_booking', { bookingId: booking._id });

    res.status(201).json({
      success: true,
      message: 'Service booked successfully',
      data: { booking }
    });

  } catch (error) {
    console.error('Book service error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while booking service'
    });
  }
};

// @desc    Get user's service bookings
// @route   GET /api/services/bookings/my-bookings
// @access  Private
const getMyBookings = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;

    const filter = { client: req.user.id };
    if (status) filter.status = status;

    const bookings = await ServiceBooking.find(filter)
      .populate('service', 'title images price')
      .populate('provider', 'firstName lastName avatar')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await ServiceBooking.countDocuments(filter);

    res.json({
      success: true,
      data: {
        bookings,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total
        }
      }
    });

  } catch (error) {
    console.error('Get bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching bookings'
    });
  }
};

// @desc    Get service categories
// @route   GET /api/services/categories
// @access  Public
const getServiceCategories = async (req, res) => {
  try {
    const categories = await Service.aggregate([
      { $match: { status: 'active' } },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          avgPrice: { $avg: '$price' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    res.json({
      success: true,
      data: { categories }
    });

  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching service categories'
    });
  }
};

module.exports = {
  getServices,
  getService,
  createService,
  updateService,
  bookService,
  getMyBookings,
  getServiceCategories
};