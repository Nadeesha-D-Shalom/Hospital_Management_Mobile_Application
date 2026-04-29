const Appointment = require('../models/appointment.model');
const Doctor = require('../models/doctor.model');
const Service = require('../models/service.model');
const asyncHandler = require('../utils/asyncHandler');
const { sendEmail } = require('../utils/email');

const getDayRangeUTC = (dateValue) => {
  const d = new Date(dateValue);
  const start = new Date(d);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(d);
  end.setUTCHours(23, 59, 59, 999);
  return { start, end };
};

const isValidTime = (t) => /^\d{2}:\d{2}$/.test(String(t));

exports.createAppointment = asyncHandler(async (req, res) => {
  const { doctorId, serviceId, appointmentDate, appointmentTime, notes, paymentMethod } = req.body;

  if (!doctorId || !serviceId || !appointmentDate || !appointmentTime) {
    return res.status(400).json({ message: 'Doctor, service, date, and time are required' });
  }

  if (paymentMethod !== undefined) {
    const allowedPaymentMethods = ['cash', 'card'];
    if (!allowedPaymentMethods.includes(paymentMethod)) {
      return res.status(400).json({ message: 'paymentMethod must be either cash or card' });
    }
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

  const { start, end } = getDayRangeUTC(appointmentDate);
  const existingAppointment = await Appointment.findOne({
    doctorId,
    appointmentDate: { $gte: start, $lte: end },
    appointmentTime,
    status: { $nin: ['cancelled', 'rejected'] },
  });

  if (existingAppointment) {
    return res.status(409).json({ message: 'Selected slot is already booked for this doctor' });
  }

  const appointment = await Appointment.create({
    userId: req.user._id,
    doctorId,
    serviceId,
    appointmentDate: new Date(appointmentDate),
    appointmentTime,
    notes,
    paymentMethod: paymentMethod || 'cash',
  });

  res.status(201).json(appointment);
});

exports.getAppointments = asyncHandler(async (req, res) => {
  // Patients should only see appointments after admin approval.
  const filter = req.user.role === 'admin' ? {} : { userId: req.user._id, status: 'approved' };
  const appointments = await Appointment.find(filter)
    .populate('doctorId')
    .populate('serviceId')
    .populate('userId', '-password');
  res.status(200).json(appointments);
});

exports.getAppointmentById = asyncHandler(async (req, res) => {
  const appointment = await Appointment.findById(req.params.id)
    .populate('doctorId')
    .populate('serviceId')
    .populate('userId', '-password');

  if (!appointment) {
    return res.status(404).json({ message: 'Appointment not found' });
  }

  if (req.user.role !== 'admin' && appointment.userId._id.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  if (req.user.role !== 'admin' && appointment.status !== 'approved') {
    return res.status(404).json({ message: 'Appointment not found' });
  }

  res.status(200).json(appointment);
});

exports.updateAppointment = asyncHandler(async (req, res) => {
  const appointment = await Appointment.findById(req.params.id);
  if (!appointment) {
    return res.status(404).json({ message: 'Appointment not found' });
  }

  if (req.user.role !== 'admin' && appointment.userId.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  const updates = {};
  if (req.body.doctorId !== undefined) updates.doctorId = req.body.doctorId;
  if (req.body.serviceId !== undefined) updates.serviceId = req.body.serviceId;
  if (req.body.appointmentDate !== undefined) updates.appointmentDate = req.body.appointmentDate;
  if (req.body.appointmentTime !== undefined) updates.appointmentTime = req.body.appointmentTime;
  if (req.body.notes !== undefined) updates.notes = req.body.notes;

  if (updates.appointmentTime !== undefined && !isValidTime(updates.appointmentTime)) {
    return res.status(400).json({ message: 'appointmentTime must be in HH:MM format' });
  }

  const effectiveDoctorId = updates.doctorId || appointment.doctorId;
  const effectiveServiceId = updates.serviceId || appointment.serviceId;

  const doctor = await Doctor.findById(effectiveDoctorId);
  if (!doctor) return res.status(404).json({ message: 'Doctor not found' });
  if (!doctor.availabilityStatus) {
    return res.status(400).json({ message: 'Selected doctor is not available' });
  }

  const service = await Service.findById(effectiveServiceId);
  if (!service) return res.status(404).json({ message: 'Service not found' });
  if (!service.availabilityStatus) {
    return res.status(400).json({ message: 'Selected service is not available' });
  }

  const doctorChanged = updates.doctorId !== undefined;
  const dateChanged = updates.appointmentDate !== undefined;
  const timeChanged = updates.appointmentTime !== undefined;

  if (doctorChanged || dateChanged || timeChanged) {
    const checkDoctor = effectiveDoctorId;
    const checkDate = updates.appointmentDate || appointment.appointmentDate;
    const checkTime = updates.appointmentTime || appointment.appointmentTime;

    const { start, end } = getDayRangeUTC(checkDate);
    const conflict = await Appointment.findOne({
      _id: { $ne: appointment._id },
      doctorId: checkDoctor,
      appointmentDate: { $gte: start, $lte: end },
      appointmentTime: checkTime,
      status: { $nin: ['cancelled', 'rejected'] },
    });

    if (conflict) return res.status(409).json({ message: 'Selected slot is already booked' });
  }

  Object.assign(appointment, updates);
  if (updates.appointmentDate !== undefined) {
    appointment.appointmentDate = new Date(updates.appointmentDate);
  }
  await appointment.save();

  res.status(200).json(appointment);
});

exports.deleteAppointment = asyncHandler(async (req, res) => {
  const appointment = await Appointment.findById(req.params.id);
  if (!appointment) {
    return res.status(404).json({ message: 'Appointment not found' });
  }

  if (req.user.role !== 'admin' && appointment.userId.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  await appointment.remove();
  res.status(200).json({ message: 'Appointment deleted successfully' });
});

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
  if (!status || !allowed.includes(status)) {
    return res.status(400).json({ message: 'Valid status is required' });
  }

  appointment.status = status;
  await appointment.save();

  if (status === 'approved') {
    try {
      const populated = await Appointment.findById(appointment._id)
        .populate('userId', '-password')
        .populate('doctorId')
        .populate('serviceId');

      const user = populated?.userId;
      const doctor = populated?.doctorId;
      const service = populated?.serviceId;

      const amountToPay = service?.price ?? 0;
      const paymentMethodText = populated?.paymentMethod === 'card' ? 'Card (pay at hospital)' : 'Cash';

      if (user?.email) {
        const dateStr = populated.appointmentDate
          ? new Date(populated.appointmentDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
          : '';

        const timeStr = populated.appointmentTime || '';

        await sendEmail({
          to: user.email,
          subject: 'Appointment Confirmed - Olympus Lanka Hospital',
          text:
            `Hello ${user.name},\n\n` +
            `Your appointment has been approved.\n\n` +
            `Your details:\n` +
            `- Name: ${user.name}\n` +
            `- Email: ${user.email}\n` +
            (user.phone ? `- Phone: ${user.phone}\n` : '') +
            (user.address ? `- Address: ${user.address}\n` : '') +
            `\n` +
            `Doctor: ${doctor?.name || 'N/A'} (${doctor?.specialization || ''})\n` +
            `Service: ${service?.serviceName || 'N/A'}\n` +
            `Date & Time: ${dateStr} at ${timeStr}\n` +
            `Amount to pay: LKR ${amountToPay}\n` +
            `Payment method: ${paymentMethodText}\n\n` +
            `Thank you,\nOlympus Lanka Hospital`,
          html:
            `<p>Hello <b>${user.name}</b>,</p>` +
            `<p>Your appointment has been approved.</p>` +
            `<p><b>Your details:</b></p>` +
            `<ul>` +
            `<li><b>Name:</b> ${user.name}</li>` +
            `<li><b>Email:</b> ${user.email}</li>` +
            (user.phone ? `<li><b>Phone:</b> ${user.phone}</li>` : '') +
            (user.address ? `<li><b>Address:</b> ${user.address}</li>` : '') +
            `</ul>` +
            `<ul>` +
            `<li><b>Doctor:</b> ${doctor?.name || 'N/A'} (${doctor?.specialization || ''})</li>` +
            `<li><b>Service:</b> ${service?.serviceName || 'N/A'}</li>` +
            `<li><b>Date & Time:</b> ${dateStr} at ${timeStr}</li>` +
            `<li><b>Amount to pay:</b> LKR ${amountToPay}</li>` +
            `<li><b>Payment method:</b> ${paymentMethodText}</li>` +
            `</ul>` +
            `<p>Thank you,<br/>Olympus Lanka Hospital</p>` +
            (populated?.paymentMethod === 'card'
              ? `<p style="color:#b45309"><b>Note:</b> Card payment facility will be available soon. Please make payment when you visit the hospital.</p>`
              : ''),
        });
      }
    } catch (e) {
      // Don't block appointment status change if email fails.
      console.error('Failed to send appointment approval email:', e?.message || e);
    }
  }

  res.status(200).json(appointment);
});
