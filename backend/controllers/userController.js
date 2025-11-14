const User = require('../models/User');
const Enrollment = require('../models/Enrollment');
const Course = require('../models/Course');
const { uploadToCloudinary } = require('../utils/cloudinaryUpload');

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    res.json({
      success: true,
      data: {
        user: user.getPublicProfile()
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching profile'
    });
  }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
const updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, phone, bio, skills, socialLinks, preferences } = req.body;

    // Handle avatar upload
    if (req.file) {
      const avatarResult = await uploadToCloudinary(req.file.path, 'users/avatars');
      req.body.avatar = avatarResult;
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      {
        firstName,
        lastName,
        phone,
        bio,
        skills,
        socialLinks,
        preferences,
        ...(req.body.avatar && { avatar: req.body.avatar })
      },
      {
        new: true,
        runValidators: true
      }
    );

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: user.getPublicProfile()
      }
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating profile'
    });
  }
};

// @desc    Get user enrollments
// @route   GET /api/users/enrollments
// @access  Private
const getUserEnrollments = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;

    const filter = { user: req.user.id };
    if (status) filter.status = status;

    const enrollments = await Enrollment.find(filter)
      .populate({
        path: 'course',
        select: 'title thumbnail instructor price duration level category'
      })
      .sort({ enrolledAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Enrollment.countDocuments(filter);

    res.json({
      success: true,
      data: {
        enrollments,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total
        }
      }
    });

  } catch (error) {
    console.error('Get enrollments error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching enrollments'
    });
  }
};

// @desc    Get user dashboard stats
// @route   GET /api/users/dashboard
// @access  Private
const getDashboardStats = async (req, res) => {
  try {
    const userId = req.user.id;

    const [
      totalEnrollments,
      completedCourses,
      activeEnrollments,
      recentEnrollments
    ] = await Promise.all([
      Enrollment.countDocuments({ user: userId }),
      Enrollment.countDocuments({ user: userId, status: 'completed' }),
      Enrollment.countDocuments({ user: userId, status: 'active' }),
      Enrollment.find({ user: userId })
        .populate('course', 'title thumbnail')
        .sort({ enrolledAt: -1 })
        .limit(5)
    ]);

    // Calculate learning progress
    const enrollments = await Enrollment.find({ user: userId, status: 'active' });
    const totalProgress = enrollments.reduce((acc, curr) => acc + curr.progress, 0);
    const averageProgress = enrollments.length > 0 ? totalProgress / enrollments.length : 0;

    res.json({
      success: true,
      data: {
        stats: {
          totalEnrollments,
          completedCourses,
          activeEnrollments,
          averageProgress: Math.round(averageProgress)
        },
        recentEnrollments
      }
    });

  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching dashboard stats'
    });
  }
};

// @desc    Update user preferences
// @route   PUT /api/users/preferences
// @access  Private
const updatePreferences = async (req, res) => {
  try {
    const { emailNotifications, smsNotifications, courseUpdates, newsletter } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      {
        preferences: {
          emailNotifications,
          smsNotifications,
          courseUpdates,
          newsletter
        }
      },
      {
        new: true,
        runValidators: true
      }
    );

    res.json({
      success: true,
      message: 'Preferences updated successfully',
      data: {
        preferences: user.preferences
      }
    });

  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating preferences'
    });
  }
};

// @desc    Delete user account
// @route   DELETE /api/users/account
// @access  Private
const deleteAccount = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    // In a real application, you might want to:
    // 1. Archive user data instead of hard delete
    // 2. Send confirmation email
    // 3. Handle related data cleanup (enrollments, etc.)

    await User.findByIdAndDelete(req.user.id);

    res.json({
      success: true,
      message: 'Account deleted successfully'
    });

  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting account'
    });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  getUserEnrollments,
  getDashboardStats,
  updatePreferences,
  deleteAccount
};