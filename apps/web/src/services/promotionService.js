import api from './api';

export const getPromotionSettings = async () => {
  const res = await api.get('/promotion/settings');
  return res.data;
};

export const getPromotionClassSummary = async (params) => {
  const res = await api.get('/promotion/class-summary', { params });
  return res.data;
};

export const getStudentsForPromotion = async (params) => {
  const res = await api.get('/promotion/students', { params });
  return res.data;
};

export const previewPromotion = async (data) => {
  const res = await api.post('/promotion/preview', data);
  return res.data;
};

export const executePromotion = async (data) => {
  const res = await api.post('/promotion/execute', data);
  return res.data;
};

export const getPromotionHistory = async () => {
  const res = await api.get('/promotion/history');
  return res.data;
};

export const getPromotionHistoryById = async (batchId) => {
  const res = await api.get(`/promotion/history/${batchId}`);
  return res.data;
};

export const getStudentPromotionHistory = async (studentId) => {
  const res = await api.get(`/promotion/student-history/${studentId}`);
  return res.data;
};

export const getAlumniRecords = async (params) => {
  const res = await api.get('/promotion/alumni', { params });
  return res.data;
};

export const updateAlumniRecord = async (id, data) => {
  const res = await api.post(`/promotion/alumni/${id}/update`, data);
  return res.data;
};
