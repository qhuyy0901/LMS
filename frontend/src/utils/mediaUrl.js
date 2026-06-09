const envApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const backendBaseUrl = envApiUrl.endsWith('/api')
  ? envApiUrl.slice(0, -4)
  : envApiUrl.replace(/\/$/, '');

export const resolveMediaUrl = (url) => {
  if (!url) return '';
  if (/^(https?:|data:|blob:)/i.test(url)) return url;
  return `${backendBaseUrl}${url.startsWith('/') ? url : `/${url}`}`;
};
