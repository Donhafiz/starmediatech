require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Consultant = require('./models/Consultant');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/starmediatech';

async function connectDB() {
  try {
    await mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('MongoDB connected for seeding');
  } catch (err) {
    console.error('DB connection error:', err.message);
    process.exit(1);
  }
}

async function seed() {
  await connectDB();

  try {
    // Upsert admin user
    const adminData = {
      firstName: 'Admin',
      lastName: 'User',
      email: process.env.SEED_ADMIN_EMAIL || 'admin@example.com',
      password: process.env.SEED_ADMIN_PASSWORD || 'Password123',
      role: 'admin',
      isVerified: true
    };

    const admin = await User.findOneAndUpdate(
      { email: adminData.email.toLowerCase() },
      adminData,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    console.log('Admin user seeded:', admin.email);

    // Upsert a consultant profile for admin (optional)
    const consultantData = {
      user: admin._id,
      name: `${admin.firstName} ${admin.lastName}`,
      email: admin.email,
      isActive: true,
      approvalStatus: 'approved',
      specialization: 'Full Stack'
    };

    await Consultant.findOneAndUpdate(
      { email: consultantData.email },
      consultantData,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    console.log('Consultant profile seeded for:', admin.email);

  } catch (err) {
    console.error('Seeding error:', err);
  } finally {
    mongoose.connection.close();
    console.log('Seeding complete, DB connection closed');
  }
}

if (require.main === module) {
  seed();
}

module.exports = { seed };
