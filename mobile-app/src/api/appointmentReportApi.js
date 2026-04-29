import axios from './axios';

export const createReportApi = (data) => axios.post('/appointment-reports', data);
export const getReportsByAppointmentApi = (appointmentId) =>
  axios.get(`/appointment-reports/appointment/${appointmentId}`);
export const getReportByIdApi = (id) => axios.get(`/appointment-reports/${id}`);
export const updateReportApi = (id, data) => axios.put(`/appointment-reports/${id}`, data);
export const deleteReportApi = (id) => axios.delete(`/appointment-reports/${id}`);
