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

export default function Register() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState('');

  const { register, startSocialLogin } = useAuth();
  const navigate = useNavigate();

  const normalizedName = useMemo(() => fullName.trim(), [fullName]);
  const normalizedEmail = useMemo(() => email.trim(), [email]);

  const validate = () => {
    const nextErrors = {};

    if (!normalizedName) {
      nextErrors.fullName = 'Vui lòng nhập họ tên.';
    }

    if (!normalizedEmail) {
      nextErrors.email = 'Vui lòng nhập email.';
    } else if (!isValidEmail(normalizedEmail)) {
      nextErrors.email = 'Email chưa đúng định dạng.';
    }

    if (!password) {
      nextErrors.password = 'Vui lòng nhập mật khẩu.';
    } else if (password.length < 6) {
      nextErrors.password = 'Mật khẩu tối thiểu 6 ký tự.';
    }

    if (!confirmPassword) {
      nextErrors.confirmPassword = 'Vui lòng nhập lại mật khẩu.';
    } else if (confirmPassword !== password) {
      nextErrors.confirmPassword = 'Mật khẩu nhập lại chưa khớp.';
    }

    if (!agreeTerms) {
      nextErrors.terms = 'Bạn cần đồng ý với Điều khoản và Chính sách bảo mật.';
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
      await register(normalizedName, normalizedEmail, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Đăng ký thất bại. Vui lòng thử lại.');
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
      setError(err.message || `Không thể đăng ký bằng ${provider}.`);
      setSocialLoading('');
    }
  };

  return (
    <AuthShell
      title="Tạo tài khoản Skillio"
      subtitle="Tạo tài khoản để bắt đầu học và lưu toàn bộ lộ trình của bạn."
      slogan="Bắt đầu học theo cách gọn gàng hơn."
      footer={
        <p className="mt-6 text-center text-sm text-slate-500">
          Đã có tài khoản?{' '}
          <Link to="/login" className="font-semibold text-purple-600 transition hover:text-purple-700">
            Đăng nhập
          </Link>
        </p>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        {error ? <AuthAlert>{error}</AuthAlert> : null}

        <AuthTextField
          id="register-fullname"
          label="Họ và tên"
          icon="user"
          type="text"
          value={fullName}
          onChange={(event) => {
            setFullName(event.target.value);
            setFieldErrors((current) => ({ ...current, fullName: '' }));
          }}
          placeholder="Nguyễn Minh Anh"
          disabled={isLoading}
          error={fieldErrors.fullName}
          autoComplete="name"
        />

        <AuthTextField
          id="register-email"
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
            id="register-password"
            label="Mật khẩu"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              setFieldErrors((current) => ({ ...current, password: '' }));
            }}
            placeholder="Tối thiểu 6 ký tự"
            disabled={isLoading}
            error={fieldErrors.password}
            showPassword={showPassword}
            onTogglePassword={() => setShowPassword((visible) => !visible)}
            autoComplete="new-password"
          />
          {!fieldErrors.password ? (
            <p className="mt-1.5 text-xs text-slate-400">Tối thiểu 6 ký tự, nên kết hợp chữ và số.</p>
          ) : null}
        </div>

        <AuthPasswordField
          id="register-confirm-password"
          label="Nhập lại mật khẩu"
          value={confirmPassword}
          onChange={(event) => {
            setConfirmPassword(event.target.value);
            setFieldErrors((current) => ({ ...current, confirmPassword: '' }));
          }}
          placeholder="Nhập lại mật khẩu"
          disabled={isLoading}
          error={fieldErrors.confirmPassword}
          showPassword={showConfirmPassword}
          onTogglePassword={() => setShowConfirmPassword((visible) => !visible)}
          autoComplete="new-password"
        />

        <div>
          <AuthCheckbox
            checked={agreeTerms}
            onChange={() => {
              setAgreeTerms((current) => !current);
              setFieldErrors((current) => ({ ...current, terms: '' }));
            }}
            disabled={isLoading}
          >
            Tôi đồng ý với{' '}
            <a href="#" className="font-semibold text-purple-600 transition hover:text-purple-700">
              Điều khoản
            </a>{' '}
            và{' '}
            <a href="#" className="font-semibold text-purple-600 transition hover:text-purple-700">
              Chính sách bảo mật
            </a>
          </AuthCheckbox>
          {fieldErrors.terms ? <p className="mt-1.5 text-xs font-medium text-rose-600">{fieldErrors.terms}</p> : null}
        </div>

        <AuthSubmitButton loading={isLoading} loadingText="Đang tạo tài khoản...">
          Tạo tài khoản
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
