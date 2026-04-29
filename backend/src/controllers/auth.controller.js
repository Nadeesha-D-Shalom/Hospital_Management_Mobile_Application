const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User = require('../models/user.model');
const generateToken = require('../utils/generateToken');
const asyncHandler = require('../utils/asyncHandler');
const { sendEmail } = require('../utils/email');

exports.registerUser = asyncHandler(async (req, res) => {
  const { name, email } = req.body;
  const normalizedEmail = String(email || '').trim().toLowerCase();

  if (!name || !normalizedEmail) {
    return res.status(400).json({ message: 'Name and email are required' });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(normalizedEmail)) {
    return res.status(400).json({ message: 'Please enter a valid email address' });
  }

  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser && existingUser.emailVerified) {
    return res.status(400).json({ message: 'Email is already registered' });
  }

  // Generate and send email verification OTP
  const otp = String(crypto.randomInt(100000, 1000000));
  const hashedOtp = await bcrypt.hash(otp, 10);

  let user = existingUser;
  if (!user) {
    let role = 'patient';
    if (req.body.role && ['patient', 'doctor', 'admin'].includes(req.body.role)) {
      role = req.body.role;
    } else {
      const adminExists = await User.exists({ role: 'admin', emailVerified: true });
      if (!adminExists) role = 'admin';
    }

    user = await User.create({
      name,
      email: normalizedEmail,
      role,
      emailVerified: false,
      emailVerificationOtpHash: hashedOtp,
      emailVerificationOtpExpiresAt: new Date(Date.now() + 2 * 60 * 1000),
    });
  } else {
    // Update existing unverified user
    user.name = name;
    user.emailVerificationOtpHash = hashedOtp;
    user.emailVerificationOtpExpiresAt = new Date(Date.now() + 2 * 60 * 1000);
    await user.save();
  }

  // Send OTP email
  await sendEmail({
    to: normalizedEmail,
    subject: 'Email Verification OTP - Hospital App',
    text: `Dear ${name},

Thank you for registering with us.

Your Email Verification OTP is: ${otp}

This OTP is valid for 2 minutes. Please do not share this code with anyone.

Regards,  
Hospital App Team`,
    
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2 style="color: #2c3e50;">Email Verification</h2>
        
        <p>Dear ${name},</p>
        
        <p>Thank you for registering with us.</p>
        
        <p>
          Your Email Verification OTP is:
          <strong style="font-size: 18px; color: #e74c3c;">${otp}</strong>
        </p>
        
        <p>This OTP is valid for <strong>2 minutes</strong>. Please do not share this code with anyone.</p>
        
        <br/>
        
        <p>Regards,<br/><strong>Hospital App Team</strong></p>
      </div>
    `,
  });

  res.status(200).json({
    message: 'OTP sent to your email. Please verify your email to complete registration.',
    email: normalizedEmail,
    requiresEmailVerification: true,
  });
});

exports.verifyEmailOtp = asyncHandler(async (req, res) => {
  const { email, otp, password, confirmPassword } = req.body;
  const normalizedEmail = String(email || '').trim().toLowerCase();

  if (!normalizedEmail || !otp || !password) {
    return res.status(400).json({ message: 'Email, OTP, and password are required' });
  }

  if (confirmPassword !== undefined && password !== confirmPassword) {
    return res.status(400).json({ message: 'Passwords do not match' });
  }

  if (String(password).length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters' });
  }

  const user = await User.findOne({ email: normalizedEmail });
  if (!user || !user.emailVerificationOtpHash || !user.emailVerificationOtpExpiresAt) {
    return res.status(400).json({ message: 'No active OTP found. Please request a new registration.' });
  }

  if (user.emailVerificationOtpExpiresAt.getTime() < Date.now()) {
    user.emailVerificationOtpHash = undefined;
    user.emailVerificationOtpExpiresAt = undefined;
    await user.save();
    return res.status(400).json({ message: 'OTP expired. Please register again.' });
  }

  const isOtpValid = await bcrypt.compare(String(otp), user.emailVerificationOtpHash);
  if (!isOtpValid) {
    return res.status(400).json({ message: 'Invalid OTP' });
  }

  user.emailVerified = true;
  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(password, salt);
  user.emailVerificationOtpHash = undefined;
  user.emailVerificationOtpExpiresAt = undefined;
  await user.save();

  const token = generateToken(user._id);

  res.status(200).json({
    message: 'Email verified successfully. Account created.',
    token,
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone,
    address: user.address,
    profileImage: user.profileImage,
  });
});

exports.loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const normalizedEmail = String(email || '').trim().toLowerCase();

  if (!normalizedEmail || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  if (!user.emailVerified) {
    return res.status(403).json({ message: 'Please verify your email before logging in' });
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const token = generateToken(user._id);

  res.status(200).json({
    token,
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone,
    address: user.address,
    profileImage: user.profileImage,
  });
});

exports.getMe = asyncHandler(async (req, res) => {
  const user = req.user;
  res.status(200).json(user);
});

exports.requestPasswordResetOtp = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const normalizedEmail = String(email || '').trim().toLowerCase();

  if (!normalizedEmail) {
    return res.status(400).json({ message: 'Email is required' });
  }

  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  const otp = String(crypto.randomInt(100000, 1000000));
  const hashedOtp = await bcrypt.hash(otp, 10);

  user.resetPasswordOtpHash = hashedOtp;
  user.resetPasswordOtpExpiresAt = new Date(Date.now() + 2 * 60 * 1000);
  user.resetPasswordOtpVerified = false;
  await user.save();


await sendEmail({
  to: user.email,
  subject: 'Password Reset OTP - Hospital App',
  text: `Dear User,

We received a request to reset your password.

Your One-Time Password (OTP) is: ${otp}

This OTP is valid for 2 minutes. Please do not share this code with anyone.

If you did not request this, please ignore this email.

Regards,  
Hospital App Team`,
  
  html: `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2 style="color: #2c3e50;">Password Reset Request</h2>
      
      <p>Dear User,</p>
      
      <p>We received a request to reset your password.</p>
      
      <p>
        Your One-Time Password (OTP) is:
        <strong style="font-size: 18px; color: #e74c3c;">${otp}</strong>
      </p>
      
      <p>This OTP is valid for <strong>2 minutes</strong>. Please do not share this code with anyone.</p>
      
      <p>If you did not request this, please ignore this email.</p>
      
      <br/>
      
      <p>Regards,<br/><strong>Hospital App Team</strong></p>
    </div>
  `,
});

  res.status(200).json({
    message: 'OTP sent to email. OTP is valid for 2 minutes.',
  });
});

exports.verifyPasswordResetOtp = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;
  const normalizedEmail = String(email || '').trim().toLowerCase();

  if (!normalizedEmail || !otp) {
    return res.status(400).json({ message: 'Email and OTP are required' });
  }

  const user = await User.findOne({ email: normalizedEmail });
  if (!user || !user.resetPasswordOtpHash || !user.resetPasswordOtpExpiresAt) {
    return res.status(400).json({ message: 'No active OTP found. Please request a new OTP.' });
  }

  if (user.resetPasswordOtpExpiresAt.getTime() < Date.now()) {
    user.resetPasswordOtpHash = undefined;
    user.resetPasswordOtpExpiresAt = undefined;
    user.resetPasswordOtpVerified = false;
    await user.save();
    return res.status(400).json({ message: 'OTP expired. Please request a new OTP.' });
  }

  const isOtpValid = await bcrypt.compare(String(otp), user.resetPasswordOtpHash);
  if (!isOtpValid) {
    return res.status(400).json({ message: 'Invalid OTP' });
  }

  user.resetPasswordOtpVerified = true;
  await user.save();

  res.status(200).json({ message: 'OTP verified successfully' });
});

exports.resetPasswordWithOtp = asyncHandler(async (req, res) => {
  const { email, newPassword, confirmPassword } = req.body;
  const normalizedEmail = String(email || '').trim().toLowerCase();

  if (!normalizedEmail || !newPassword || !confirmPassword) {
    return res.status(400).json({ message: 'Email, newPassword, and confirmPassword are required' });
  }

  if (newPassword !== confirmPassword) {
    return res.status(400).json({ message: 'Passwords do not match' });
  }

  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  if (!user.resetPasswordOtpVerified || !user.resetPasswordOtpExpiresAt) {
    return res.status(400).json({ message: 'OTP is not verified. Please verify OTP first.' });
  }

  if (user.resetPasswordOtpExpiresAt.getTime() < Date.now()) {
    user.resetPasswordOtpHash = undefined;
    user.resetPasswordOtpExpiresAt = undefined;
    user.resetPasswordOtpVerified = false;
    await user.save();
    return res.status(400).json({ message: 'OTP expired. Please request and verify a new OTP.' });
  }

  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(newPassword, salt);
  user.resetPasswordOtpHash = undefined;
  user.resetPasswordOtpExpiresAt = undefined;
  user.resetPasswordOtpVerified = false;
  await user.save();

  res.status(200).json({ message: 'Password reset successful. You can now log in with the new password.' });
});
