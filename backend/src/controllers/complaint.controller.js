const Complaint = require('../models/complaint.model');
const asyncHandler = require('../utils/asyncHandler');

// ---------------- CREATE ----------------
exports.createComplaint = asyncHandler(async (req, res) => {
  const { subject, message } = req.body;

  if (!subject || !message) {
    return res.status(400).json({ message: 'Subject and message are required' });
  }

  const complaint = await Complaint.create({
    userId: req.user._id,
    subject,
    message,
    status: 'open',
  });

  res.status(201).json(complaint);
});

// ---------------- UPDATE ----------------
exports.updateComplaint = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { subject, message } = req.body;

  const complaint = await Complaint.findById(id);
  if (!complaint) return res.status(404).json({ message: 'Complaint not found' });

  const isAdmin = req.user.role === 'admin';
  const isOwner = complaint.userId.toString() === req.user._id.toString();

  if (!isAdmin && !isOwner) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  if (!isAdmin && complaint.status !== 'open') {
    return res.status(403).json({ message: 'Cannot modify complaint after processing has started' });
  }

  if (subject !== undefined) complaint.subject = subject;
  if (message !== undefined) complaint.message = message;

  await complaint.save();
  res.status(200).json(complaint);
});

// ---------------- GET ALL ----------------
exports.getComplaints = asyncHandler(async (req, res) => {
  let complaints;

  if (req.user.role === 'admin') {
    // Admin sees all complaints
    complaints = await Complaint.find()
      .populate('userId', '-password')
      .sort({ createdAt: -1 });
  } else {
    // User sees ALL their complaints (FIXED HERE)
    complaints = await Complaint.find({
      userId: req.user._id,
    })
      .populate('userId', '-password')
      .sort({ createdAt: -1 });
  }

  res.status(200).json(complaints);
});

// ---------------- GET ONE ----------------
exports.getComplaintById = asyncHandler(async (req, res) => {
  const complaint = await Complaint.findById(req.params.id).populate('userId', '-password');

  if (!complaint) {
    return res.status(404).json({ message: 'Complaint not found' });
  }

  if (
    req.user.role !== 'admin' &&
    complaint.userId._id.toString() !== req.user._id.toString()
  ) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  res.status(200).json(complaint);
});

// ---------------- UPDATE STATUS ----------------
exports.updateComplaintStatus = asyncHandler(async (req, res) => {
  const complaint = await Complaint.findById(req.params.id);

  if (!complaint) {
    return res.status(404).json({ message: 'Complaint not found' });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden' });
  }

  const { status, adminReply } = req.body;

  const allowed = ['open', 'in_progress', 'resolved'];
  if (status && !allowed.includes(status)) {
    return res.status(400).json({ message: 'Invalid status' });
  }

  complaint.status = status || complaint.status;

  if (adminReply !== undefined) {
    complaint.adminReply = adminReply;
  }

  await complaint.save();

  res.status(200).json(complaint);
});

// ---------------- DELETE ----------------
exports.deleteComplaint = asyncHandler(async (req, res) => {
  const complaint = await Complaint.findById(req.params.id);

  if (!complaint) {
    return res.status(404).json({ message: 'Complaint not found' });
  }

  const isAdmin = req.user.role === 'admin';
  const isOwner = complaint.userId.toString() === req.user._id.toString();

  if (!isAdmin && !isOwner) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  if (!isAdmin && complaint.status !== 'open') {
    return res.status(403).json({ message: 'Cannot delete complaint after processing has started' });
  }

  await complaint.deleteOne();

  res.status(200).json({ message: 'Complaint deleted successfully' });
});