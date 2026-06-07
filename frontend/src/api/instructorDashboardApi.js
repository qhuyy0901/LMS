const envApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const BASE_URL = envApiUrl.endsWith('/api') ? envApiUrl.slice(0, -4) : envApiUrl;

const parseResponse = async (response) => {
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const error = new Error(data?.message || 'Không thể tải dữ liệu dashboard.');
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
};

export const getInstructorDashboard = async () => {
  const token = localStorage.getItem('token');
  const response = await fetch(`${BASE_URL}/api/instructor/dashboard`, {
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  return parseResponse(response);
};
