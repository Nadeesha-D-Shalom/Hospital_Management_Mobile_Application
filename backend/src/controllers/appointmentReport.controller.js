const AppointmentReport = require('../models/appointmentReport.model');
const Appointment = require('../models/appointment.model');
const asyncHandler = require('../utils/asyncHandler');

// Create report for appointment
exports.createReport = asyncHandler(async (req, res) => {
  const { appointmentId, reportType, description, fileUrl, fileName, fileType } = req.body;

  if (!appointmentId || !reportType || !description) {
    return res.status(400).json({ message: 'Appointment ID, report type, and description are required' });
  }

  const appointment = await Appointment.findById(appointmentId);
  if (!appointment) {
    return res.status(404).json({ message: 'Appointment not found' });
  }

  if (appointment.userId.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: 'Can only add reports to your own appointments' });
  }

  if (appointment.status !== 'pending') {
    return res.status(403).json({ message: 'Cannot add report after appointment is approved/rejected' });
  }

  const report = await AppointmentReport.create({
    appointmentId,
    userId: req.user._id,
    reportType,
    description,
    fileUrl,
    fileName,
    fileType,
  });

  res.status(201).json(report);
});

// Get all reports for an appointment
exports.getReportsByAppointment = asyncHandler(async (req, res) => {
  const { appointmentId } = req.params;

  const appointment = await Appointment.findById(appointmentId);
  if (!appointment) {
    return res.status(404).json({ message: 'Appointment not found' });
  }

  const isAdmin = req.user.role === 'admin';
  const isOwner = appointment.userId.toString() === req.user._id.toString();

  if (!isAdmin && !isOwner) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  const reports = await AppointmentReport.find({ appointmentId })
    .populate('userId', '-password');

  res.status(200).json(reports);
});

// Get single report
exports.getReportById = asyncHandler(async (req, res) => {
  const report = await AppointmentReport.findById(req.params.id)
    .populate('userId', '-password');

  if (!report) {
    return res.status(404).json({ message: 'Report not found' });
  }

  const appointment = await Appointment.findById(report.appointmentId);
  const isAdmin = req.user.role === 'admin';
  const isOwner = appointment.userId.toString() === req.user._id.toString();

  if (!isAdmin && !isOwner) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  res.status(200).json(report);
});

// Update report (only before appointment is approved)
exports.updateReport = asyncHandler(async (req, res) => {
  const report = await AppointmentReport.findById(req.params.id);
  if (!report) {
    return res.status(404).json({ message: 'Report not found' });
  }

  const appointment = await Appointment.findById(report.appointmentId);
  if (appointment.status !== 'pending') {
    return res.status(403).json({ message: 'Cannot edit report after appointment is approved/rejected' });
  }

  if (report.userId.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: 'Can only edit your own reports' });
  }

  const { reportType, description, fileUrl, fileName, fileType } = req.body;

  if (reportType !== undefined) report.reportType = reportType;
  if (description !== undefined) report.description = description;
  if (fileUrl !== undefined) report.fileUrl = fileUrl;
  if (fileName !== undefined) report.fileName = fileName;
  if (fileType !== undefined) report.fileType = fileType;

  await report.save();
  res.status(200).json(report);
});

// Delete report
exports.deleteReport = asyncHandler(async (req, res) => {
  const report = await AppointmentReport.findById(req.params.id);
  if (!report) {
    return res.status(404).json({ message: 'Report not found' });
  }

  const isAdmin = req.user.role === 'admin';
  const isOwner = report.userId.toString() === req.user._id.toString();

  if (!isAdmin && !isOwner) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  const appointment = await Appointment.findById(report.appointmentId);
  if (!isAdmin && appointment.status !== 'pending') {
    return res.status(403).json({ message: 'Cannot delete report after appointment is approved' });
  }

  await report.deleteOne();
  res.status(200).json({ message: 'Report deleted successfully' });
});
