jest.mock('../models/appointment.model', () => ({
  countDocuments: jest.fn(),
  aggregate: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
}));

jest.mock('../models/payment.model', () => ({
  find: jest.fn(),
}));

jest.mock('../models/doctor.model', () => ({
  find: jest.fn(),
}));

jest.mock('../models/complaint.model', () => ({
  countDocuments: jest.fn(),
  aggregate: jest.fn(),
  find: jest.fn(),
}));

const Appointment = require('../models/appointment.model');
const Payment = require('../models/payment.model');
const Doctor = require('../models/doctor.model');
const Complaint = require('../models/complaint.model');
const { generateReportData } = require('../services/report.service');

describe('report.service generateReportData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('generates appointments report with status counts', async () => {
    Appointment.countDocuments.mockResolvedValue(10);
    Appointment.aggregate.mockResolvedValue([
      { _id: 'approved', count: 3 },
      { _id: 'pending', count: 5 },
      // rejected intentionally missing to ensure default 0
    ]);

    const result = await generateReportData('appointments');
    expect(result).toEqual({
      totalAppointments: 10,
      approvedCount: 3,
      pendingCount: 5,
      rejectedCount: 0,
    });
  });

  it('generates revenue report totalCompletedPayments and totalRevenue', async () => {
    Payment.find.mockReturnValue({
      select: jest.fn().mockResolvedValue([{ amount: 100 }, { amount: 50 }, { amount: 'abc' }]),
    });

    const result = await generateReportData('revenue');
    expect(result.totalCompletedPayments).toBe(3);
    expect(result.totalRevenue).toBe(150);
  });

  it('generates doctor_performance report (appointments per doctor)', async () => {
    const doctorId1 = 'd1';
    const doctorId2 = 'd2';

    Appointment.aggregate.mockResolvedValue([
      { _id: doctorId1, appointmentCount: 2 },
      { _id: doctorId2, appointmentCount: 1 },
    ]);

    Doctor.find.mockResolvedValue([
      { _id: doctorId1, name: 'Doc One', specialization: 'Cardiology' },
      { _id: doctorId2, name: 'Doc Two', specialization: 'Orthopedics' },
    ]);

    // report.service calls Doctor.find(...).select(...)
    Doctor.find.mockReturnValue({
      select: jest.fn().mockResolvedValue([
        { _id: doctorId1, name: 'Doc One', specialization: 'Cardiology' },
        { _id: doctorId2, name: 'Doc Two', specialization: 'Orthopedics' },
      ]),
    });

    const result = await generateReportData('doctor_performance');
    expect(result).toEqual([
      {
        doctorId: doctorId1,
        doctorName: 'Doc One',
        specialization: 'Cardiology',
        appointmentCount: 2,
      },
      {
        doctorId: doctorId2,
        doctorName: 'Doc Two',
        specialization: 'Orthopedics',
        appointmentCount: 1,
      },
    ]);
  });

  it('generates complaints report with status counts and recent solutions', async () => {
    Complaint.countDocuments.mockResolvedValue(6);
    Complaint.aggregate.mockResolvedValue([
      { _id: 'open', count: 2 },
      { _id: 'resolved', count: 3 },
    ]);
    Complaint.find.mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      select: jest.fn().mockResolvedValue([
        {
          subject: 'Billing issue',
          adminReply: 'Refund processed',
          userId: { name: 'Patient One', email: 'patient@example.com' },
          updatedAt: new Date('2026-04-29T10:00:00Z'),
        },
      ]),
    });

    const result = await generateReportData('complaints');
    expect(result.totalComplaints).toBe(6);
    expect(result.openCount).toBe(2);
    expect(result.inProgressCount).toBe(0);
    expect(result.resolvedCount).toBe(3);
    expect(result.recentResolved[0]).toMatchObject({
      subject: 'Billing issue',
      patientName: 'Patient One',
      patientEmail: 'patient@example.com',
      solution: 'Refund processed',
    });
  });
});

