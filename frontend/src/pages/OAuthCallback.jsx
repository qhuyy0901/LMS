import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const getLoginRedirectPath = (user) => {
  if (user?.role === 'INSTRUCTOR') return '/instructor/dashboard';
  if (user?.role === 'ADMIN') return '/admin';
  return '/';
};

const OAuthCallback = () => {
  const { completeSocialLogin } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState(searchParams.get('error') || '');
  const token = searchParams.get('token');

  useEffect(() => {
    if (error) return;

    if (!token) {
      setError('Không nhận được token xác thực. Vui lòng thử lại.');
      return;
    }

    completeSocialLogin(token)
      .then((user) => {
        sessionStorage.removeItem('skillio_student_preview');
        navigate(getLoginRedirectPath(user), { replace: true });
      })
      .catch(() => setError('Không thể hoàn tất đăng nhập mạng xã hội. Vui lòng thử lại.'));
  }, [completeSocialLogin, error, navigate, token]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="rounded-2xl border border-slate-100 bg-white px-8 py-6 text-center shadow-sm">
        {error ? (
          <>
            <p className="text-sm font-medium text-rose-600">{error}</p>
            <button onClick={() => navigate('/login')} className="mt-4 rounded-xl bg-purple-600 px-4 py-2 text-sm font-medium text-white">
              Quay lại đăng nhập
            </button>
          </>
        ) : (
          <p className="text-sm font-medium text-slate-600">Đang hoàn tất đăng nhập...</p>
        )}
      </div>
    </div>
  );
};

export default OAuthCallback;
