import api from './api';

// =========================================================================
// 1. QUESTION BANK APIS
// =========================================================================

export const getQuestionBankMetadata = async () => {
  const res = await api.get('/online-exam/questions/metadata');
  return res.data;
};

export const getQuestions = async (params = {}) => {
  const res = await api.get('/online-exam/questions', { params });
  return res.data;
};

export const getQuestionById = async (id) => {
  const res = await api.get(`/online-exam/questions/${id}`);
  return res.data;
};

export const createQuestion = async (data) => {
  const res = await api.post('/online-exam/questions', data);
  return res.data;
};

export const updateQuestion = async (id, data) => {
  const res = await api.put(`/online-exam/questions/${id}`, data);
  return res.data;
};

export const duplicateQuestion = async (id) => {
  const res = await api.post(`/online-exam/questions/${id}/duplicate`);
  return res.data;
};

export const deleteQuestion = async (id) => {
  const res = await api.delete(`/online-exam/questions/${id}`);
  return res.data;
};

export const uploadQuestionPaperFile = async (formData) => {
  const res = await api.post('/online-exam/upload-paper', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return res.data;
};

export const importQuestionsFile = async (formData) => {
  const res = await api.post('/online-exam/questions/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return res.data;
};

export const downloadQuestionTemplateUrl = (format = 'xlsx') => {
  return `/api/online-exam/questions/template?format=${format}`;
};

export const exportQuestionsUrl = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return `/api/online-exam/questions/export?${query}`;
};

// =========================================================================
// 2. EXAM MANAGEMENT APIS
// =========================================================================

export const getExams = async (params = {}) => {
  const res = await api.get('/online-exam/exams', { params });
  return res.data;
};

export const getExamById = async (id) => {
  const res = await api.get(`/online-exam/exams/${id}`);
  return res.data;
};

export const createExam = async (data) => {
  const res = await api.post('/online-exam/exams', data);
  return res.data;
};

export const updateExam = async (id, data) => {
  const res = await api.put(`/online-exam/exams/${id}`, data);
  return res.data;
};

export const duplicateExam = async (id) => {
  const res = await api.post(`/online-exam/exams/${id}/duplicate`);
  return res.data;
};

export const publishExam = async (id) => {
  const res = await api.post(`/online-exam/exams/${id}/publish`);
  return res.data;
};

export const archiveExam = async (id) => {
  const res = await api.post(`/online-exam/exams/${id}/archive`);
  return res.data;
};

export const deleteExam = async (id) => {
  const res = await api.delete(`/online-exam/exams/${id}`);
  return res.data;
};

export const randomizeExamPool = async (id, data) => {
  const res = await api.post(`/online-exam/exams/${id}/randomize-pool`, data);
  return res.data;
};

// =========================================================================
// 3. STUDENT EXAMINATION APIS
// =========================================================================

export const getMyExams = async (params = {}) => {
  const res = await api.get('/online-exam/student/my-exams', { params });
  return res.data;
};

export const getExamLobby = async (examId, params = {}) => {
  const res = await api.get(`/online-exam/student/exams/${examId}/lobby`, { params });
  return res.data;
};

export const startExamAttempt = async (examId, data = {}) => {
  const res = await api.post(`/online-exam/student/exams/${examId}/start`, data);
  return res.data;
};

export const getAttemptSession = async (attemptId) => {
  const res = await api.get(`/online-exam/student/attempts/${attemptId}/session`);
  return res.data;
};

export const autosaveAnswer = async (attemptId, data) => {
  const res = await api.post(`/online-exam/student/attempts/${attemptId}/answer`, data);
  return res.data;
};

export const logIntegritySignal = async (attemptId, data) => {
  const res = await api.post(`/online-exam/student/attempts/${attemptId}/integrity-event`, data);
  return res.data;
};

export const submitExamAttempt = async (attemptId, data = {}) => {
  const res = await api.post(`/online-exam/student/attempts/${attemptId}/submit`, data);
  return res.data;
};

export const getAttemptResult = async (attemptId) => {
  const res = await api.get(`/online-exam/student/attempts/${attemptId}/result`);
  return res.data;
};

// =========================================================================
// 4. ANALYTICS & REPORTS APIS
// =========================================================================

export const getOnlineExamDashboardStats = async () => {
  const res = await api.get('/online-exam/analytics/dashboard');
  return res.data;
};

export const getExamAnalytics = async (examId) => {
  const res = await api.get(`/online-exam/analytics/exam/${examId}`);
  return res.data;
};

export const exportExamResultsUrl = (examId, format = 'xlsx') => {
  return `/api/online-exam/analytics/exam/${examId}/export?format=${format}`;
};

export const reEvaluateAttempt = async (attemptId, data = {}) => {
  const res = await api.post(`/online-exam/admin/attempts/${attemptId}/re-evaluate`, data);
  return res.data;
};

export const invalidateAttempt = async (attemptId, data) => {
  const res = await api.post(`/online-exam/admin/attempts/${attemptId}/invalidate`, data);
  return res.data;
};
