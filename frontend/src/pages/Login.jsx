import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  AuthAlert,
  AuthCheckbox,
  AuthPasswordField,
  AuthShell,
  AuthSocialButton,
  AuthSubmitButton,
  AuthTextField,
} from '../components/AuthShell';

const isValidEmail = (value) => /\S+@\S+\.\S+/.test(value);

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState('');

  const { login, startSocialLogin } = useAuth();
  const navigate = useNavigate();

  const normalizedEmail = useMemo(() => email.trim(), [email]);

  const validate = () => {
    const nextErrors = {};

    if (!normalizedEmail) {
      nextErrors.email = 'Vui lòng nhập email.';
    } else if (!isValidEmail(normalizedEmail)) {
      nextErrors.email = 'Email chưa đúng định dạng.';
    }

    if (!password) {
      nextErrors.password = 'Vui lòng nhập mật khẩu.';
    }

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!validate()) {
      return;
    }

    try {
      setIsLoading(true);
      await login(normalizedEmail, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Đăng nhập thất bại. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = async (provider) => {
    setError('');
    setSocialLoading(provider);

    try {
      await startSocialLogin(provider);
    } catch (err) {
      setError(err.message || `Không thể đăng nhập bằng ${provider}.`);
      setSocialLoading('');
    }
  };

  return (
    <AuthShell
      title="Chào mừng trở lại"
      subtitle="Đăng nhập để tiếp tục học và quản lý tài khoản Skillio của bạn."
      slogan="Học tập không giới hạn cùng Skillio."
      footer={
        <p className="mt-6 text-center text-sm text-slate-500">
          Chưa có tài khoản?{' '}
          <Link to="/register" className="font-semibold text-purple-600 transition hover:text-purple-700">
            Đăng ký miễn phí
          </Link>
        </p>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        {error ? <AuthAlert>{error}</AuthAlert> : null}

        <AuthTextField
          id="login-email"
          label="Email"
          type="email"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            setFieldErrors((current) => ({ ...current, email: '' }));
          }}
          placeholder="you@example.com"
          disabled={isLoading}
          error={fieldErrors.email}
          autoComplete="email"
        />

        <div>
          <AuthPasswordField
            id="login-password"
            label="Mật khẩu"
            labelAction={
              <Link to="#" className="text-xs font-semibold text-purple-600 transition hover:text-purple-700">
                Quên mật khẩu?
              </Link>
            }
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              setFieldErrors((current) => ({ ...current, password: '' }));
            }}
            placeholder="Nhập mật khẩu"
            disabled={isLoading}
            error={fieldErrors.password}
            showPassword={showPassword}
            onTogglePassword={() => setShowPassword((visible) => !visible)}
            autoComplete="current-password"
          />
        </div>

        <AuthCheckbox checked={rememberMe} onChange={() => setRememberMe((current) => !current)} disabled={isLoading}>
          Ghi nhớ đăng nhập trên thiết bị này
        </AuthCheckbox>

        <AuthSubmitButton loading={isLoading} loadingText="Đang đăng nhập...">
          Đăng nhập
        </AuthSubmitButton>
      </form>

      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-slate-200" />
        <span className="text-xs font-medium text-slate-400">hoặc tiếp tục với</span>
        <div className="h-px flex-1 bg-slate-200" />
      </div>

      <div className="space-y-3">
        <AuthSocialButton
          provider="Google"
          onClick={() => handleSocialLogin('Google')}
          disabled={isLoading || Boolean(socialLoading)}
          loading={socialLoading === 'Google'}
        />
        <AuthSocialButton
          provider="Facebook"
          onClick={() => handleSocialLogin('Facebook')}
          disabled={isLoading || Boolean(socialLoading)}
          loading={socialLoading === 'Facebook'}
        />
      </div>
    </AuthShell>
  );
}
