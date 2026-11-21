import api from './api';

/**
 * Fetch form metadata for Teacher Daily Work:
 * classes, sections, subjects, assigned timetable periods, and teacher identity.
 */
export const getTeacherWorkMeta = async () => {
  const response = await api.get('/teacher-work/meta');
  return response.data;
};

/**
 * Submit daily work entries (supports single entry or batch entries array)
 * @param {Object} payload - { date, entries: [...] }
 */
export const submitDailyWork = async (payload) => {
  const response = await api.post('/teacher-work', payload);
  return response.data;
};

/**
 * Fetch authenticated teacher's submitted daily work reports
 * @param {Object} params - { date, startDate, endDate, standard, section, subject, search, page, limit }
 */
export const getMyWorkHistory = async (params = {}) => {
  const response = await api.get('/teacher-work/my-history', { params });
  return response.data;
};

/**
 * Update an existing daily work report (only own report)
 * @param {string} id
 * @param {Object} data
 */
export const updateDailyWork = async (id, data) => {
  const response = await api.put(`/teacher-work/${id}`, data);
  return response.data;
};

/**
 * Delete a daily work report (only own report)
 * @param {string} id
 */
export const deleteDailyWork = async (id) => {
  const response = await api.delete(`/teacher-work/${id}`);
  return response.data;
};

/**
 * Fetch Admin overview cards and teacher submission tracking roster
 * @param {string} date - 'YYYY-MM-DD'
 */
export const getAdminWorkOverview = async (date) => {
  const response = await api.get('/teacher-work/admin/overview', {
    params: { date }
  });
  return response.data;
};

/**
 * Fetch Admin full reports table with filters and pagination
 * @param {Object} params - { date, startDate, endDate, teacherId, teacherName, employeeId, standard, section, subject, search, page, limit }
 */
export const getAdminWorkReports = async (params = {}) => {
  const response = await api.get('/teacher-work/admin/reports', { params });
  return response.data;
};

/**
 * Fetch teacher-specific historical progression and work logs
 * @param {string} teacherId
 * @param {Object} params - { startDate, endDate }
 */
export const getTeacherHistoricalWork = async (teacherId, params = {}) => {
  const response = await api.get(`/teacher-work/admin/teacher/${teacherId}`, { params });
  return response.data;
};
