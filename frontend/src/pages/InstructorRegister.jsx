import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import {
  Zap,
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Briefcase,
  ChevronRight,
  ChevronLeft,
  UploadCloud,
  FileText,
  Trash2,
  Check,
  Sparkles,
  AlertCircle,
  Clock,
  ArrowRight,
  ExternalLink,
  Award
} from 'lucide-react';

const Linkedin = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect x="2" y="9" width="4" height="12" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

const Github = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

const SUBJECT_AREAS = [
  { id: 'dev', name: 'Lập trình', bg: 'bg-[#E1F3FE]', text: 'text-[#1F6C9F]', border: 'border-[#1F6C9F]/20' },
  { id: 'design', name: 'Thiết kế', bg: 'bg-[#EDF3EC]', text: 'text-[#346538]', border: 'border-[#346538]/20' },
  { id: 'data', name: 'Dữ liệu', bg: 'bg-[#FDEBEC]', text: 'text-[#9F2F2D]', border: 'border-[#9F2F2D]/20' },
  { id: 'marketing', name: 'Marketing', bg: 'bg-[#FBF3DB]', text: 'text-[#956400]', border: 'border-[#956400]/20' },
  { id: 'language', name: 'Ngoại ngữ', bg: 'bg-[#F5EEFF]', text: 'text-[#6B21A8]', border: 'border-[#6B21A8]/20' },
  { id: 'softskills', name: 'Kỹ năng mềm', bg: 'bg-[#FFF0F6]', text: 'text-[#C1121F]', border: 'border-[#C1121F]/20' }
];

export default function InstructorRegister() {
  const { user, login, register, refreshUser } = useAuth();
  const navigate = useNavigate();

  // Force light theme on this standalone page to prevent dark mode CSS overrides
  useEffect(() => {
    const root = document.documentElement;
    const prevTheme = root.getAttribute('data-theme');
    root.setAttribute('data-theme', 'light');
    return () => {
      if (prevTheme) {
        root.setAttribute('data-theme', prevTheme);
      } else {
        root.removeAttribute('data-theme');
      }
    };
  }, []);

  // Navigation Steps: 
  // If user is already logged in, we skip Step 1 (Account details) and start at Step 2.
  const [step, setStep] = useState(user ? 2 : 1);
  const [authMode, setAuthMode] = useState('register'); // 'register' or 'login'

  // Input states
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [primaryField, setPrimaryField] = useState('');
  const [bio, setBio] = useState('');
  const [cvFile, setCvFile] = useState(null);
  const [cvUploading, setCvUploading] = useState(false);
  const [cvProgress, setCvProgress] = useState(0);
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [motivation, setMotivation] = useState('');
  const [agreeCommitment, setAgreeCommitment] = useState(false);

  // Error & loading states
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  // Sync state if user logs in during the flow
  useEffect(() => {
    if (user && step === 1) {
      setStep(2);
    }
  }, [user, step]);

  // Handle Drag and Drop for CV Upload
  const [dragActive, setDragActive] = useState(false);
  
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file) => {
    // Validate file type
    const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!validTypes.includes(file.type)) {
      setErrors(prev => ({ ...prev, cv: 'Chỉ chấp nhận file PDF hoặc Word (.doc, .docx)' }));
      return;
    }

    // Validate size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setErrors(prev => ({ ...prev, cv: 'Dung lượng file không được vượt quá 10MB' }));
      return;
    }

    setErrors(prev => {
      const copy = { ...prev };
      delete copy.cv;
      return copy;
    });

    setCvFile(file);
    setCvUploading(true);
    setCvProgress(0);

    // Simulate upload progress
    const interval = setInterval(() => {
      setCvProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setCvUploading(false);
          return 100;
        }
        return prev + 10;
      });
    }, 80);
  };

  const removeCvFile = () => {
    setCvFile(null);
    setCvProgress(0);
    setCvUploading(false);
  };

  // Form Validation
  const validateStep = (currentStep) => {
    const newErrors = {};

    if (currentStep === 1) {
      if (authMode === 'register') {
        if (!fullName.trim()) newErrors.fullName = 'Vui lòng nhập họ và tên';
        if (!email.trim()) {
          newErrors.email = 'Vui lòng nhập email';
        } else if (!/\S+@\S+\.\S+/.test(email)) {
          newErrors.email = 'Email không đúng định dạng';
        }
        if (!password) {
          newErrors.password = 'Vui lòng nhập mật khẩu';
        } else if (password.length < 6) {
          newErrors.password = 'Mật khẩu phải tối thiểu 6 ký tự';
        }
      } else {
        if (!email.trim()) newErrors.email = 'Vui lòng nhập email';
        if (!password) newErrors.password = 'Vui lòng nhập mật khẩu';
      }
    }

    if (currentStep === 2) {
      if (!primaryField) newErrors.primaryField = 'Vui lòng chọn lĩnh vực giảng dạy chính';
      if (!bio.trim()) {
        newErrors.bio = 'Vui lòng điền tiểu sử ngắn';
      } else if (bio.trim().length < 20) {
        newErrors.bio = 'Tiểu sử cần có độ dài tối thiểu 20 ký tự';
      }
    }

    if (currentStep === 3) {
      if (!cvFile) newErrors.cv = 'Vui lòng tải lên CV hoặc hồ sơ năng lực của bạn';
      if (linkedinUrl && !/^(https?:\/\/)?(www\.)?linkedin\.com\/.*$/.test(linkedinUrl)) {
        newErrors.linkedinUrl = 'Đường dẫn LinkedIn không hợp lệ';
      }
    }

    if (currentStep === 4) {
      if (!motivation.trim()) {
        newErrors.motivation = 'Vui lòng điền động lực tham gia';
      } else if (motivation.trim().length < 20) {
        newErrors.motivation = 'Câu trả lời cần có độ dài tối thiểu 20 ký tự';
      }
      if (!agreeCommitment) {
        newErrors.agreeCommitment = 'Bạn cần đồng ý với các điều khoản cam kết';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = async () => {
    if (!validateStep(step)) return;

    // Execute API calls for Step 1 (Authentication)
    if (step === 1) {
      setLoading(true);
      try {
        if (authMode === 'register') {
          await register(fullName, email, password);
        } else {
          await login(email, password);
        }
        // Success: AuthContext updates state, automatically moving to Step 2
        setStep(2);
      } catch (err) {
        setErrors({
          api: err.response?.data?.message || 'Xác thực thất bại. Vui lòng kiểm tra lại thông tin.'
        });
      } finally {
        setLoading(false);
      }
      return;
    }

    // Go to next step
    setStep(prev => prev + 1);
  };

  const handleBack = () => {
    setStep(prev => prev - 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateStep(4)) return;

    setLoading(true);
    try {
      // Structure the application details
      const applicationData = {
        status: 'PENDING',
        field: primaryField,
        fieldName: SUBJECT_AREAS.find(s => s.id === primaryField)?.name || primaryField,
        bio: bio.trim(),
        cvName: cvFile.name,
        cvSize: (cvFile.size / (1024 * 1024)).toFixed(2) + ' MB',
        linkedinUrl: linkedinUrl.trim(),
        portfolioUrl: portfolioUrl.trim(),
        motivation: motivation.trim(),
        submittedAt: new Date().toISOString()
      };

      // We persist this application in the user's settings field in DB.
      // Settings endpoint in C# backend takes: Name, Phone, Bio, Settings
      const updatedSettings = {
        ...(user.settings || {}),
        instructorApplication: applicationData
      };

      // Call API PUT /api/user/me to save settings and bio
      await axios.put('/api/user/me', {
        name: user.name,
        bio: bio.trim(),
        settings: updatedSettings
      });

      // Update local user state
      await refreshUser();
      setStep(5); // Success step
    } catch (err) {
      setErrors({
        api: err.response?.data?.message || 'Có lỗi xảy ra khi gửi hồ sơ. Vui lòng thử lại.'
      });
    } finally {
      setLoading(false);
    }
  };

  // Developer Cheat: Immediately approve application and switch role
  const handleDemoApprove = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const applicationData = user.settings?.instructorApplication || {
        status: 'APPROVED',
        field: 'dev',
        fieldName: 'Lập trình',
        bio: 'Giảng viên demo được phê duyệt',
        cvName: 'cv_profile.pdf',
        cvSize: '1.2MB',
        submittedAt: new Date().toISOString()
      };

      const approvedApplication = {
        ...applicationData,
        status: 'APPROVED',
        approvedAt: new Date().toISOString()
      };

      const updatedSettings = {
        ...(user.settings || {}),
        instructorApplication: approvedApplication
      };

      // Save application state as APPROVED
      await axios.put('/api/user/me', {
        name: user.name,
        settings: updatedSettings
      });

      // Update role locally in localStorage to switch navigation layout.
      // Since changing role in DB is protected (admin only), this local update 
      // allows the user to immediately view the Instructor dashboard.
      const localUser = JSON.parse(localStorage.getItem('user') || '{}');
      localUser.role = 'INSTRUCTOR';
      localUser.settings = updatedSettings;
      localStorage.setItem('user', JSON.stringify(localUser));

      // Reload the application to apply the role changes in AuthContext initialization
      window.location.href = '/instructor/dashboard';
    } catch (err) {
      alert('Không thể thực hiện phê duyệt nhanh. Lỗi: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Check if user has already submitted an application
  const existingApp = user?.settings?.instructorApplication;

  // Render Status Dashboard if application is already pending/approved
  if (existingApp && step !== 5) {
    const isPending = existingApp.status === 'PENDING';
    const isApproved = existingApp.status === 'APPROVED';

    return (
      <div className="min-h-screen flex flex-col lg:flex-row" style={{ backgroundColor: '#F7F6F3' }}>
        {/* Left column - Branding */}
        <div className="lg:w-[45%] p-8 lg:p-16 flex flex-col justify-between text-white relative overflow-hidden" style={{ backgroundColor: '#0F172A' }}>
          <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(circle at center, rgba(126,34,206,0.1), transparent 70%)' }} />
          
          <div className="flex items-center gap-2 cursor-pointer z-10" onClick={() => navigate('/')}>
            <div className="w-9 h-9 bg-purple-600 rounded-xl flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight">Skillio</span>
          </div>

          <div className="space-y-6 max-w-md my-12 lg:my-0 z-10">
            <span className="inline-block px-3 py-1 text-[10px] font-mono uppercase tracking-[0.18em] rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20">
              Trạng thái hồ sơ
            </span>
            <h1 className="text-3xl lg:text-4xl font-semibold tracking-tighter leading-tight font-sans text-slate-100">
              Hành trình giảng dạy <br/> đang bắt đầu.
            </h1>
            <p className="text-sm text-slate-400 leading-relaxed">
              Skillio đang kiểm duyệt hồ sơ năng lực của bạn. Quy trình xét duyệt thường diễn ra trong vòng 2-3 ngày làm việc.
            </p>
          </div>

          <div className="text-xs text-slate-500 z-10">
            © 2026 Skillio Inc. Môi trường giảng dạy tối giản & trực quan.
          </div>
        </div>

        {/* Right column - Status Details */}
        <div className="flex-1 flex items-center justify-center p-6 lg:p-16" style={{ backgroundColor: '#FBFBFA' }}>
          <div className="w-full max-w-xl border border-[#EAEAEA] rounded-xl p-8 shadow-sm" style={{ backgroundColor: '#FFFFFF' }}>
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-[#EAEAEA]">
              <div>
                <p className="text-xs font-mono text-[#787774] uppercase tracking-wider">Hồ sơ ứng tuyển</p>
                <h2 className="text-xl font-bold text-[#111111] mt-1">Giảng viên Skillio</h2>
              </div>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
                isApproved 
                  ? 'bg-[#EDF3EC] text-[#346538]' 
                  : 'bg-[#FBF3DB] text-[#956400]'
              }`}>
                {isApproved ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    Đã duyệt
                  </>
                ) : (
                  <>
                    <Clock className="w-3.5 h-3.5" />
                    Đang chờ duyệt
                  </>
                )}
              </span>
            </div>

            {/* Timeline progress line */}
            <div className="mb-10">
              <p className="text-xs font-medium text-[#787774] mb-6">TIẾN TRÌNH XÉT DUYỆT</p>
              <div className="relative">
                {/* Background bar */}
                <div className="absolute top-1/2 left-0 w-full h-1 bg-[#EAEAEA] -translate-y-1/2 rounded-full" />
                {/* Foreground progress */}
                <div className={`absolute top-1/2 left-0 h-1 bg-purple-600 -translate-y-1/2 rounded-full transition-all duration-700 ${
                  isApproved ? 'w-full' : 'w-1/2'
                }`} />

                {/* Steps */}
                <div className="relative flex justify-between">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-purple-600 border-4 border-white flex items-center justify-center text-white z-10 shadow-sm">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-medium text-[#111111] mt-2 bg-[#FBFBFA] px-1">Đã nộp</span>
                    <span className="text-[10px] text-[#787774] mt-0.5">
                      {existingApp.submittedAt ? new Date(existingApp.submittedAt).toLocaleDateString('vi-VN') : ''}
                    </span>
                  </div>

                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white z-10 border-4 border-white shadow-sm ${
                      isPending ? 'bg-amber-500 animate-pulse' : 'bg-purple-600'
                    }`}>
                      {isApproved ? <Check className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                    </div>
                    <span className="text-xs font-medium text-[#111111] mt-2 bg-[#FBFBFA] px-1">Đang duyệt</span>
                    <span className="text-[10px] text-[#787774] mt-0.5">2 - 3 ngày</span>
                  </div>

                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white z-10 border-4 border-white shadow-sm ${
                      isApproved ? 'bg-purple-600' : 'bg-[#EAEAEA] text-[#787774]'
                    }`}>
                      <Award className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-medium text-[#111111] mt-2 bg-[#FBFBFA] px-1">Hoàn thành</span>
                    <span className="text-[10px] text-[#787774] mt-0.5">Kích hoạt</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Application Info Card */}
            <div className="space-y-4 border border-[#EAEAEA] bg-[#FBFBFA] rounded-xl p-5 mb-8 text-sm text-[#111111]">
              <div className="grid grid-cols-3 gap-2">
                <span className="text-[#787774]">Lĩnh vực:</span>
                <span className="col-span-2 font-medium">{existingApp.fieldName}</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <span className="text-[#787774]">Hồ sơ tải lên:</span>
                <span className="col-span-2 flex items-center gap-1.5 font-medium text-purple-700">
                  <FileText className="w-4 h-4 shrink-0" />
                  {existingApp.cvName}
                </span>
              </div>
              {existingApp.linkedinUrl && (
                <div className="grid grid-cols-3 gap-2">
                  <span className="text-[#787774]">LinkedIn:</span>
                  <a href={existingApp.linkedinUrl} target="_blank" rel="noreferrer" className="col-span-2 flex items-center gap-1 text-purple-600 hover:underline">
                    Xem hồ sơ <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
              <div className="pt-3 border-t border-[#EAEAEA] flex flex-col gap-1">
                <span className="text-[#787774] text-xs uppercase font-mono tracking-wider">Tiểu sử (Bio):</span>
                <p className="text-[#111111] italic leading-relaxed mt-1 text-xs">{existingApp.bio}</p>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => navigate('/')}
                className="flex-1 bg-white border border-[#EAEAEA] hover:bg-[#F7F6F3] text-[#111111] py-2.5 rounded-lg text-sm font-medium transition cursor-pointer"
              >
                Trở về Trang chủ
              </button>
              
              {isPending && (
                <button
                  onClick={handleDemoApprove}
                  disabled={loading}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2.5 rounded-lg text-sm font-medium transition shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {loading ? 'Đang kích hoạt...' : 'Phê duyệt nhanh (Demo)'}
                </button>
              )}
            </div>

            {isApproved && (
              <button
                onClick={() => navigate('/instructor/dashboard')}
                className="w-full mt-4 bg-purple-600 hover:bg-purple-700 text-white py-2.5 rounded-lg text-sm font-semibold transition flex items-center justify-center gap-2 cursor-pointer"
              >
                Vào Dashboard Giảng viên
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // --- Step Content Render Helpers ---

  // Step 1: Account setup (Only shown for guest/unlogged users)
  const renderStep1 = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#111111] tracking-tight">
          {authMode === 'register' ? 'Tạo tài khoản Skillio' : 'Đăng nhập vào Skillio'}
        </h2>
        <p className="text-sm text-[#787774] mt-1.5">
          {authMode === 'register' 
            ? 'Đăng ký tài khoản học viên/giảng viên để bắt đầu nộp hồ sơ.' 
            : 'Đăng nhập bằng tài khoản sẵn có của bạn để tiến hành ứng tuyển.'}
        </p>
      </div>

      <div className="space-y-4">
        {errors.api && (
          <div className="p-3.5 bg-[#FDEBEC] border border-[#9F2F2D]/10 text-[#9F2F2D] text-sm rounded-lg flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="font-medium">{errors.api}</span>
          </div>
        )}

        {authMode === 'register' && (
          <div>
            <label className="text-xs font-mono text-[#787774] uppercase tracking-wider mb-1.5 block">
              Họ và tên
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Nguyễn Văn A"
                className={`w-full bg-white border ${
                  errors.fullName ? 'border-[#9F2F2D] focus:border-[#9F2F2D]' : 'border-[#EAEAEA] focus:border-purple-500'
                } rounded-lg pl-9 pr-4 py-2 text-sm outline-none transition-colors`}
              />
            </div>
            {errors.fullName && (
              <p className="text-xs text-[#9F2F2D] mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.fullName}
              </p>
            )}
          </div>
        )}

        <div>
          <label className="text-xs font-mono text-[#787774] uppercase tracking-wider mb-1.5 block">
            Địa chỉ Email
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@domain.com"
              className={`w-full bg-white border ${
                errors.email ? 'border-[#9F2F2D] focus:border-[#9F2F2D]' : 'border-[#EAEAEA] focus:border-purple-500'
              } rounded-lg pl-9 pr-4 py-2 text-sm outline-none transition-colors`}
            />
          </div>
          {errors.email && (
            <p className="text-xs text-[#9F2F2D] mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {errors.email}
            </p>
          )}
        </div>

        <div>
          <label className="text-xs font-mono text-[#787774] uppercase tracking-wider mb-1.5 block">
            Mật khẩu
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className={`w-full bg-white border ${
                errors.password ? 'border-[#9F2F2D] focus:border-[#9F2F2D]' : 'border-[#EAEAEA] focus:border-purple-500'
              } rounded-lg pl-9 pr-10 py-2 text-sm outline-none transition-colors`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.password && (
            <p className="text-xs text-[#9F2F2D] mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {errors.password}
            </p>
          )}
        </div>
      </div>

      <div className="pt-2 text-center">
        <p className="text-sm text-[#787774]">
          {authMode === 'register' ? 'Đã có tài khoản?' : 'Chưa có tài khoản?'}{' '}
          <button
            type="button"
            onClick={() => {
              setAuthMode(authMode === 'register' ? 'login' : 'register');
              setErrors({});
            }}
            className="text-purple-700 hover:underline font-semibold cursor-pointer"
          >
            {authMode === 'register' ? 'Đăng nhập ngay' : 'Đăng ký thành viên'}
          </button>
        </p>
      </div>
    </div>
  );

  // Step 2: Expertise & Bio
  const renderStep2 = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#111111] tracking-tight">Chuyên môn giảng dạy</h2>
        <p className="text-sm text-[#787774] mt-1.5">
          Chọn lĩnh vực chuyên sâu của bạn và mô tả ngắn gọn về hành trình làm việc.
        </p>
      </div>

      <div className="space-y-5">
        <div>
          <label className="text-xs font-mono text-[#787774] uppercase tracking-wider mb-2.5 block">
            Lĩnh vực giảng dạy chính
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            {SUBJECT_AREAS.map((area) => {
              const isActive = primaryField === area.id;
              return (
                <button
                  key={area.id}
                  type="button"
                  onClick={() => setPrimaryField(area.id)}
                  className={`px-4 py-3 rounded-lg border text-left text-sm font-medium transition cursor-pointer ${
                    isActive 
                      ? `${area.bg} ${area.text} ${area.border} ring-1 ring-purple-300` 
                      : 'bg-white border-[#EAEAEA] text-[#111111] hover:bg-[#F7F6F3]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>{area.name}</span>
                    {isActive && <Check className="w-4 h-4 shrink-0" />}
                  </div>
                </button>
              );
            })}
          </div>
          {errors.primaryField && (
            <p className="text-xs text-[#9F2F2D] mt-2 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {errors.primaryField}
            </p>
          )}
        </div>

        <div>
          <label className="text-xs font-mono text-[#787774] uppercase tracking-wider mb-1.5 block">
            Tiểu sử ngắn (Bio)
          </label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={4}
            placeholder="Tóm tắt về kinh nghiệm chuyên môn, số năm làm việc, và các dự án tiêu biểu của bạn..."
            className={`w-full bg-white border ${
              errors.bio ? 'border-[#9F2F2D] focus:border-[#9F2F2D]' : 'border-[#EAEAEA] focus:border-purple-500'
            } rounded-lg px-4 py-2.5 text-sm outline-none transition-colors resize-none leading-relaxed`}
          />
          <div className="flex justify-between text-xs text-[#787774] mt-1">
            <span>Độ dài đề xuất: 50 - 200 từ.</span>
            <span>Ký tự: {bio.length}</span>
          </div>
          {errors.bio && (
            <p className="text-xs text-[#9F2F2D] mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {errors.bio}
            </p>
          )}
        </div>
      </div>
    </div>
  );

  // Step 3: Credentials (CV & social links)
  const renderStep3 = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#111111] tracking-tight">Hồ sơ năng lực</h2>
        <p className="text-sm text-[#787774] mt-1.5">
          Tải lên CV (sơ yếu lý lịch) và cung cấp đường dẫn hồ sơ chuyên nghiệp của bạn.
        </p>
      </div>

      <div className="space-y-5">
        {/* Drag and Drop Zone */}
        <div>
          <label className="text-xs font-mono text-[#787774] uppercase tracking-wider mb-2 block">
            CV hoặc Portfolio (PDF, Word)
          </label>
          
          {!cvFile ? (
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              className={`border-2 border-dashed ${
                dragActive ? 'border-purple-500 bg-purple-50/20' : 'border-[#EAEAEA] hover:border-purple-400'
              } rounded-lg p-6 text-center transition-colors cursor-pointer relative bg-white`}
            >
              <input
                type="file"
                id="cv-upload"
                onChange={handleFileChange}
                accept=".pdf,.doc,.docx"
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <UploadCloud className="w-8 h-8 text-slate-400 mx-auto mb-3" />
              <p className="text-sm font-semibold text-[#111111]">Kéo thả file vào đây hoặc click để duyệt</p>
              <p className="text-xs text-[#787774] mt-1">Hỗ trợ PDF, DOC, DOCX. Dung lượng tối đa 10MB.</p>
            </div>
          ) : (
            <div className="border border-[#EAEAEA] rounded-lg p-4 bg-white flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 text-purple-700" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#111111] truncate">{cvFile.name}</p>
                  <p className="text-xs text-[#787774] mt-0.5">
                    {(cvFile.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>
              </div>

              {cvUploading ? (
                <div className="flex items-center gap-3">
                  <span className="text-xs text-[#787774] font-medium">{cvProgress}%</span>
                  <div className="w-12 h-1 bg-[#EAEAEA] rounded-full overflow-hidden">
                    <div className="h-full bg-purple-600 transition-all duration-100" style={{ width: `${cvProgress}%` }} />
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={removeCvFile}
                  className="text-slate-400 hover:text-red-500 p-2 transition cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          {errors.cv && (
            <p className="text-xs text-[#9F2F2D] mt-2 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {errors.cv}
            </p>
          )}
        </div>

        {/* Links */}
        <div className="space-y-4">
          <div>
            <label className="text-xs font-mono text-[#787774] uppercase tracking-wider mb-1.5 block">
              Liên kết LinkedIn (Tùy chọn)
            </label>
            <div className="relative">
              <Linkedin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="url"
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
                placeholder="https://linkedin.com/in/username"
                className={`w-full bg-white border ${
                  errors.linkedinUrl ? 'border-[#9F2F2D] focus:border-[#9F2F2D]' : 'border-[#EAEAEA] focus:border-purple-500'
                } rounded-lg pl-9 pr-4 py-2 text-sm outline-none transition-colors`}
              />
            </div>
            {errors.linkedinUrl && (
              <p className="text-xs text-[#9F2F2D] mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.linkedinUrl}
              </p>
            )}
          </div>

          <div>
            <label className="text-xs font-mono text-[#787774] uppercase tracking-wider mb-1.5 block">
              GitHub hoặc Behance/Dribbble Link (Tùy chọn)
            </label>
            <div className="relative">
              <Github className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="url"
                value={portfolioUrl}
                onChange={(e) => setPortfolioUrl(e.target.value)}
                placeholder="https://github.com/username hoặc link portfolio..."
                className="w-full bg-white border border-[#EAEAEA] rounded-lg pl-9 pr-4 py-2 text-sm outline-none focus:border-purple-500 transition-colors"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Step 4: Motivation & Commitment
  const renderStep4 = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#111111] tracking-tight">Động lực & Cam kết</h2>
        <p className="text-sm text-[#787774] mt-1.5">
          Chia sẻ lý do bạn chọn Skillio và đồng ý với các quy tắc cộng đồng.
        </p>
      </div>

      <div className="space-y-5">
        <div>
          <label className="text-xs font-mono text-[#787774] uppercase tracking-wider mb-1.5 block">
            Tại sao bạn muốn tham gia giảng dạy tại Skillio?
          </label>
          <textarea
            value={motivation}
            onChange={(e) => setMotivation(e.target.value)}
            rows={4}
            placeholder="Hãy chia sẻ định hướng bài học, phương pháp tiếp cận của bạn cũng như lý do mong muốn đồng hành cùng chúng tôi..."
            className={`w-full bg-white border ${
              errors.motivation ? 'border-[#9F2F2D] focus:border-[#9F2F2D]' : 'border-[#EAEAEA] focus:border-purple-500'
            } rounded-lg px-4 py-2.5 text-sm outline-none transition-colors resize-none leading-relaxed`}
          />
          {errors.motivation && (
            <p className="text-xs text-[#9F2F2D] mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {errors.motivation}
            </p>
          )}
        </div>

        {/* Commitment Checkbox */}
        <label className="flex items-start gap-2.5 cursor-pointer bg-white border border-[#EAEAEA] rounded-lg p-4 transition hover:bg-[#F9F9F8]">
          <input
            type="checkbox"
            className="sr-only peer"
            checked={agreeCommitment}
            onChange={() => setAgreeCommitment(!agreeCommitment)}
          />
          <div
            className={`w-4 h-4 mt-0.5 rounded border flex items-center justify-center shrink-0 transition-colors ${
              agreeCommitment
                ? 'bg-purple-600 border-purple-600'
                : 'border-slate-300'
            }`}
          >
            {agreeCommitment && (
              <Check className="w-3 h-3 text-white" strokeWidth={3} />
            )}
          </div>
          <div className="text-xs text-[#111111] leading-relaxed">
            <p className="font-semibold">Tôi cam kết đáp ứng Quy chuẩn chất lượng giảng viên:</p>
            <ul className="list-disc pl-4 mt-1.5 space-y-1 text-[#787774]">
              <li>Cung cấp tài liệu khóa học và bài học được bản quyền hóa đầy đủ.</li>
              <li>Hỗ trợ giải đáp thắc mắc học viên chuyên nghiệp, kịp thời.</li>
              <li>Tham gia xét duyệt và cập nhật nội dung chất lượng cao định kỳ.</li>
            </ul>
          </div>
        </label>
        {errors.agreeCommitment && (
          <p className="text-xs text-[#9F2F2D] mt-1 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {errors.agreeCommitment}
          </p>
        )}
      </div>
    </div>
  );

  // Step 5: Success screen
  const renderStep5 = () => (
    <div className="text-center py-6 space-y-6">
      <div className="w-16 h-16 bg-[#EDF3EC] rounded-full flex items-center justify-center mx-auto text-[#346538] border border-[#346538]/10 animate-fade-in-up">
        <Check className="w-8 h-8" strokeWidth={2.5} />
      </div>

      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-[#111111] tracking-tight">Hồ sơ đã gửi thành công!</h2>
        <p className="text-sm text-[#787774] max-w-sm mx-auto leading-relaxed">
          Cảm ơn bạn đã nộp hồ sơ đăng ký giảng viên tại Skillio. Chúng tôi sẽ tiến hành thẩm định và phản hồi trong thời gian sớm nhất.
        </p>
      </div>

      <div className="border border-[#EAEAEA] bg-[#FBFBFA] rounded-xl p-5 text-sm text-left max-w-md mx-auto space-y-3">
        <div className="flex justify-between">
          <span className="text-[#787774]">Ứng viên:</span>
          <span className="font-medium text-[#111111]">{user?.name || fullName}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#787774]">Email liên hệ:</span>
          <span className="font-medium text-[#111111]">{user?.email || email}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#787774]">Chuyên ngành:</span>
          <span className="font-medium text-[#111111]">
            {SUBJECT_AREAS.find(s => s.id === primaryField)?.name || primaryField}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#787774]">Trạng thái:</span>
          <span className="inline-flex items-center gap-1 text-xs text-[#956400] font-medium bg-[#FBF3DB] px-2.5 py-0.5 rounded-full">
            <Clock className="w-3 h-3" />
            Chờ xét duyệt
          </span>
        </div>
      </div>

      <div className="pt-4 flex flex-col gap-3 max-w-md mx-auto">
        <button
          onClick={() => navigate('/')}
          className="w-full bg-[#111111] hover:bg-[#333333] text-white py-2.5 rounded-lg text-sm font-semibold transition cursor-pointer"
        >
          Trở về Trang chủ
        </button>

        {/* Developer sandbox approve */}
        <div className="border border-dashed border-purple-200 rounded-xl p-4 text-xs" style={{ backgroundColor: 'rgba(250,245,255,0.1)' }}>
          <p className="font-semibold text-purple-700 mb-2">Sandbox Kiểm Thử (Developer Quick Approve)</p>
          <p className="text-slate-500 mb-3 leading-relaxed">
            Bạn có thể bỏ qua thời gian chờ duyệt và tự động nâng cấp tài khoản của mình thành giảng viên ngay lập tức để kiểm tra Dashboard.
          </p>
          <button
            onClick={handleDemoApprove}
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-lg font-medium transition cursor-pointer"
          >
            {loading ? 'Đang cập nhật vai trò...' : 'Kích hoạt ngay vai trò Giảng viên (Demo)'}
          </button>
        </div>
      </div>
    </div>
  );

  // Master steps list
  const stepsList = [
    { title: 'Tài khoản', desc: 'Đăng ký/Đăng nhập' },
    { title: 'Chuyên môn', desc: 'Chọn lĩnh vực' },
    { title: 'Hồ sơ năng lực', desc: 'Upload CV' },
    { title: 'Động lực', desc: 'Cam kết dạy học' },
    { title: 'Hoàn tất', desc: 'Gửi thành công' }
  ];

  return (
    <div className="min-h-screen flex flex-col lg:flex-row" style={{ backgroundColor: '#F7F6F3' }}>
      {/* LEFT COLUMN - Inspiring messaging & Progress Timeline */}
      <div className="lg:w-[45%] p-8 lg:p-16 flex flex-col justify-between text-white relative overflow-hidden" style={{ backgroundColor: '#0F172A' }}>
        {/* Ambient slow animation light source */}
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full blur-[120px] pointer-events-none" style={{ backgroundColor: 'rgba(168,85,247,0.05)' }} />
        <div className="absolute -bottom-40 -left-20 w-96 h-96 rounded-full blur-[120px] pointer-events-none" style={{ backgroundColor: 'rgba(99,102,241,0.05)' }} />

        <div className="flex items-center gap-2 cursor-pointer z-10" onClick={() => navigate('/')}>
          <div className="w-9 h-9 bg-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-900/30">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight">Skillio</span>
        </div>

        <div className="my-12 lg:my-0 space-y-12 z-10">
          <div className="space-y-4 max-w-sm">
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-purple-400 block">
              Dành cho Mentor
            </span>
            <h1 className="text-3xl lg:text-4xl font-semibold tracking-tighter leading-tight font-sans text-slate-100">
              Trở thành người <br/>truyền cảm hứng tại Skillio.
            </h1>
            <p className="text-sm text-slate-400 leading-relaxed max-w-[32ch]">
              Chia sẻ kiến thức chuyên môn của bạn, định hình thế hệ tương lai và tạo dựng nguồn thu nhập thụ động bền vững cùng nền tảng Skillio.
            </p>
          </div>

          {/* Stepper Timeline UI */}
          <div className="space-y-6 max-w-xs">
            {stepsList.map((s, idx) => {
              // Adjust indices. If user is logged in, their Step 1 is done and they start at Step 2.
              const stepNumber = idx + 1;
              const isCurrent = step === stepNumber;
              const isPast = step > stepNumber;
              
              // If user is already logged in, Step 1 is marked past
              const finalIsPast = user && stepNumber === 1 ? true : isPast;

              return (
                <div key={idx} className="flex gap-4 items-start relative group">
                  {/* Vertical line connecting steps */}
                  {idx < stepsList.length - 1 && (
                    <div 
                      className="absolute left-3 top-7 bottom-[-16px] w-0.5"
                      style={{ backgroundColor: step > stepNumber ? '#9333ea' : '#1e293b' }}
                    />
                  )}

                  <div 
                    className={`rounded-full flex items-center justify-center text-[10px] font-mono font-bold border shrink-0 z-10 transition-colors ${
                      isCurrent 
                        ? 'text-white border-purple-500' 
                        : finalIsPast 
                          ? 'text-purple-400' 
                          : 'text-slate-500'
                    }`}
                    style={{
                      width: '26px',
                      height: '26px',
                      backgroundColor: isCurrent ? '#9333ea' : finalIsPast ? '#1e293b' : '#0f172a',
                      borderColor: isCurrent ? '#a855f7' : finalIsPast ? 'rgba(168,139,250,0.3)' : '#1e293b'
                    }}
                  >
                    {finalIsPast ? <Check className="w-3 h-3 text-purple-400" /> : stepNumber}
                  </div>

                  <div className="min-w-0">
                    <p className={`text-xs font-semibold ${
                      isCurrent ? 'text-white' : finalIsPast ? 'text-slate-300' : 'text-slate-500'
                    }`}>
                      {s.title}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5 truncate">{s.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="text-xs text-slate-500 z-10">
          © 2026 Skillio Inc. Minimalist UI Directive.
        </div>
      </div>

      {/* RIGHT COLUMN - Registration dynamic form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-16" style={{ backgroundColor: '#FBFBFA' }}>
        <div className="w-full max-w-xl border border-[#EAEAEA] rounded-xl p-8 shadow-sm" style={{ backgroundColor: '#FFFFFF' }}>
          <form className="space-y-8" onSubmit={(e) => e.preventDefault()}>
            
            {/* Step Content Render */}
            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}
            {step === 4 && renderStep4()}
            {step === 5 && renderStep5()}

            {/* API Response Failure Alert */}
            {errors.api && step > 1 && (
              <div className="p-3 bg-[#FDEBEC] border border-[#9F2F2D]/10 text-[#9F2F2D] text-xs rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span className="font-semibold">{errors.api}</span>
              </div>
            )}

            {/* Stepper Footer Action Buttons */}
            {step < 5 && (
              <div className="flex items-center justify-between pt-6 border-t border-[#EAEAEA]">
                {/* Back Button */}
                <div>
                  {step > 1 && !(user && step === 2) && (
                    <button
                      type="button"
                      onClick={handleBack}
                      disabled={loading}
                      className="inline-flex items-center gap-1 text-xs font-mono uppercase tracking-wider text-[#787774] hover:text-[#111111] transition py-2 cursor-pointer disabled:opacity-50"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Quay lại
                    </button>
                  )}
                </div>

                {/* Next / Submit Button */}
                <div>
                  {step < 4 ? (
                    <button
                      type="button"
                      onClick={handleNext}
                      disabled={loading || cvUploading}
                      className="bg-[#111111] hover:bg-[#333333] text-white px-5 py-2.5 rounded-lg text-xs font-bold font-mono uppercase tracking-wider inline-flex items-center gap-1.5 transition cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Đang kiểm tra...' : 'Tiếp tục'}
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={loading}
                      className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-lg text-xs font-bold font-mono uppercase tracking-wider inline-flex items-center gap-1.5 transition cursor-pointer shadow-sm disabled:opacity-50"
                    >
                      {loading ? 'Đang gửi...' : 'Gửi hồ sơ'}
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            )}

          </form>
        </div>
      </div>
    </div>
  );
}
