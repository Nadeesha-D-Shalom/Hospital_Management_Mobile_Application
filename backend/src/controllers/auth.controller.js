const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User = require('../models/user.model');
const generateToken = require('../utils/generateToken');
const asyncHandler = require('../utils/asyncHandler');
const { sendEmail } = require('../utils/email');

exports.registerUser = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email, and password are required' });
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).json({ message: 'Email is already registered' });
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  let role = 'patient';
  if (req.body.role && ['patient', 'doctor', 'admin'].includes(req.body.role)) {
    role = req.body.role;
  } else {
    // Bootstrap for academic demos: if no admin exists, create the first account as admin.
    const adminExists = await User.exists({ role: 'admin' });
    if (!adminExists) role = 'admin';
  }

  const user = await User.create({
    name,
    email,
    password: hashedPassword,
    role,
  });

  const token = generateToken(user._id);

  res.status(201).json({
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

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  const user = await User.findOne({ email });
  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials' });
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

  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }

  const user = await User.findOne({ email });
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  const otp = String(crypto.randomInt(100000, 1000000));
  const hashedOtp = await bcrypt.hash(otp, 10);

  user.resetPasswordOtpHash = hashedOtp;
  user.resetPasswordOtpExpiresAt = new Date(Date.now() + 2 * 60 * 1000); // 1 minute validity
  user.resetPasswordOtpVerified = false;
  await user.save();


await sendEmail({
  to: user.email,
  subject: 'Password Reset OTP - Hospital App',
  text: `Dear User,

We received a request to reset your password.

Your One-Time Password (OTP) is: ${otp}

This OTP is valid for 1 minute. Please do not share this code with anyone.

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
      
      <p>This OTP is valid for <strong>2 minute</strong>. Please do not share this code with anyone.</p>
      
      <p>If you did not request this, please ignore this email.</p>
      
      <br/>
      
      <p>Regards,<br/><strong>Hospital App Team</strong></p>
    </div>
  `,
});

  res.status(200).json({
    message: 'OTP sent to email. OTP is valid for 1 minute.',
  });
});

exports.verifyPasswordResetOtp = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ message: 'Email and OTP are required' });
  }

  const user = await User.findOne({ email });
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

  if (!email || !newPassword || !confirmPassword) {
    return res.status(400).json({ message: 'Email, newPassword, and confirmPassword are required' });
  }

  if (newPassword !== confirmPassword) {
    return res.status(400).json({ message: 'Passwords do not match' });
  }

  const user = await User.findOne({ email });
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
