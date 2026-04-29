const Appointment = require('../models/appointment.model');
const Payment = require('../models/payment.model');
const Doctor = require('../models/doctor.model');
const Complaint = require('../models/complaint.model');

// Helper to count documents by status with a single query.
const countByStatus = async (Model, query, statusField, statuses) => {
  const grouped = await Model.aggregate([
    { $match: query },
    {
      $group: {
        _id: `$${statusField}`,
        count: { $sum: 1 },
      },
    },
  ]);

  const result = {};
  for (const row of grouped) {
    result[row._id] = row.count;
  }

  for (const s of statuses) {
    if (result[s] === undefined) result[s] = 0;
  }
  return result;
};

const generateReportData = async (reportType) => {
  if (reportType === 'appointments') {
    const totalAppointments = await Appointment.countDocuments({});
    const counts = await countByStatus(Appointment, {}, 'status', ['pending', 'approved', 'rejected']);
    return {
      totalAppointments,
      approvedCount: counts.approved,
      pendingCount: counts.pending,
      rejectedCount: counts.rejected,
    };
  }

  if (reportType === 'complaints') {
    const totalComplaints = await Complaint.countDocuments({});
    const counts = await countByStatus(Complaint, {}, 'status', ['open', 'in_progress', 'resolved']);
    const recentResolved = await Complaint.find({ status: 'resolved' })
      .populate('userId', 'name email')
      .sort({ updatedAt: -1 })
      .limit(10)
      .select('subject adminReply userId updatedAt');

    return {
      totalComplaints,
      openCount: counts.open,
      inProgressCount: counts.in_progress,
      resolvedCount: counts.resolved,
      recentResolved: recentResolved.map((complaint) => ({
        subject: complaint.subject,
        patientName: complaint.userId?.name || 'Unknown',
        patientEmail: complaint.userId?.email || '',
        solution: complaint.adminReply || '',
        resolvedAt: complaint.updatedAt,
      })),
    };
  }

  if (reportType === 'revenue') {
    const completedPayments = await Payment.find({ status: 'completed' }).select('amount');
    const totalCompletedPayments = completedPayments.length;
    const totalRevenue = completedPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    return {
      totalCompletedPayments,
      totalRevenue,
    };
  }

  if (reportType === 'doctor_performance') {
    // Appointments per doctor (exclude cancelled)
    const rows = await Appointment.aggregate([
      { $match: { status: { $ne: 'cancelled' } } },
      {
        $group: {
          _id: '$doctorId',
          appointmentCount: { $sum: 1 },
        },
      },
    ]);

    const doctorsById = await Doctor.find({ _id: { $in: rows.map((r) => r._id) } }).select(
      'name specialization'
    );
    const doctorMap = new Map(doctorsById.map((d) => [d._id.toString(), d]));

    return rows.map((r) => {
      const doc = doctorMap.get(r._id.toString());
      return {
        doctorId: r._id,
        doctorName: doc?.name || 'Unknown',
        specialization: doc?.specialization || '',
        appointmentCount: r.appointmentCount,
      };
    });
  }

  throw new Error('Invalid reportType');
};

module.exports = { generateReportData };

