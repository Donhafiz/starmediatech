require('dotenv').config();
const mongoose = require('mongoose');

const User = require('./models/User');
const Consultant = require('./models/Consultant');
const Category = require('./models/Category');
const Course = require('./models/Course');
const Service = require('./models/Service');
const Consultation = require('./models/Consultation');
const Enrollment = require('./models/Enrollment');
const Partner = require('./models/Partner');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/starmediatech';

async function connectDB() {
  try {
    await mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('MongoDB connected for extended seeding');
  } catch (err) {
    console.error('DB connection error:', err.message);
    process.exit(1);
  }
}

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
}

async function seed() {
  await connectDB();

  try {
    // Users
    const adminEmail = (process.env.SEED_ADMIN_EMAIL || 'admin@example.com').toLowerCase();
    const instructorEmail = (process.env.SEED_INSTRUCTOR_EMAIL || 'instructor@example.com').toLowerCase();
    const userEmail = (process.env.SEED_USER_EMAIL || 'jane.doe@example.com').toLowerCase();

    const admin = await User.findOneAndUpdate(
      { email: adminEmail },
      { $setOnInsert: { firstName: 'Admin', lastName: 'User', email: adminEmail, password: process.env.SEED_ADMIN_PASSWORD || 'Password123', role: 'admin', isVerified: true } },
      { upsert: true, new: true }
    );

    const instructor = await User.findOneAndUpdate(
      { email: instructorEmail },
      { $setOnInsert: { firstName: 'Bob', lastName: 'Instructor', email: instructorEmail, password: 'Password123', role: 'instructor', isVerified: true } },
      { upsert: true, new: true }
    );

    const user = await User.findOneAndUpdate(
      { email: userEmail },
      { $setOnInsert: { firstName: 'Jane', lastName: 'Doe', email: userEmail, password: 'Password123', role: 'user', isVerified: true } },
      { upsert: true, new: true }
    );

    console.log('Users ready:', admin.email, instructor.email, user.email);

    // Consultant profile for instructor
    const consultant = await Consultant.findOneAndUpdate(
      { user: instructor._id },
      { $set: { user: instructor._id, name: `${instructor.firstName} ${instructor.lastName}`, email: instructor.email, isActive: true, approvalStatus: 'approved', specialization: 'Full Stack Development' } },
      { upsert: true, new: true }
    );

    // Categories (course slugs required by Course.category enum)
    const courseSlugs = ['web-development','graphic-design','data-science','photoshop','it-solutions','tech-consultancy'];
    const categoryDocs = {};
    for (const s of courseSlugs) {
      const doc = await Category.findOneAndUpdate(
        { slug: s },
        { $setOnInsert: { name: s.replace(/-/g, ' '), slug: s, description: `${s} category`, type: 'course' } },
        { upsert: true, new: true }
      );
      categoryDocs[s] = doc;
    }

    // Service category
    const serviceCat = await Category.findOneAndUpdate(
      { slug: 'consulting' },
      { $setOnInsert: { name: 'Consulting', slug: 'consulting', description: 'Consulting services', type: 'service' } },
      { upsert: true, new: true }
    );

    console.log('Categories created');

    // Courses
    const sampleCourses = [
      {
        title: 'Full Stack Web Development Bootcamp',
        description: 'Learn modern web development with hands-on projects.',
        shortDescription: 'Build full-stack apps using Node, React and MongoDB.',
        instructor: instructor._id,
        category: 'web-development',
        level: 'beginner',
        price: 299,
        duration: 120,
        isPublished: true,
        isFeatured: true,
        curriculum: [{ moduleTitle: 'Intro', moduleDescription: 'Getting started', lessons: [{ lessonTitle: 'Welcome' }] }],
        slug: slugify('Full Stack Web Development Bootcamp')
      },
      {
        title: 'UI/UX Design Mastery',
        description: 'Master user interface and experience design principles.',
        shortDescription: 'Design beautiful and usable interfaces.',
        instructor: instructor._id,
        category: 'graphic-design',
        level: 'intermediate',
        price: 199,
        duration: 80,
        isPublished: true,
        curriculum: [{ moduleTitle: 'Foundations', lessons: [{ lessonTitle: 'Design Basics' }] }],
        slug: slugify('UI/UX Design Mastery')
      },
      {
        title: 'Data Science Essentials',
        description: 'Learn data analysis, visualization and machine learning basics.',
        shortDescription: 'Intro to data science with Python and tools.',
        instructor: instructor._id,
        category: 'data-science',
        level: 'beginner',
        price: 249,
        duration: 100,
        isPublished: true,
        curriculum: [{ moduleTitle: 'Data Basics', lessons: [{ lessonTitle: 'What is Data Science?' }] }],
        slug: slugify('Data Science Essentials')
      }
    ];

    const createdCourses = [];
    for (const c of sampleCourses) {
      let course = await Course.findOne({ title: c.title });
      if (!course) {
        course = await Course.create(c);
      }
      createdCourses.push(course);
    }

    console.log('Courses created:', createdCourses.map(c=>c.title).join(', '));

    // Services
    const sampleServices = [
      {
        title: 'Website Review & Optimization',
        description: 'In-depth review of your website with actionable recommendations.',
        shortDescription: 'Performance, SEO and UX audit.',
        consultant: consultant._id,
        category: serviceCat._id,
        price: 150,
        duration: 60,
        createdBy: admin._id,
        slug: slugify('Website Review & Optimization')
      },
      {
        title: 'Custom Web App Development',
        description: 'Build a custom web application tailored to your needs.',
        shortDescription: 'End-to-end development service.',
        consultant: consultant._id,
        category: serviceCat._id,
        price: 1200,
        duration: 240,
        createdBy: admin._id,
        slug: slugify('Custom Web App Development')
      }
    ];

    const createdServices = [];
    for (const s of sampleServices) {
      let svc = await Service.findOne({ title: s.title });
      if (!svc) svc = await Service.create(s);
      createdServices.push(svc);
    }

    console.log('Services created:', createdServices.map(s=>s.title).join(', '));

    // Partner
    const partnerData = {
      name: 'Acme Education',
      type: 'educational',
      description: 'Acme Education partners with Star Media Tech to provide job placements and training.',
      shortDescription: 'Trusted education partner.',
      email: 'partners@acmeedu.com',
      website: 'https://acmeedu.example',
      logo: { url: 'https://via.placeholder.com/150', alt: 'Acme Logo' },
      partnershipType: 'strategic',
      partnershipLevel: 'gold',
      partnershipStartDate: new Date(),
      services: [{ title: 'Training', description: 'Hands-on training', category: 'training' }],
      createdBy: admin._id,
      status: 'active'
    };

    await Partner.findOneAndUpdate({ email: partnerData.email }, partnerData, { upsert: true, new: true });
    console.log('Partner seeded');

    // Consultations (create one future consultation)
    const consultDate = new Date();
    consultDate.setDate(consultDate.getDate() + 3);
    consultDate.setHours(10,0,0,0);

    const consultation = await Consultation.findOneAndUpdate(
      { title: 'Intro Consultation for Jane' },
      {
        $setOnInsert: {
          user: user._id,
          consultant: instructor._id,
          serviceType: 'web-development',
          title: 'Intro Consultation for Jane',
          description: 'Initial consultation to discuss project scope.',
          scheduledDate: consultDate,
          duration: 60,
          price: 100,
          status: 'confirmed'
        }
      },
      { upsert: true, new: true }
    );

    console.log('Consultation seeded:', consultation.title);

    // Enrollments: enroll user in first course
    if (createdCourses.length > 0) {
      const course = createdCourses[0];
      await Enrollment.findOneAndUpdate(
        { user: user._id, course: course._id },
        { $setOnInsert: { user: user._id, course: course._id, enrollmentType: 'paid', status: 'active', payment: { amountPaid: course.price, currency: 'USD' }, createdBy: admin._id } },
        { upsert: true, new: true }
      );
      console.log(`Enrolled ${user.email} in ${course.title}`);
    }

    console.log('Extended seeding complete');

  } catch (err) {
    console.error('Seeding error:', err);
  } finally {
    await mongoose.connection.close();
    console.log('DB connection closed');
  }
}

if (require.main === module) seed();

module.exports = { seed };
