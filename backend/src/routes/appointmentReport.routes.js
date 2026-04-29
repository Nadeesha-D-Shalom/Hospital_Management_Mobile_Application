const express = require('express');
const {
  createReport,
  getReportsByAppointment,
  getReportById,
  updateReport,
  deleteReport,
} = require('../controllers/appointmentReport.controller');
const authMiddleware = require('../middleware/auth.middleware');

const router = express.Router();

router.use(authMiddleware);

router.post('/', createReport);
router.get('/appointment/:appointmentId', getReportsByAppointment);
router.get('/:id', getReportById);
router.put('/:id', updateReport);
router.delete('/:id', deleteReport);

module.exports = router;
