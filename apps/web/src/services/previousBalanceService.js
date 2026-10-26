import api from './api';

export const getPreviousBalances = async (params) => {
  const res = await api.get('/previous-balance', { params });
  return res.data;
};

export const getPreviousBalanceSummary = async (params) => {
  const res = await api.get('/previous-balance/summary', { params });
  return res.data;
};

export const getEligibleStudents = async (params) => {
  const res = await api.get('/previous-balance/students', { params });
  return res.data;
};

export const createPreviousBalance = async (data) => {
  const res = await api.post('/previous-balance', data);
  return res.data;
};

export const updatePreviousBalance = async (id, data) => {
  const res = await api.put(`/previous-balance/${id}`, data);
  return res.data;
};

export const recordPreviousBalancePayment = async (id, data) => {
  const res = await api.post(`/previous-balance/${id}/payment`, data);
  return res.data;
};

export const deletePreviousBalance = async (id) => {
  const res = await api.delete(`/previous-balance/${id}`);
  return res.data;
};
