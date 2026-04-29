const Appointment = require('../models/appointment.model');
const Doctor = require('../models/doctor.model');
const Service = require('../models/service.model');
const AppointmentReport = require('../models/appointmentReport.model');
const asyncHandler = require('../utils/asyncHandler');
const { sendEmail, renderEmailTemplate } = require('../utils/email');

const getDayRangeUTC = (dateValue) => {
  const d = new Date(dateValue);
  const start = new Date(d);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(d);
  end.setUTCHours(23, 59, 59, 999);
  return { start, end };
};

const isValidTime = (t) => /^\d{2}:\d{2}$/.test(String(t));

const timeToMinutes = (time) => {
  const [hours, minutes] = String(time).split(':').map(Number);
  return hours * 60 + minutes;
};

const rangesOverlap = (startA, durationA, startB, durationB) => {
  const endA = startA + durationA;
  const endB = startB + durationB;
  return startA < endB && startB < endA;
};

const findOverlappingAppointment = async ({
  doctorId,
  appointmentDate,
  appointmentTime,
  duration,
  excludeAppointmentId,
}) => {
  const { start, end } = getDayRangeUTC(appointmentDate);
  const existingAppointments = await Appointment.find({
    doctorId,
    appointmentDate: { $gte: start, $lte: end },
    status: { $nin: ['cancelled', 'rejected'] },
    ...(excludeAppointmentId ? { _id: { $ne: excludeAppointmentId } } : {}),
  }).populate('serviceId');

  const requestedStart = timeToMinutes(appointmentTime);
  return existingAppointments.find((existing) =>
    rangesOverlap(
      requestedStart,
      Number(duration) || 30,
      timeToMinutes(existing.appointmentTime),
      Number(existing.serviceId?.duration) || 30
    )
  );
};

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
    return res.status(400).json({ message: 'Doctor, service, date, and time are required' });
  }

  if (!isValidTime(appointmentTime)) {
    return res.status(400).json({ message: 'appointmentTime must be in HH:MM format' });
  }

  const doctor = await Doctor.findById(doctorId);
  if (!doctor) return res.status(404).json({ message: 'Doctor not found' });
  if (!doctor.availabilityStatus) {
    return res.status(400).json({ message: 'Selected doctor is not available' });
  }

  const service = await Service.findById(serviceId);
  if (!service) return res.status(404).json({ message: 'Service not found' });
  if (!service.availabilityStatus) {
    return res.status(400).json({ message: 'Selected service is not available' });
  }

  const existingAppointment = await findOverlappingAppointment({
    doctorId,
    appointmentDate,
    appointmentTime,
    duration: service.duration,
  });

  if (existingAppointment) {
    return res.status(409).json({ message: 'Selected time overlaps with another appointment for this doctor' });
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

  res.status(201).json(appointment);
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

exports.getAppointmentAvailability = asyncHandler(async (req, res) => {
  const { doctorId, date } = req.query;

  if (!doctorId || !date) {
    return res.status(400).json({ message: 'doctorId and date are required' });
  }

  const { start, end } = getDayRangeUTC(date);
  const appointments = await Appointment.find({
    doctorId,
    appointmentDate: { $gte: start, $lte: end },
    status: { $in: ['pending', 'approved'] },
  })
    .populate('serviceId', 'serviceName duration')
    .select('appointmentTime status serviceId');

  res.status(200).json(
    appointments.map((appointment) => ({
      _id: appointment._id,
      appointmentTime: appointment.appointmentTime,
      status: appointment.status,
      duration: Number(appointment.serviceId?.duration) || 30,
      serviceName: appointment.serviceId?.serviceName || '',
    }))
  );
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

  if (doctorId !== undefined || serviceId !== undefined || appointmentDate !== undefined || appointmentTime !== undefined) {
    const serviceForDuration = await Service.findById(appointment.serviceId);
    if (!serviceForDuration) {
      return res.status(404).json({ message: 'Service not found' });
    }

    const overlapping = await findOverlappingAppointment({
      doctorId: appointment.doctorId,
      appointmentDate: appointment.appointmentDate,
      appointmentTime: appointment.appointmentTime,
      duration: serviceForDuration.duration,
      excludeAppointmentId: appointment._id,
    });

    if (overlapping) {
      return res.status(409).json({ message: 'Selected time overlaps with another appointment for this doctor' });
    }
  }

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

  if (status === 'approved' && updated?.userId?.email) {
    try {
      const amount = updated?.serviceId?.price ?? 0;
      const dateStr = new Date(updated.appointmentDate).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });
      const method = updated.paymentMethod === 'card' ? 'Card (facility available soon - pay at hospital)' : 'Cash';
      await sendEmail({
        to: updated.userId.email,
        subject: 'Appointment Confirmed - Olympus Lanka Hospital',
        text:
          `Hello ${updated.userId.name},\n\n` +
          `Your appointment has been approved.\n` +
          `Doctor: ${updated?.doctorId?.name || 'N/A'}\n` +
          `Service: ${updated?.serviceId?.serviceName || 'N/A'}\n` +
          `Date & Time: ${dateStr} at ${updated.appointmentTime}\n` +
          `Amount to pay: LKR ${amount}\n` +
          `Payment method: ${method}\n\n` +
          `Thank you,\nOlympus Lanka Hospital`,
        html: renderEmailTemplate({
          title: 'Appointment Confirmed',
          preheader: `Your appointment is approved for ${dateStr} at ${updated.appointmentTime}.`,
          greeting: `Hello ${updated.userId.name},`,
          intro: 'Your appointment has been approved. Please review the confirmed appointment details below.',
          details: [
            { label: 'Doctor', value: updated?.doctorId?.name || 'N/A' },
            { label: 'Service', value: updated?.serviceId?.serviceName || 'N/A' },
            { label: 'Date', value: dateStr },
            { label: 'Time', value: updated.appointmentTime },
            { label: 'Amount to pay', value: `LKR ${amount}` },
            { label: 'Payment method', value: method },
          ],
          note: 'Please arrive a few minutes early and bring any relevant medical documents.',
          actionText: 'Thank you for choosing Olympus Lanka Hospital.',
        }),
      });
    } catch (e) {
      console.error('Failed to send appointment approval email:', e?.message || e);
    }
  }

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

  await AppointmentReport.deleteMany({ appointmentId: appointment._id });
  await appointment.deleteOne();

  res.status(200).json({ message: 'Appointment deleted successfully' });
});
