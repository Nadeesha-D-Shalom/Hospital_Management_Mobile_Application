import axios from './axios';

export const uploadDoctorImageApi = (formData) => axios.post('/upload/doctor-image', formData, {
  headers: {
    'Content-Type': 'multipart/form-data',
  },
});

export const uploadAppointmentReportFileApi = (formData) =>
  axios.post('/upload/report-file', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });