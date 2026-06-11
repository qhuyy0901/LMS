/**
 * API Client — Sử dụng cho các component KHÔNG dùng axios trực tiếp.
 * Tự động gắn Authorization header từ localStorage.
 * 
 * Lưu ý: Phần lớn app dùng axios (qua AuthContext).
 * File này dành cho các nơi cần fetch API ngoài context.
 */

const envApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const BASE_URL = envApiUrl.endsWith('/api') ? envApiUrl.slice(0, -4) : envApiUrl;

const getHeaders = (isJson = true) => {
  const headers = {};
  if (isJson) {
    headers['Content-Type'] = 'application/json';
  }
  const token = localStorage.getItem('token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

const handleResponse = async (response) => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error = new Error(errorData.message || `HTTP ${response.status}`);
    error.status = response.status;
    error.data = errorData;
    throw error;
  }
  return response.json();
};

export const api = {
  get: (path) =>
    fetch(`${BASE_URL}${path}`, { headers: getHeaders(false), credentials: 'include' })
      .then(handleResponse),

  post: (path, body) =>
    fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers: getHeaders(),
      credentials: 'include',
      body: JSON.stringify(body),
    }).then(handleResponse),

  put: (path, body) =>
    fetch(`${BASE_URL}${path}`, {
      method: 'PUT',
      headers: getHeaders(),
      credentials: 'include',
      body: JSON.stringify(body),
    }).then(handleResponse),

  patch: (path, body) =>
    fetch(`${BASE_URL}${path}`, {
      method: 'PATCH',
      headers: getHeaders(),
      credentials: 'include',
      body: JSON.stringify(body),
    }).then(handleResponse),

  delete: (path) =>
    fetch(`${BASE_URL}${path}`, {
      method: 'DELETE',
      headers: getHeaders(false),
      credentials: 'include',
    }).then(handleResponse),

  // Upload file (FormData) — không set Content-Type để browser tự thêm boundary
  upload: (path, formData) =>
    fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      credentials: 'include',
      body: formData,
    }).then(handleResponse),

  uploadPut: (path, formData) =>
    fetch(`${BASE_URL}${path}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      credentials: 'include',
      body: formData,
    }).then(handleResponse),
};
