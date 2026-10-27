import api from './api';

export const getStudentsList = async (params = {}) => {
  const response = await api.get('/students', { params });
  return response.data;
};

export const getSingleStudent = async (id) => {
  const response = await api.get(`/students/${id}`);
  return response.data;
};

export const addStudent = async (data) => {
  const response = await api.post('/students', data);
  return response.data;
};

export const updateStudent = async (id, data) => {
  const response = await api.put(`/students/${id}`, data);
  return response.data;
};

export const deleteStudent = async (id) => {
  const response = await api.delete(`/students/${id}`);
  return response.data;
};

export const getNextAdmissionNumber = async () => {
  const response = await api.get('/students/next-admission-number');
  return response.data;
};

export const getClassesList = async () => {
  const response = await api.get('/classes');
  return response.data;
};

/**
 * Preview / validate an uploaded spreadsheet without writing to the database
 */
export const previewBulkUpload = async (formData) => {
  const response = await api.post('/students/bulk-upload?validateOnly=true', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
};

/**
 * Commit bulk upload ingestion to database
 */
export const commitBulkUpload = async (formData) => {
  const response = await api.post('/students/bulk-upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
};

/**
 * Download the official 3-sheet Excel template
 */
export const downloadBulkTemplate = async (format = 'xlsx') => {
  const response = await api.get('/students/bulk-template', {
    params: { format },
    responseType: 'blob'
  });
  const blob = new Blob([response.data], {
    type: format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', 'School_ERP_Student_Bulk_Upload_Template.xlsx');
  document.body.appendChild(link);
  link.click();
  link.parentNode.removeChild(link);
  window.URL.revokeObjectURL(url);
  return true;
};
