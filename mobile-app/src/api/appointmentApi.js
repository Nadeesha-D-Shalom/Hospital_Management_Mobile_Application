import axios from './axios';

export const getAppointmentsApi = () => axios.get('/appointments');
export const getAppointmentByIdApi = (id) => axios.get(`/appointments/${id}`);
export const getAppointmentAvailabilityApi = (doctorId, date) =>
  axios.get('/appointments/availability', { params: { doctorId, date } });
export const createAppointmentApi = (data) => axios.post('/appointments', data);
export const updateAppointmentApi = (id, data) => axios.put(`/appointments/${id}`, data);
export const deleteAppointmentApi = (id) => axios.delete(`/appointments/${id}`);
export const updateAppointmentStatusApi = (id, status) => axios.patch(`/appointments/${id}/status`, { status });
