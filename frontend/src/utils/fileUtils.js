export const getFileUrl = (url) => {
  if (!url) return url;
  if (/^(https?:|data:|blob:)/i.test(url)) return url;

  const envApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  const apiBaseUrl = envApiUrl.endsWith('/api')
    ? envApiUrl.slice(0, -4)
    : envApiUrl.replace(/\/$/, '');
  const baseUrl = (import.meta.env.VITE_FILE_BASE_URL || apiBaseUrl).replace(/\/$/, '');

  return `${baseUrl}${url.startsWith('/') ? url : `/${url}`}`;
};
