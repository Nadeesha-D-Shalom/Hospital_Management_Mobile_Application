const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User = require('../models/user.model');
const generateToken = require('../utils/generateToken');
const asyncHandler = require('../utils/asyncHandler');
const { sendEmail, renderEmailTemplate } = require('../utils/email');

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
    subject: 'Verify your email - Olympus Lanka Hospital',
    text: `Dear ${name},

Thank you for registering with us.

Your Email Verification OTP is: ${otp}

This OTP is valid for 2 minutes. Please do not share this code with anyone.

Regards,  
Olympus Lanka Hospital`,
    html: renderEmailTemplate({
      title: 'Verify Your Email',
      preheader: 'Your Olympus Lanka Hospital verification code expires in 2 minutes.',
      greeting: `Dear ${name},`,
      intro: 'Thank you for registering with Olympus Lanka Hospital. Use this one-time password to verify your email address.',
      highlight: { label: 'Verification OTP', value: otp },
      note: 'This OTP is valid for 2 minutes. Please do not share this code with anyone.',
      actionText: 'After verification, you can create your password and finish registration.',
    }),
  });

  res.status(200).json({
    message: 'OTP sent to your email. Please verify your email to complete registration.',
    email: normalizedEmail,
    requiresEmailVerification: true,
  });
});

exports.verifyEmailOtp = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;
  const normalizedEmail = String(email || '').trim().toLowerCase();

  if (!normalizedEmail || !otp) {
    return res.status(400).json({ message: 'Email and OTP are required' });
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
  user.emailVerificationOtpHash = undefined;
  user.emailVerificationOtpExpiresAt = undefined;
  await user.save();

  res.status(200).json({
    message: 'Email verified successfully. Please create your password.',
    email: user.email,
    canCreatePassword: true,
  });
});

exports.completeRegistration = asyncHandler(async (req, res) => {
  const { email, password, confirmPassword } = req.body;
  const normalizedEmail = String(email || '').trim().toLowerCase();

  if (!normalizedEmail || !password || !confirmPassword) {
    return res.status(400).json({ message: 'Email, password, and confirm password are required' });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ message: 'Passwords do not match' });
  }

  if (String(password).length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters' });
  }

  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  if (!user.emailVerified) {
    return res.status(403).json({ message: 'Please verify your email before creating a password' });
  }

  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(password, salt);
  await user.save();

  const token = generateToken(user._id);

  res.status(200).json({
    message: 'Account created successfully.',
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

  if (!user.password) {
    return res.status(401).json({ message: 'Password is not set for this account' });
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
  subject: 'Password reset OTP - Olympus Lanka Hospital',
  text: `Dear User,

We received a request to reset your password.

Your One-Time Password (OTP) is: ${otp}

This OTP is valid for 2 minutes. Please do not share this code with anyone.

If you did not request this, please ignore this email.

Regards,  
Olympus Lanka Hospital`,
  html: renderEmailTemplate({
    title: 'Password Reset Request',
    preheader: 'Your password reset OTP expires in 2 minutes.',
    greeting: 'Dear User,',
    intro: 'We received a request to reset your password. Use this one-time password to continue.',
    highlight: { label: 'Reset OTP', value: otp },
    note: 'This OTP is valid for 2 minutes. If you did not request this, you can safely ignore this email.',
  }),
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
