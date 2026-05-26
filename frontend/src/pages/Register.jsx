import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Zap,
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Check,
  ArrowRight,
  Sparkles,
  Play,
} from 'lucide-react';

const GitHubIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
  </svg>
);

export default function Register() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!fullName || !email || !password) {
      setError('Vui lòng điền đầy đủ thông tin');
      return;
    }
    if (!agreeTerms) {
      setError('Bạn cần đồng ý với Điều khoản và Chính sách bảo mật');
      return;
    }

    try {
      setIsLoading(true);
      await register(fullName, email, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Đăng ký thất bại. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-white">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-2 mb-10">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-700 rounded-xl flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" strokeWidth={1.5} />
            </div>
            <span className="text-2xl font-semibold tracking-tight text-purple-700">
              LMS
            </span>
          </div>

          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-slate-900 mb-2">
            Tạo tài khoản mới
          </h1>
          <p className="text-sm text-slate-500 mb-8">
            Bắt đầu hành trình học tập cùng hàng trăm nghìn học viên.
          </p>

          <div className="grid grid-cols-2 gap-3 mb-6">
            <button className="bg-white border border-slate-200 hover:border-slate-300 text-slate-700 px-4 py-2.5 rounded-full text-sm font-medium inline-flex items-center justify-center gap-2 cursor-pointer transition-colors">
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Google
            </button>
            <button className="bg-white border border-slate-200 hover:border-slate-300 text-slate-700 px-4 py-2.5 rounded-full text-sm font-medium inline-flex items-center justify-center gap-2 cursor-pointer transition-colors">
              <GitHubIcon className="w-4 h-4" />
              GitHub
            </button>
          </div>

          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-xs text-slate-400">
              hoặc đăng ký với email
            </span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl border border-red-100 flex items-center gap-2">
                <span className="font-medium">{error}</span>
              </div>
            )}

            <div>
              <label className="text-xs font-medium text-slate-500 mb-1.5 block">
                Họ và tên
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" strokeWidth={1.5} />
                <input
                  id="register-fullname"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Nguyễn Văn A"
                  disabled={isLoading}
                  className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-3.5 py-2.5 text-sm outline-none focus:border-purple-400 transition-colors disabled:opacity-50"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-500 mb-1.5 block">
                Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" strokeWidth={1.5} />
                <input
                  id="register-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  disabled={isLoading}
                  className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-3.5 py-2.5 text-sm outline-none focus:border-purple-400 transition-colors disabled:opacity-50"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-500 mb-1.5 block">
                Mật khẩu
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" strokeWidth={1.5} />
                <input
                  id="register-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={isLoading}
                  className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-10 py-2.5 text-sm outline-none focus:border-purple-400 transition-colors disabled:opacity-50"
                />
                <button
                  type="button"
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 cursor-pointer"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4 text-slate-400" strokeWidth={1.5} />
                  ) : (
                    <Eye className="w-4 h-4 text-slate-400" strokeWidth={1.5} />
                  )}
                </button>
              </div>
              <p className="text-xs text-slate-400 mt-1.5">
                Tối thiểu 8 ký tự, bao gồm chữ và số.
              </p>
            </div>

            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={agreeTerms}
                onChange={() => setAgreeTerms(!agreeTerms)}
                disabled={isLoading}
              />
              <div
                className={`w-4 h-4 mt-0.5 rounded border flex items-center justify-center shrink-0 transition-colors ${
                  agreeTerms
                    ? 'bg-purple-600 border-purple-600'
                    : 'border-slate-300'
                }`}
              >
                {agreeTerms && (
                  <Check className="w-3 h-3 text-white" strokeWidth={2} />
                )}
              </div>
              <span className="text-sm text-slate-600">
                Tôi đồng ý với{' '}
                <a
                  href="#"
                  className="font-medium text-purple-600 hover:text-purple-700"
                >
                  Điều khoản
                </a>{' '}
                và{' '}
                <a
                  href="#"
                  className="font-medium text-purple-600 hover:text-purple-700"
                >
                  Chính sách bảo mật
                </a>
              </span>
            </label>

            <button
              type="submit"
              id="register-submit"
              disabled={isLoading}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white px-4 py-3 rounded-full text-sm font-medium inline-flex items-center justify-center gap-2 cursor-pointer transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Đang tạo tài khoản...' : 'Tạo tài khoản'}
              {!isLoading && <ArrowRight className="w-4 h-4" strokeWidth={1.5} />}
            </button>
          </form>

          <p className="text-sm text-slate-500 text-center mt-8">
            Đã có tài khoản?{' '}
            <Link
              to="/login"
              className="font-medium text-purple-600 hover:text-purple-700"
            >
              Đăng nhập
            </Link>
          </p>
        </div>
      </div>

      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 relative overflow-hidden items-center justify-center p-12">
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-pink-400/30 blur-3xl" />
        <div className="absolute -bottom-32 -left-20 w-96 h-96 rounded-full bg-indigo-400/30 blur-3xl" />

        <div className="relative max-w-md text-white">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 backdrop-blur mb-6">
            <Sparkles className="w-3.5 h-3.5" strokeWidth={1.5} />
            <span className="text-xs font-medium">
              Hơn 250.000+ học viên đang học cùng LMS
            </span>
          </div>
          <h2 className="text-4xl font-semibold tracking-tight leading-tight mb-4">
            Học mọi lúc. Phát triển mọi nơi.
          </h2>
          <p className="text-purple-100/90 text-sm mb-8">
            Truy cập hơn 12.000 khóa học chất lượng cao, lộ trình cá nhân hóa
            và cộng đồng mentor toàn cầu.
          </p>

          <div className="space-y-3">
            {[
              {
                title: 'Thiết kế Design System',
                author: 'Sophia Nguyễn',
                lessons: 24,
                gradient: 'from-pink-300 to-orange-300',
              },
              {
                title: 'Lập trình React nâng cao',
                author: 'Noah Kim',
                lessons: 36,
                gradient: 'from-blue-300 to-cyan-300',
              },
              {
                title: 'Khởi nghiệp với AI',
                author: 'Ethan Cruz',
                lessons: 18,
                gradient: 'from-amber-300 to-red-300',
              },
            ].map((course) => (
              <div
                key={course.title}
                className="flex items-center gap-3 p-3 rounded-2xl bg-white/10 border border-white/20 backdrop-blur"
              >
                <div
                  className={`w-10 h-10 rounded-xl bg-gradient-to-br ${course.gradient}`}
                />
                <div className="flex-1">
                  <p className="text-sm font-semibold">{course.title}</p>
                  <p className="text-xs text-purple-100/80">
                    {course.author} · {course.lessons} bài học
                  </p>
                </div>
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                  <Play className="w-3.5 h-3.5" strokeWidth={1.5} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
