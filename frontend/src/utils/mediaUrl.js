const envApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const apiBaseUrl = envApiUrl.endsWith('/api')
  ? envApiUrl.slice(0, -4)
  : envApiUrl.replace(/\/$/, '');
const backendBaseUrl = (import.meta.env.VITE_FILE_BASE_URL || apiBaseUrl).replace(/\/$/, '');

export const resolveMediaUrl = (url) => {
  if (!url) return '';
  if (/^(https?:|data:|blob:)/i.test(url)) return url;
  return `${backendBaseUrl}${url.startsWith('/') ? url : `/${url}`}`;
};
