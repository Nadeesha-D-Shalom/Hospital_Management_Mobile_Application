const Appointment = require('../models/appointment.model');
const asyncHandler = require('../utils/asyncHandler');

// ---------------- CREATE APPOINTMENT ----------------
exports.createAppointment = asyncHandler(async (req, res) => {
  const {
    doctorId,
    serviceId,
    appointmentDate,
    appointmentTime,
    notes,
    paymentMethod,
  } = req.body;

  if (!doctorId || !serviceId || !appointmentDate || !appointmentTime) {
    return res.status(400).json({ message: 'All required fields must be provided' });
  }

  const appointment = await Appointment.create({
    userId: req.user._id,
    doctorId,
    serviceId,
    appointmentDate,
    appointmentTime,
    notes,
    paymentMethod,
    status: 'pending',
  });

  // Populate for frontend display
  const populated = await Appointment.findById(appointment._id)
    .populate('userId', '-password')
    .populate('doctorId')
    .populate('serviceId');

  res.status(201).json(populated);
});

// ---------------- GET ALL APPOINTMENTS ----------------
exports.getAppointments = asyncHandler(async (req, res) => {
  let appointments;

  if (req.user.role === 'admin') {
    // Admin sees all
    appointments = await Appointment.find()
      .populate('userId', '-password')
      .populate('doctorId')
      .populate('serviceId')
      .sort({ createdAt: -1 });
  } else {
    // Patient sees ALL their appointments (FIXED)
    appointments = await Appointment.find({
      userId: req.user._id,
    })
      .populate('userId', '-password')
      .populate('doctorId')
      .populate('serviceId')
      .sort({ createdAt: -1 });
  }

  res.status(200).json(appointments);
});

// ---------------- GET SINGLE APPOINTMENT ----------------
exports.getAppointmentById = asyncHandler(async (req, res) => {
  const appointment = await Appointment.findById(req.params.id)
    .populate('userId', '-password')
    .populate('doctorId')
    .populate('serviceId');

  if (!appointment) {
    return res.status(404).json({ message: 'Appointment not found' });
  }

  const isAdmin = req.user.role === 'admin';
  const isOwner = appointment.userId._id.toString() === req.user._id.toString();

  if (!isAdmin && !isOwner) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  res.status(200).json(appointment);
});

// ---------------- UPDATE APPOINTMENT ----------------
exports.updateAppointment = asyncHandler(async (req, res) => {
  const appointment = await Appointment.findById(req.params.id);

  if (!appointment) {
    return res.status(404).json({ message: 'Appointment not found' });
  }

  const isAdmin = req.user.role === 'admin';
  const isOwner = appointment.userId.toString() === req.user._id.toString();

  if (!isAdmin && !isOwner) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  if (!isAdmin && appointment.status !== 'pending') {
    return res.status(403).json({ message: 'Cannot modify appointment after approval or rejection' });
  }

  const {
    doctorId,
    serviceId,
    appointmentDate,
    appointmentTime,
    notes,
    paymentMethod,
  } = req.body;

  if (doctorId !== undefined) appointment.doctorId = doctorId;
  if (serviceId !== undefined) appointment.serviceId = serviceId;
  if (appointmentDate !== undefined) appointment.appointmentDate = appointmentDate;
  if (appointmentTime !== undefined) appointment.appointmentTime = appointmentTime;
  if (notes !== undefined) appointment.notes = notes;
  if (paymentMethod !== undefined) appointment.paymentMethod = paymentMethod;

  await appointment.save();

  const updated = await Appointment.findById(appointment._id)
    .populate('doctorId')
    .populate('serviceId');

  res.status(200).json(updated);
});

// ---------------- UPDATE STATUS (ADMIN ONLY) ----------------
exports.updateAppointmentStatus = asyncHandler(async (req, res) => {
  const appointment = await Appointment.findById(req.params.id);

  if (!appointment) {
    return res.status(404).json({ message: 'Appointment not found' });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden' });
  }

  const { status } = req.body;

  const allowed = ['pending', 'approved', 'rejected', 'cancelled'];

  if (!allowed.includes(status)) {
    return res.status(400).json({ message: 'Invalid status' });
  }

  appointment.status = status;

  await appointment.save();

  const updated = await Appointment.findById(appointment._id)
    .populate('userId', '-password')
    .populate('doctorId')
    .populate('serviceId');

  res.status(200).json(updated);
});

// ---------------- DELETE ----------------
exports.deleteAppointment = asyncHandler(async (req, res) => {
  const appointment = await Appointment.findById(req.params.id);

  if (!appointment) {
    return res.status(404).json({ message: 'Appointment not found' });
  }

  const isAdmin = req.user.role === 'admin';
  const isOwner = appointment.userId.toString() === req.user._id.toString();

  if (!isAdmin && !isOwner) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  if (!isAdmin && appointment.status !== 'pending') {
    return res.status(403).json({ message: 'Cannot delete appointment after approval or rejection' });
  }

  await appointment.deleteOne();

  res.status(200).json({ message: 'Appointment deleted successfully' });
});