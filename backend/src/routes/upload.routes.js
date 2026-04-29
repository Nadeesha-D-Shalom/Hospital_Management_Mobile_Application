const express = require('express');
const { doctorImageUpload, reportFileUpload } = require('../middleware/upload.middleware');
const authMiddleware = require('../middleware/auth.middleware');
const roleMiddleware = require('../middleware/role.middleware');
const { uploadDoctorImage, uploadAppointmentReportFile } = require('../controllers/upload.controller');

const router = express.Router();

router.post(
  '/doctor-image',
  authMiddleware,
  roleMiddleware('admin'),
  doctorImageUpload.single('doctorImage'),
  uploadDoctorImage
);

router.post(
  '/report-file',
  authMiddleware,
  reportFileUpload.single('reportFile'),
  uploadAppointmentReportFile
);

module.exports = router;
