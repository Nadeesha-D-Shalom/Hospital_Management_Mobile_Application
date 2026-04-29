const asyncHandler = require('../utils/asyncHandler');

const Doctor = require('../models/doctor.model');

const getOriginFromBaseUrl = () => {
  const base = process.env.BASE_URL || 'http://localhost:5000/api';
  // BASE_URL is expected to end with "/api" (example: http://host:port/api)
  return base.replace(/\/api\/?$/, '');
};

exports.uploadDoctorImage = asyncHandler(async (req, res) => {
  const { doctorId } = req.body;

  if (!doctorId) {
    return res.status(400).json({ message: 'doctorId is required' });
  }

  if (!req.file) {
    return res.status(400).json({ message: 'doctorImage file is required' });
  }

  const doctor = await Doctor.findById(doctorId);
  if (!doctor) return res.status(404).json({ message: 'Doctor not found' });

  const origin = getOriginFromBaseUrl();
  const imageUrl = `${origin}/uploads/doctor-images/${req.file.filename}`;

  doctor.image = imageUrl;
  await doctor.save();

  res.status(200).json({ imageUrl, doctor });
});

exports.uploadAppointmentReportFile = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'reportFile is required' });
  }

  const origin = getOriginFromBaseUrl();
  const fileUrl = `${origin}/uploads/appointment-reports/${req.file.filename}`;
  const fileType = req.file.mimetype === 'application/pdf' ? 'pdf' : 'image';

  res.status(200).json({
    fileUrl,
    fileName: req.file.originalname,
    fileType,
  });
});

