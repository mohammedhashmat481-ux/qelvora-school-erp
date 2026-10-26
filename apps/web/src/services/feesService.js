import api from './api';

// Dashboard & KPI statistics
export const getFeesDashboard = async (academicYear) => {
  const params = academicYear ? { academicYear } : {};
  const res = await api.get('/fees/dashboard', { params });
  return res.data;
};

// Fee Heads Master
export const getFeeHeads = async () => {
  const res = await api.get('/fees/heads');
  return res.data;
};

export const createFeeHead = async (data) => {
  const res = await api.post('/fees/heads', data);
  return res.data;
};

export const updateFeeHead = async (id, data) => {
  const res = await api.put(`/fees/heads/${id}`, data);
  return res.data;
};

export const deleteFeeHead = async (id) => {
  const res = await api.delete(`/fees/heads/${id}`);
  return res.data;
};

export const toggleFeeHeadStatus = async (id) => {
  const res = await api.patch(`/fees/heads/${id}/toggle`);
  return res.data;
};

// Quota (Student Category) Master
export const getFeeQuotas = async () => {
  const res = await api.get('/fees/quotas');
  return res.data;
};

export const createFeeQuota = async (data) => {
  const res = await api.post('/fees/quotas', data);
  return res.data;
};

export const updateFeeQuota = async (id, data) => {
  const res = await api.put(`/fees/quotas/${id}`, data);
  return res.data;
};

export const deleteFeeQuota = async (id) => {
  const res = await api.delete(`/fees/quotas/${id}`);
  return res.data;
};

// Fee Structure
export const getFeeStructure = async (params) => {
  const res = await api.get('/fees/structures', { params });
  return res.data;
};

export const saveFeeStructureBulk = async (data) => {
  const res = await api.post('/fees/structures/bulk-save', data);
  return res.data;
};

export const copyFeeStructureToClasses = async (data) => {
  const res = await api.post('/fees/structures/copy-class', data);
  return res.data;
};

export const copyFeeStructureFromQuota = async (data) => {
  const res = await api.post('/fees/structures/copy-quota', data);
  return res.data;
};

export const copyFeeStructureFromYear = async (data) => {
  const res = await api.post('/fees/structures/copy-year', data);
  return res.data;
};

// Assign Quota
export const getStudentsForQuotaAssignment = async (params) => {
  const res = await api.get('/fees/assign-quota/students', { params });
  return res.data;
};

export const bulkAssignQuota = async (data) => {
  const res = await api.post('/fees/assign-quota/bulk-assign', data);
  return res.data;
};

export const getQuotaAssignmentHistory = async () => {
  const res = await api.get('/fees/assign-quota/history');
  return res.data;
};

// Student Fee Adjustment
export const getStudentFeeAdjustment = async (studentId, academicYear) => {
  const params = academicYear ? { academicYear } : {};
  const res = await api.get(`/fees/adjustments/${studentId}`, { params });
  return res.data;
};

export const saveStudentFeeAdjustment = async (studentId, data) => {
  const res = await api.post(`/fees/adjustments/${studentId}`, data);
  return res.data;
};

// Collection
export const searchCollectionStudents = async (params) => {
  const res = await api.get('/fees/collection/search-students', { params });
  return res.data;
};

export const getCollectionStudentDetails = async (studentId, academicYear) => {
  const params = academicYear ? { academicYear } : {};
  const res = await api.get(`/fees/collection/student-details/${studentId}`, { params });
  return res.data;
};

export const collectStudentFee = async (data) => {
  const res = await api.post('/fees/collection/collect', data);
  return res.data;
};

export const setStudentPreviousBalance = async (studentId, data) => {
  const res = await api.post(`/fees/collection/student/${studentId}/previous-balance`, data);
  return res.data;
};

// Receipts Ledger
export const getFeeReceipts = async (params) => {
  const res = await api.get('/fees/receipts', { params });
  return res.data;
};

export const getFeeReceiptById = async (id) => {
  const res = await api.get(`/fees/receipts/${id}`);
  return res.data;
};

export const cancelFeeReceipt = async (id, data) => {
  const res = await api.post(`/fees/receipts/${id}/cancel`, data);
  return res.data;
};

export const updateFeeReceiptRemarks = async (id, data) => {
  const res = await api.put(`/fees/receipts/${id}/remarks`, data);
  return res.data;
};

// Reports (11 types)
export const getFeesReport = async (reportType, params) => {
  const res = await api.get(`/fees/reports/${reportType}`, { params });
  return res.data;
};

// Settings
export const getFeesSettings = async () => {
  const res = await api.get('/fees/settings');
  return res.data;
};

export const updateFeesSettings = async (data) => {
  const res = await api.put('/fees/settings', data);
  return res.data;
};
