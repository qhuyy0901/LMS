const rawApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const normalizedApiUrl = rawApiUrl.replace(/\/+$/, '');

export const backendBaseUrl = normalizedApiUrl.endsWith('/api')
  ? normalizedApiUrl.slice(0, -4)
  : normalizedApiUrl;

export const buildBackendUrl = (path = '/') => {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${backendBaseUrl}${normalizedPath}`;
};

export const buildKhamPhaUrl = (search = '') => {
  const sourceParams = new URLSearchParams(search);
  const params = new URLSearchParams();
  const query = sourceParams.get('search') || sourceParams.get('q');
  const categoryId = sourceParams.get('danhMucId');
  const categorySlug = sourceParams.get('danhMucSlug');

  if (query) {
    params.set('search', query);
  }

  if (categoryId) {
    params.set('danhMucId', categoryId);
  }

  if (categorySlug) {
    params.set('danhMucSlug', categorySlug);
  }

  const queryString = params.toString();
  return buildBackendUrl(queryString ? `/KhamPha?${queryString}` : '/KhamPha');
};
