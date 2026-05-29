export const getFileUrl = (url) => {
  if (!url) return url;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  
  const baseUrl = import.meta.env.VITE_FILE_BASE_URL || 'http://localhost:5000';
  if (url.startsWith('/uploads')) {
    return `${baseUrl}${url}`;
  }
  
  return url;
};
