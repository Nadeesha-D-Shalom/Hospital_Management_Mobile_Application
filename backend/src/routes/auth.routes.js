const express = require('express');
const {
  registerUser,
  loginUser,
  getMe,
  verifyEmailOtp,
  completeRegistration,
  requestPasswordResetOtp,
  verifyPasswordResetOtp,
  resetPasswordWithOtp,
} = require('../controllers/auth.controller');
const authMiddleware = require('../middleware/auth.middleware');

const router = express.Router();

router.post('/register', registerUser);
router.post('/verify-email-otp', verifyEmailOtp);
router.post('/complete-registration', completeRegistration);
router.post('/login', loginUser);
router.post('/forgot-password/request-otp', requestPasswordResetOtp);
router.post('/forgot-password/verify-otp', verifyPasswordResetOtp);
router.post('/forgot-password/reset', resetPasswordWithOtp);
router.get('/me', authMiddleware, getMe);

module.exports = router;
