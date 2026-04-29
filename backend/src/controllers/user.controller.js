const User = require('../models/user.model');
const bcrypt = require('bcryptjs');
const Appointment = require('../models/appointment.model');
const Complaint = require('../models/complaint.model');
const Payment = require('../models/payment.model');
const Report = require('../models/report.model');
const asyncHandler = require('../utils/asyncHandler');

exports.getUsers = asyncHandler(async (req, res) => {
  const users = await User.find().select('-password');
  res.status(200).json(users);
});

exports.getUserById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (req.user.role !== 'admin' && req.user._id.toString() !== id) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  const user = await User.findById(id).select('-password');
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  res.status(200).json(user);
});

exports.updateUser = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (req.user.role !== 'admin' && req.user._id.toString() !== id) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  const updates = {
    name: req.body.name,
    email: req.body.email,
    phone: req.body.phone,
    address: req.body.address,
    profileImage: req.body.profileImage,
  };

  const user = await User.findByIdAndUpdate(id, updates, { new: true }).select('-password');
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  res.status(200).json(user);
});

exports.deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden' });
  }

  const user = await User.findById(id);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  await user.remove();
  res.status(200).json({ message: 'User deleted successfully' });
});

exports.deleteMyAccount = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { password, otp } = req.body || {};

  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  let allowed = false;

  if (password) {
    const isPasswordMatch = await bcrypt.compare(String(password), user.password);
    if (!isPasswordMatch) {
      return res.status(400).json({ message: 'Invalid password' });
    }
    allowed = true;
  } else if (otp) {
    if (!user.resetPasswordOtpHash || !user.resetPasswordOtpExpiresAt) {
      return res.status(400).json({ message: 'No active OTP found. Request OTP first.' });
    }

    if (user.resetPasswordOtpExpiresAt.getTime() < Date.now()) {
      user.resetPasswordOtpHash = undefined;
      user.resetPasswordOtpExpiresAt = undefined;
      user.resetPasswordOtpVerified = false;
      await user.save();
      return res.status(400).json({ message: 'OTP expired. Request a new OTP.' });
    }

    const isOtpValid = await bcrypt.compare(String(otp), user.resetPasswordOtpHash);
    if (!isOtpValid) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }
    allowed = true;
  } else {
    return res.status(400).json({ message: 'Provide password or OTP to delete account' });
  }

  if (!allowed) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  await Promise.all([
    Appointment.deleteMany({ userId }),
    Complaint.deleteMany({ userId }),
    Payment.deleteMany({ userId }),
    Report.deleteMany({ generatedBy: userId }),
  ]);

  await user.remove();

  res.status(200).json({ message: 'Your account has been deleted successfully' });
});
