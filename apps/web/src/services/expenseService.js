import api from './api';

export const getExpenseDashboard = async () => {
  const res = await api.get('/expenses/dashboard');
  return res.data;
};

export const getExpenses = async (params = {}) => {
  const res = await api.get('/expenses', { params });
  return res.data;
};

export const getExpense = async (id) => {
  const res = await api.get(`/expenses/${id}`);
  return res.data;
};

export const createExpense = async (formData) => {
  const isMultipart = formData instanceof FormData;
  const res = await api.post('/expenses', formData, {
    headers: isMultipart ? { 'Content-Type': 'multipart/form-data' } : {}
  });
  return res.data;
};

export const updateExpense = async (id, formData) => {
  const isMultipart = formData instanceof FormData;
  const res = await api.put(`/expenses/${id}`, formData, {
    headers: isMultipart ? { 'Content-Type': 'multipart/form-data' } : {}
  });
  return res.data;
};

export const deleteExpense = async (id, reason = '') => {
  const res = await api.delete(`/expenses/${id}`, { data: { reason } });
  return res.data;
};

export const getExpenseCategories = async (includeInactive = false) => {
  const res = await api.get('/expenses/categories', {
    params: { includeInactive }
  });
  return res.data;
};

export const createExpenseCategory = async (data) => {
  const res = await api.post('/expenses/categories', data);
  return res.data;
};

export const updateExpenseCategory = async (id, data) => {
  const res = await api.put(`/expenses/categories/${id}`, data);
  return res.data;
};

export const deleteExpenseCategory = async (id) => {
  const res = await api.delete(`/expenses/categories/${id}`);
  return res.data;
};

export const getDailyExpenseReport = async (date) => {
  const res = await api.get('/expenses/reports/daily', { params: { date } });
  return res.data;
};

export const getWeeklyExpenseReport = async (startDate, endDate) => {
  const res = await api.get('/expenses/reports/weekly', { params: { startDate, endDate } });
  return res.data;
};

export const getMonthlyExpenseReport = async (month, year) => {
  const res = await api.get('/expenses/reports/monthly', { params: { month, year } });
  return res.data;
};

export const getCustomExpenseReport = async (params) => {
  const res = await api.get('/expenses/reports/custom', { params });
  return res.data;
};

export const getExcelExportUrl = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return `/api/expenses/export/excel${query ? `?${query}` : ''}`;
};

export const getPdfExportUrl = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return `/api/expenses/export/pdf${query ? `?${query}` : ''}`;
};
