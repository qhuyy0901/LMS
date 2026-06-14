import { Link } from 'react-router-dom';

// Pixel-perfect minimalist SVG Icons
const ZapIcon = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor" className={className}>
    <path d="M216,112H144L176,24a8,8,0,0,0-13.63-7.5l-112,128a8,8,0,0,0,6,13.5h72L96,232a8,8,0,0,0,13.63,7.5l-112-128A8,8,0,0,0,216,112Z" />
  </svg>
);

const LockIcon = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="none" stroke="currentColor" strokeWidth="16" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="40" y="88" width="176" height="128" rx="8" />
    <path d="M92,88V52a36,36,0,0,1,72,0V88" />
  </svg>
);

const MailIcon = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="none" stroke="currentColor" strokeWidth="16" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="32" y="48" width="192" height="160" rx="8" />
    <polyline points="224 56 128 144 32 56" />
  </svg>
);

const UserIcon = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="none" stroke="currentColor" strokeWidth="16" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M128,120a48,48,0,1,0-48-48A48,48,0,0,0,128,120Z" />
    <path d="M63.8,199.3a72,72,0,0,1,128.4,0" />
  </svg>
);

const EyeIcon = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="none" stroke="currentColor" strokeWidth="16" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M128,56C48,56,16,128,16,128s32,72,112,72,112-72,112-72S208,56,128,56Z" />
    <circle cx="128" cy="128" r="40" />
  </svg>
);

const EyeOffIcon = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="none" stroke="currentColor" strokeWidth="16" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="48" y1="40" x2="208" y2="216" />
    <path d="M154.9,95.1a39.9,39.9,0,0,1,6,28.8" />
    <path d="M95.1,154.9a40.3,40.3,0,0,1-28.8-6" />
    <path d="M128,56C198,56,227.8,111,234.3,123.8" />
    <path d="M83,67.6C59,79.5,35,102.5,21.7,123.8a15.7,15.7,0,0,0,0,8.4c17.5,27.9,59.3,67.8,106.3,67.8a92.4,92.4,0,0,0,45.4-11.6" />
  </svg>
);

const LoaderIcon = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="none" stroke="currentColor" strokeWidth="16" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M128,32A96,96,0,1,1,32,128" />
  </svg>
);

const ArrowRightIcon = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="none" stroke="currentColor" strokeWidth="16" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="40" y1="128" x2="216" y2="128" />
    <polyline points="144 56 216 128 144 200" />
  </svg>
);

const CheckIcon = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="none" stroke="currentColor" strokeWidth="20" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="216 72 104 184 48 128" />
  </svg>
);

const baseInputClass =
  'w-full rounded-lg border bg-white py-2.5 text-sm text-[#111111] outline-none transition placeholder:text-slate-400 disabled:cursor-not-allowed disabled:bg-[#F7F6F3] disabled:text-[#787774] disabled:opacity-60';

const inputStateClass = (invalid) =>
  invalid
    ? 'border-rose-200 focus:border-rose-400 focus:ring-1 focus:ring-rose-400'
    : 'border-[#EAEAEA] focus:border-purple-600 focus:ring-1 focus:ring-purple-600';

export const GoogleIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
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
);

export const SkillioBrand = () => (
  <Link to="/" className="mb-8 inline-flex items-center gap-2.5 rounded-lg text-left transition hover:opacity-80">
    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-700 text-white">
      <ZapIcon className="h-5 w-5" />
    </div>
    <span className="text-2xl font-semibold tracking-tight text-purple-700">Skillio</span>
  </Link>
);

export const AuthShell = ({ title, subtitle, children, footer, slogan = 'Học tập không giới hạn cùng Skillio.' }) => (
  <div className="min-h-[100dvh] bg-[#FBFBFA] font-sans">
    <div className="mx-auto min-h-[100dvh] max-w-[1400px] overflow-hidden bg-white shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
      <main className="grid min-h-[100dvh] bg-[#FBFBFA]/30 lg:grid-cols-[minmax(0,1fr)_minmax(440px,0.9fr)]">
        <section className="flex items-center justify-center px-6 py-8 lg:px-12">
          <div className="w-full max-w-md">
            <SkillioBrand />
            <div className="mb-6">
              <h1 className="mb-1 text-2xl font-bold tracking-tight text-[#111111] md:text-3xl">{title}</h1>
              <p className="text-xs text-[#787774] leading-relaxed">{subtitle}</p>
            </div>
            <div className="rounded-xl border border-[#EAEAEA] bg-white p-6 md:p-8 shadow-[0_2px_8px_rgba(0,0,0,0.03)]">{children}</div>
            {footer}
          </div>
        </section>

        <aside className="hidden border-l border-[#EAEAEA] bg-white p-6 lg:flex">
          <div className="relative flex min-h-full w-full items-center justify-center overflow-hidden rounded-xl bg-[#F6F4FB] px-12 py-10 lg:px-16 border border-[#EAEAEA]">
            <div className="relative z-10 max-w-md text-left">
              <p className="mb-5 text-[10px] font-bold uppercase tracking-[0.2em] text-purple-600 bg-purple-100/40 px-2.5 py-0.5 rounded border border-purple-200/20 w-fit">Skillio LMS</p>
              <h2 className="text-3xl font-bold leading-tight tracking-tight text-purple-950">{slogan}</h2>
              <p className="mt-5 text-xs leading-relaxed text-[#787774]">
                Một tài khoản cho học tập, giảng dạy và quản lý toàn bộ hành trình phát triển kỹ năng.
              </p>

              {/* Minimalist Feature List */}
              <div className="mt-10 space-y-6 border-t border-[#EAEAEA] pt-8">
                <div className="flex gap-4">
                  <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded bg-purple-50 text-purple-700 border border-purple-100">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-[#111111]">Học tập đa lĩnh vực</h4>
                    <p className="mt-1 text-xs leading-relaxed text-[#787774]">
                      Truy cập hàng trăm khóa học chất lượng cao từ lập trình, thiết kế đến quản trị và ngoại ngữ.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded bg-purple-50 text-purple-700 border border-purple-100">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-[#111111]">Lộ trình được tinh gọn</h4>
                    <p className="mt-1 text-xs leading-relaxed text-[#787774]">
                      Tối ưu hóa thời gian học tập với cấu trúc bài giảng thông minh và công cụ theo dõi tiến trình.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded bg-purple-50 text-purple-700 border border-purple-100">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-[#111111]">Chứng nhận chuẩn đầu ra</h4>
                    <p className="mt-1 text-xs leading-relaxed text-[#787774]">
                      Nhận chứng nhận hoàn thành có giá trị xác thực để bổ sung vào hồ sơ chuyên môn của bạn.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </main>
    </div>
  </div>
);

export const AuthSocialButton = ({ onClick, disabled, loading }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[#EAEAEA] bg-white px-4 py-2.5 text-sm font-semibold text-[#2F3437] transition duration-150 hover:border-purple-300 hover:bg-purple-50 hover:text-purple-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading ? <LoaderIcon className="h-4 w-4 animate-spin text-purple-600" /> : <GoogleIcon className="h-4 w-4" />}
      Tiếp tục với Google
    </button>
  );
};

export const AuthTextField = ({ id, label, icon = 'mail', error, ...props }) => {
  const Icon = icon === 'user' ? UserIcon : MailIcon;

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-semibold text-[#787774]">
        {label}
      </label>
      <div className="relative">
        <Icon className="absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400" strokeWidth="16" />
        <input
          id={id}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          className={`${baseInputClass} ${inputStateClass(error)} pl-10 pr-3.5`}
          {...props}
        />
      </div>
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-xs font-medium text-rose-600">
          {error}
        </p>
      ) : null}
    </div>
  );
};

export const AuthPasswordField = ({ id, label, labelAction, error, showPassword, onTogglePassword, ...props }) => (
  <div>
    {label ? (
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <label htmlFor={id} className="block text-xs font-semibold text-[#787774]">
          {label}
        </label>
        {labelAction}
      </div>
    ) : null}
    <div className="relative">
      <LockIcon className="absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400" />
      <input
        id={id}
        type={showPassword ? 'text' : 'password'}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`${baseInputClass} ${inputStateClass(error)} pl-10 pr-10`}
        {...props}
      />
      <button
        type="button"
        onClick={onTogglePassword}
        disabled={props.disabled}
        className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 transition hover:bg-slate-50 hover:text-purple-600 disabled:cursor-not-allowed disabled:opacity-60"
        aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
      >
        {showPassword ? <EyeOffIcon className="h-4.5 w-4.5" /> : <EyeIcon className="h-4.5 w-4.5" />}
      </button>
    </div>
    {error ? (
      <p id={`${id}-error`} className="mt-1.5 text-xs font-medium text-rose-600">
        {error}
      </p>
    ) : null}
  </div>
);

export const AuthCheckbox = ({ checked, onChange, disabled, children }) => (
  <label className="flex cursor-pointer items-start gap-2 select-none">
    <input type="checkbox" className="sr-only" checked={checked} onChange={onChange} disabled={disabled} />
    <span
      className={`mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded border transition-colors ${
        checked ? 'border-purple-600 bg-purple-600' : 'border-slate-300 bg-white'
      } ${disabled ? 'opacity-60' : ''}`}
    >
      {checked ? <CheckIcon className="h-3 w-3 text-white" /> : null}
    </span>
    <span className="text-xs font-medium text-slate-600 leading-normal">{children}</span>
  </label>
);

export const AuthAlert = ({ children }) => (
  <div className="rounded-lg border border-rose-100 bg-[#FDEBEC] px-4 py-3 text-xs font-semibold text-[#9F2F2D]">
    {children}
  </div>
);

export const AuthSubmitButton = ({ loading, loadingText, children }) => (
  <button
    type="submit"
    disabled={loading}
    className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-purple-700 px-4 py-2.5 text-sm font-semibold text-white transition duration-150 hover:bg-purple-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
  >
    {loading ? (
      <>
        <LoaderIcon className="h-4 w-4 animate-spin text-white" />
        {loadingText}
      </>
    ) : (
      <>
        {children}
        <ArrowRightIcon className="h-4.5 w-4.5" />
      </>
    )}
  </button>
);
