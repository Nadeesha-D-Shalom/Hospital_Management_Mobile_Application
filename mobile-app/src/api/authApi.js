import axios from './axios';

export const loginApi = (email, password) => axios.post('/auth/login', { email, password });
export const registerApi = (name, email, password) => axios.post('/auth/register', { name, email, password });
export const getMeApi = () => axios.get('/auth/me');
export const requestPasswordResetOtpApi = (email) =>
  axios.post('/auth/forgot-password/request-otp', { email });
export const verifyPasswordResetOtpApi = (email, otp) =>
  axios.post('/auth/forgot-password/verify-otp', { email, otp });
export const resetPasswordWithOtpApi = (email, newPassword, confirmPassword) =>
  axios.post('/auth/forgot-password/reset', { email, newPassword, confirmPassword });