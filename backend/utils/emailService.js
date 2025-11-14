const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

// Create transporter (use correct nodemailer API)
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE,
  auth: {
    user: process.env.EMAIL_USERNAME,
    pass: process.env.EMAIL_PASSWORD
  }
});

// Email templates
const templates = {
  emailVerification: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #667eea; text-align: center;">Verify Your Email</h2>
      <p>Hello {{name}},</p>
      <p>Thank you for registering with Star Media Tech. Please verify your email address by clicking the button below:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="{{verificationUrl}}" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
          Verify Email
        </a>
      </div>
      <p>If the button doesn't work, copy and paste this link in your browser:</p>
      <p>{{verificationUrl}}</p>
      <p>This link will expire in 24 hours.</p>
    </div>
  `,
  passwordReset: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #667eea; text-align: center;">Reset Your Password</h2>
      <p>Hello {{name}},</p>
      <p>You requested to reset your password. Click the button below to create a new password:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="{{resetUrl}}" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
          Reset Password
        </a>
      </div>
      <p>If you didn't request this, please ignore this email.</p>
      <p>This link will expire in 30 minutes.</p>
    </div>
  `
};

const sendEmail = async ({ email, subject, template, data }) => {
  try {
    let html = templates[template];
    
    // Replace template variables
    Object.keys(data).forEach(key => {
      html = html.replace(new RegExp(`{{${key}}}`, 'g'), data[key]);
    });

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject,
      html
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', result.messageId);
    return result;

  } catch (error) {
    console.error('Email sending error:', error);
    throw new Error('Failed to send email');
  }
};

module.exports = { sendEmail };