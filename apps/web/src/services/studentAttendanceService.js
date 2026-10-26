import api from './api';

export const studentAttendanceService = {
  // Dashboard & Metrics
  getDashboard: (params) => api.get('/student-attendance/dashboard', { params }),

  // Roster
  getRoster: (params) => api.get('/student-attendance/roster', { params }),

  // Save manual attendance
  saveManual: (data) => api.post('/student-attendance/save-manual', data),

  // QR / Barcode Scan
  scanQr: (data) => api.post('/student-attendance/scan-qr', data),

  // Face Recognition Punch
  faceRecognize: (data) => api.post('/student-attendance/face-recognize', data),

  // Biometrics & Consent
  getBiometrics: (params) => api.get('/student-attendance/biometrics', { params }),
  updateConsent: (data) => api.post('/student-attendance/biometrics/consent', data),
  enrollFace: (data) => api.post('/student-attendance/biometrics/enroll', data),
  deleteBiometric: (studentId) => api.delete(`/student-attendance/biometrics/${studentId}`),

  // ID Cards
  getIdCards: (params) => api.get('/student-attendance/id-cards', { params }),

  // Reports
  getDailyReport: (params) => api.get('/student-attendance/reports/daily', { params }),
  getMonthlyReport: (params) => api.get('/student-attendance/reports/monthly', { params }),
  getLowAttendanceReport: (params) => api.get('/student-attendance/reports/low-attendance', { params }),
  getStudentHistory: (studentId) => api.get(`/student-attendance/reports/student-history/${studentId}`),

  // Notifications
  getNotifications: (params) => api.get('/student-attendance/notifications', { params }),
  retryNotifications: (data) => api.post('/student-attendance/notifications/retry', data),

  // Settings
  getSettings: () => api.get('/student-attendance/settings'),
  updateSettings: (data) => api.put('/student-attendance/settings', data),

  // Audit Logs
  getAuditLogs: () => api.get('/student-attendance/audit-logs'),

  // Class List
  getClasses: () => api.get('/admin/classes')
};

export default studentAttendanceService;
