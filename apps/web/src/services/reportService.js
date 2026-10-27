import api from './api';

/**
 * Daily Operations Report Service
 * Fetches consolidated daily reports for Principal & Admins.
 */
export const getDailyReport = async (date, standard = '', section = '') => {
  const params = {};
  if (date) params.date = date;
  if (standard) params.standard = standard;
  if (section) params.section = section;

  const res = await api.get('/reports/daily', { params });
  return res.data;
};

export default {
  getDailyReport
};
