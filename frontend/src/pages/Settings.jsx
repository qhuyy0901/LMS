import { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Bell,
  Check,
  CreditCard,
  Download,
  Eye,
  EyeOff,
  GraduationCap,
  KeyRound,
  Landmark,
  LogOut,
  BanknoteArrowDown,
  ReceiptText,
  RotateCcw,
  Shield,
  Upload,
  User,
  Wallet,
  X,
} from 'lucide-react';
import axios from 'axios';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import UserAvatar from '../components/UserAvatar';
import { getInstructorWallet } from '../api/instructorWalletApi';

const defaultSettings = {
  theme: 'light',
  language: 'vi',
  timezone: 'Asia/Ho_Chi_Minh',
  emailDigest: true,
  courseReminders: true,
  promotionEmails: false,
  autoPlayVideo: true,
  showSubtitles: true,
  videoQuality: 'auto',
};

const tabs = [
  { id: 'profile', icon: User, label: 'Hồ sơ cá nhân' },
  { id: 'security', icon: Shield, label: 'Đổi mật khẩu' },
  { id: 'notifications', icon: Bell, label: 'Thông báo' },
  { id: 'learning', icon: GraduationCap, label: 'Học tập' },
  { id: 'billing', icon: CreditCard, label: 'Ví & giao dịch' },
  { id: 'danger', icon: AlertTriangle, label: 'Dữ liệu & tài khoản', danger: true },
];

const normalizeTab = (value) => {
  if (value === 'account' || value === 'settings') {
    return 'notifications';
  }
  if (value === 'password') {
    return 'security';
  }
  return tabs.some((item) => item.id === value) ? value : 'profile';
};

const formatCurrency = (value = 0) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);

const Toggle = ({ checked, onChange }) => (
  <button
    type="button"
    aria-pressed={checked}
    onClick={() => onChange(!checked)}
    className={`relative h-6 w-11 rounded-full transition-colors ${checked ? 'bg-purple-600' : 'bg-slate-200'}`}
  >
    <span
      className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
        checked ? 'translate-x-5' : ''
      }`}
    />
  </button>
);

const FieldLabel = ({ children }) => (
  <label className="mb-1.5 block text-xs font-semibold text-slate-500">{children}</label>
);

const StatusMessage = ({ message }) => {
  if (!message?.text) return null;

  return (
    <div
      className={`mb-4 rounded-xl border px-4 py-3 text-sm ${
        message.type === 'error'
          ? 'border-rose-100 bg-rose-50 text-rose-700'
          : 'border-emerald-100 bg-emerald-50 text-emerald-700'
      }`}
    >
      {message.text}
    </div>
  );
};

const Settings = () => {
  const { user, logout, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const fileInputRef = useRef(null);

  const [activeTab, setActiveTab] = useState(() => normalizeTab(searchParams.get('tab')));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [message, setMessage] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [walletProfile, setWalletProfile] = useState(null);
  const [walletHistory, setWalletHistory] = useState([]);
  const [revenueProfile, setRevenueProfile] = useState(null);
  const [payoutAccount, setPayoutAccount] = useState({
    bankName: '',
    accountNumber: '',
    accountHolder: '',
  });
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showBalance, setShowBalance] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawForm, setWithdrawForm] = useState({ soTien: '', ghiChu: '' });
  const [googleMeetLink, setGoogleMeetLink] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    bio: '',
    settings: defaultSettings,
  });

  const displayName = formData.name || user?.name || 'Học viên';
  const isInstructor = user?.role === 'INSTRUCTOR';
  const visibleTabs = isInstructor ? tabs.filter((item) => item.id !== 'billing' && item.id !== 'notifications') : tabs;

  useEffect(() => {
    setActiveTab(normalizeTab(searchParams.get('tab')));
  }, [searchParams]);

  useEffect(() => {
    if (isInstructor && (activeTab === 'billing' || activeTab === 'notifications')) {
      setActiveTab('profile');
      setSearchParams({}, { replace: true });
    }
  }, [activeTab, isInstructor, setSearchParams]);

  const selectTab = (tabId) => {
    setActiveTab(tabId);
    setMessage(null);
    setSearchParams(tabId === 'profile' ? {} : { tab: tabId }, { replace: true });
  };

  const loadSettings = async () => {
    setLoading(true);
    setMessage(null);

    try {
      const profileResponse = await axios.get('/api/user/me');
      const profile = profileResponse.data;
      const instructor = profile.role === 'INSTRUCTOR';
      const billingResponse = instructor
        ? { data: await getInstructorWallet() }
        : await axios.get('/api/user/billing-history');

      setAvatarUrl(profile.avatar || null);
      setWalletProfile(profile);
      setWalletHistory(instructor ? [] : billingResponse.data || []);
      setRevenueProfile(instructor ? billingResponse.data : null);
      if (instructor) {
        const meetResponse = await axios.get('/api/instructor/settings/meet-link');
        setGoogleMeetLink(meetResponse.data?.googleMeetLink || '');
      }
      setPayoutAccount({
        bankName: profile.settings?.payoutAccount?.bankName || '',
        accountNumber: profile.settings?.payoutAccount?.accountNumber || '',
        accountHolder: profile.settings?.payoutAccount?.accountHolder || '',
      });
      const profileSettings = profile.settings || {};

      setFormData({
        name: profile.name || '',
        phone: profile.phone || '',
        bio: profile.bio || '',
        settings: {
          ...defaultSettings,
          ...profileSettings,
          theme: profileSettings.theme === 'light' ? 'light' : defaultSettings.theme,
        },
      });
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Không thể tải cài đặt tài khoản.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const updateSetting = (key, value) => {
    setFormData((prev) => ({
      ...prev,
      settings: { ...prev.settings, [key]: value },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const response = await axios.put('/api/user/me', formData);
      setWalletProfile(response.data);
      await refreshUser?.();
      setMessage({ type: 'success', text: 'Đã lưu thay đổi thành công.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Không thể lưu cài đặt.' });
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (event) => {
    event.preventDefault();
    setMessage(null);

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setMessage({ type: 'error', text: 'Mật khẩu xác nhận chưa khớp.' });
      return;
    }

    setSaving(true);
    try {
      await axios.put('/api/user/password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setMessage({ type: 'success', text: 'Đã đổi mật khẩu thành công.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Không thể đổi mật khẩu.' });
    } finally {
      setSaving(false);
    }
  };

  const handleSavePayoutAccount = async (event) => {
    event.preventDefault();
    setMessage(null);

    if (!payoutAccount.bankName.trim() || !payoutAccount.accountNumber.trim() || !payoutAccount.accountHolder.trim()) {
      setMessage({ type: 'error', text: 'Vui lòng nhập đầy đủ thông tin tài khoản nhận tiền.' });
      return;
    }

    setSaving(true);
    try {
      const nextSettings = {
        ...formData.settings,
        payoutAccount: {
          bankName: payoutAccount.bankName.trim(),
          accountNumber: payoutAccount.accountNumber.trim(),
          accountHolder: payoutAccount.accountHolder.trim(),
        },
      };
      const response = await axios.put('/api/user/me', { ...formData, settings: nextSettings });
      setFormData((prev) => ({ ...prev, settings: nextSettings }));
      setWalletProfile(response.data);
      await refreshUser?.();
      setMessage({ type: 'success', text: 'Đã lưu tài khoản nhận tiền.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Không thể lưu tài khoản nhận tiền.' });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveGoogleMeet = async (event) => {
    event.preventDefault();
    setMessage(null);
    const link = googleMeetLink.trim();
    if (!link.startsWith('https://meet.google.com/')) {
      setMessage({ type: 'error', text: 'Liên kết Google Meet phải bắt đầu bằng https://meet.google.com/' });
      return;
    }
    setSaving(true);
    try {
      const response = await axios.put('/api/instructor/settings/meet-link', { googleMeetLink: link });
      setGoogleMeetLink(response.data.googleMeetLink || link);
      setFormData((prev) => ({ ...prev, settings: { ...prev.settings, googleMeetLink: link } }));
      await refreshUser?.();
      setMessage({ type: 'success', text: 'Đã lưu liên kết Google Meet.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Không thể lưu liên kết Google Meet.' });
    } finally {
      setSaving(false);
    }
  };

  const handleOpenWithdraw = () => {
    setMessage(null);
    if (!payoutAccount.bankName.trim() || !payoutAccount.accountNumber.trim() || !payoutAccount.accountHolder.trim()) {
      setMessage({ type: 'error', text: 'Vui lòng lưu tài khoản nhận tiền trước khi rút' });
      return;
    }
    setWithdrawForm({ soTien: '', ghiChu: '' });
    setShowWithdrawModal(true);
  };

  const handleWithdrawDemo = async (event) => {
    event.preventDefault();
    const amount = Number(withdrawForm.soTien);

    if (!Number.isInteger(amount) || amount < 100000) {
      setMessage({ type: 'error', text: 'Số tiền rút tối thiểu là 100.000đ' });
      return;
    }
    if (amount > (revenueProfile?.availableBalance || 0)) {
      setMessage({ type: 'error', text: 'Số tiền rút vượt quá số dư khả dụng' });
      return;
    }

    setWithdrawing(true);
    setMessage(null);
    try {
      await axios.post('/api/instructor/withdraw-request', {
        soTien: amount,
        bankName: payoutAccount.bankName.trim(),
        accountHolder: payoutAccount.accountHolder.trim(),
        accountNumber: payoutAccount.accountNumber.trim(),
        ghiChu: withdrawForm.ghiChu.trim() || null,
      });
      const wallet = await getInstructorWallet();
      setRevenueProfile(wallet);
      setShowWithdrawModal(false);
      setWithdrawForm({ soTien: '', ghiChu: '' });
      setMessage({ type: 'success', text: 'Đã tạo yêu cầu rút tiền' });
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Không thể tạo yêu cầu rút tiền.' });
    } finally {
      setWithdrawing(false);
    }
  };

  const handleAvatarUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Ảnh đại diện tối đa 2MB.' });
      return;
    }

    setUploadingAvatar(true);
    setMessage(null);

    try {
      const payload = new FormData();
      payload.append('avatar', file);
      const response = await axios.post('/api/user/avatar', payload);
      setAvatarUrl(response.data.avatarUrl);
      await refreshUser?.();
      setMessage({ type: 'success', text: 'Đã cập nhật ảnh đại diện.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Không thể tải ảnh đại diện.' });
    } finally {
      setUploadingAvatar(false);
      if (event.target) event.target.value = '';
    }
  };

  const handleAvatarDelete = async () => {
    if (!window.confirm('Bạn muốn xóa ảnh đại diện hiện tại?')) return;

    setUploadingAvatar(true);
    setMessage(null);

    try {
      await axios.delete('/api/user/avatar');
      setAvatarUrl(null);
      await refreshUser?.();
      setMessage({ type: 'success', text: 'Đã xóa ảnh đại diện.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Không thể xóa ảnh đại diện.' });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleExportData = async () => {
    setMessage(null);

    try {
      const response = await axios.get('/api/user/export');
      const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `skillio-du-lieu-ca-nhan-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setMessage({ type: 'success', text: 'Đã xuất dữ liệu cá nhân.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Không thể xuất dữ liệu.' });
    }
  };

  if (loading) {
    return (
      <div className="animate-fade-in-up space-y-6">
        <div className="h-20 rounded-2xl bg-slate-100 animate-pulse" />
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-4">
          <div className="h-96 rounded-2xl bg-slate-100 animate-pulse" />
          <div className="h-96 rounded-2xl bg-slate-100 animate-pulse xl:col-span-3" />
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="mb-1 text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">Tài khoản cá nhân</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadSettings}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-60"
          >
            <RotateCcw className="h-4 w-4" />
            Tải lại
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-full bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-purple-700 disabled:opacity-60"
          >
            <Check className="h-4 w-4" />
            {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
          </button>
        </div>
      </div>

      <StatusMessage message={message} />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-4">
        <aside className="xl:col-span-1">
          <div className="sticky top-4 flex flex-col gap-1 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
            {visibleTabs.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => selectTab(item.id)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${
                    isActive
                      ? item.danger
                        ? 'bg-rose-50 font-semibold text-rose-700'
                        : 'bg-purple-50 font-semibold text-purple-700'
                      : item.danger
                        ? 'text-rose-600 hover:bg-rose-50'
                        : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </aside>

        <main className="xl:col-span-3">
          {activeTab === 'profile' && (
            <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
              <div className="mb-5">
                <h2 className="text-xl font-semibold tracking-tight text-slate-900">Hồ sơ cá nhân</h2>
              </div>

              <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-purple-100 bg-gradient-to-br from-purple-50 to-pink-50 p-4 md:flex-row md:items-center">
                <UserAvatar src={avatarUrl} name={displayName} className="h-16 w-16 shrink-0 rounded-2xl shadow-sm" fallbackClassName="text-xl" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-900">Ảnh đại diện</p>
                  <p className="text-xs text-slate-500">PNG, JPG hoặc WebP dưới 2MB. Ảnh sẽ được lưu và hiển thị trên tài khoản của bạn.</p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png, image/jpeg, image/webp"
                  className="hidden"
                  onChange={handleAvatarUpload}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-60"
                >
                  <Upload className="h-4 w-4" />
                  {uploadingAvatar ? 'Đang tải...' : 'Tải lên'}
                </button>
                {avatarUrl && (
                  <button
                    type="button"
                    onClick={handleAvatarDelete}
                    disabled={uploadingAvatar}
                    className="text-sm font-semibold text-slate-500 hover:text-rose-600 disabled:opacity-60"
                  >
                    Xóa
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <FieldLabel>Họ và tên</FieldLabel>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-purple-400 focus:ring-4 focus:ring-purple-100"
                  />
                </div>
                <div>
                  <FieldLabel>Email</FieldLabel>
                  <input
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-500 outline-none"
                  />
                </div>
                <div>
                  <FieldLabel>Số điện thoại</FieldLabel>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(event) => setFormData({ ...formData, phone: event.target.value })}
                    placeholder="Ví dụ: 0909 123 456"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-purple-400 focus:ring-4 focus:ring-purple-100"
                  />
                </div>
                <div>
                  <FieldLabel>Tên hiển thị</FieldLabel>
                  <input
                    type="text"
                    value={displayName.toLowerCase().replace(/\s+/g, '.')}
                    disabled
                    className="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-500 outline-none"
                  />
                </div>
                <div className="md:col-span-2">
                  <FieldLabel>Giới thiệu</FieldLabel>
                  <textarea
                    rows="4"
                    value={formData.bio}
                    onChange={(event) => setFormData({ ...formData, bio: event.target.value })}
                    placeholder="Viết vài dòng về mục tiêu học tập hoặc lĩnh vực bạn quan tâm."
                    className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-purple-400 focus:ring-4 focus:ring-purple-100"
                  />
                </div>
              </div>
            </section>
          )}

          {activeTab === 'security' && (
            <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
              <div className="mb-5">
                <h2 className="text-xl font-semibold tracking-tight text-slate-900">Bảo mật tài khoản</h2>
              </div>

              <form onSubmit={handlePasswordChange} className="max-w-xl space-y-4">
                <div>
                  <FieldLabel>Mật khẩu hiện tại</FieldLabel>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={passwordForm.currentPassword}
                    onChange={(event) => setPasswordForm({ ...passwordForm, currentPassword: event.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-purple-400 focus:ring-4 focus:ring-purple-100"
                  />
                </div>
                <div>
                  <FieldLabel>Mật khẩu mới</FieldLabel>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={passwordForm.newPassword}
                    onChange={(event) => setPasswordForm({ ...passwordForm, newPassword: event.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-purple-400 focus:ring-4 focus:ring-purple-100"
                  />
                </div>
                <div>
                  <FieldLabel>Nhập lại mật khẩu mới</FieldLabel>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={passwordForm.confirmPassword}
                    onChange={(event) => setPasswordForm({ ...passwordForm, confirmPassword: event.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-purple-400 focus:ring-4 focus:ring-purple-100"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    {showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                  >
                    <KeyRound className="h-4 w-4" />
                    Đổi mật khẩu
                  </button>
                </div>
              </form>
            </section>
          )}

          {activeTab === 'notifications' && (
            <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
              <div className="mb-5">
                <h2 className="text-xl font-semibold tracking-tight text-slate-900">Thông báo</h2>
              </div>
              <div className="divide-y divide-slate-100">
                {[
                  ['emailDigest', 'Email tóm tắt hằng tuần', 'Tổng kết tiến độ học và gợi ý khóa học phù hợp.'],
                  ['courseReminders', 'Nhắc lịch học', 'Nhắc bạn quay lại học khi có bài đang dang dở.'],
                  ['promotionEmails', 'Ưu đãi khóa học', 'Nhận thông tin giảm giá và khóa học mới.'],
                ].map(([key, title, description]) => (
                  <div key={key} className="flex items-center justify-between gap-4 py-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{title}</p>
                      <p className="text-xs text-slate-400">{description}</p>
                    </div>
                    <Toggle checked={Boolean(formData.settings[key])} onChange={(value) => updateSetting(key, value)} />
                  </div>
                ))}
              </div>
            </section>
          )}



          {activeTab === 'learning' && (
            <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
              <div className="mb-5">
                <h2 className="text-xl font-semibold tracking-tight text-slate-900">Tùy chọn học tập</h2>
              </div>
              <div className="divide-y divide-slate-100">
                {isInstructor && (
                  <form onSubmit={handleSaveGoogleMeet} className="pb-5">
                    <div className="mb-3">
                      <p className="text-sm font-semibold text-slate-900">Liên kết Google Meet</p>
                    </div>
                    <div className="flex flex-col gap-3 lg:flex-row">
                      <input
                        type="url"
                        value={googleMeetLink}
                        onChange={(event) => setGoogleMeetLink(event.target.value)}
                        placeholder="https://meet.google.com/abc-defg-hij"
                        className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-purple-400 focus:ring-4 focus:ring-purple-100"
                      />
                      <button
                        type="submit"
                        disabled={saving}
                        className="inline-flex items-center justify-center gap-2 rounded-full bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-60"
                      >
                        <Check className="h-4 w-4" />
                        Lưu liên kết Google Meet
                      </button>
                    </div>
                  </form>
                )}
                <div className="flex items-center justify-between gap-4 py-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Tự động phát video</p>
                  </div>
                  <Toggle checked={formData.settings.autoPlayVideo} onChange={(value) => updateSetting('autoPlayVideo', value)} />
                </div>
                <div className="flex items-center justify-between gap-4 py-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Hiển thị phụ đề</p>
                    <p className="text-xs text-slate-400">Luôn bật phụ đề tiếng Việt nếu bài học có hỗ trợ.</p>
                  </div>
                  <Toggle checked={formData.settings.showSubtitles} onChange={(value) => updateSetting('showSubtitles', value)} />
                </div>
                <div className="py-4">
                  <FieldLabel>Chất lượng video mặc định</FieldLabel>
                  <select
                    value={formData.settings.videoQuality}
                    onChange={(event) => updateSetting('videoQuality', event.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-purple-400 focus:ring-4 focus:ring-purple-100 md:w-1/2"
                  >
                    <option value="auto">Tự động</option>
                    <option value="1080p">1080p HD</option>
                    <option value="720p">720p HD</option>
                    <option value="480p">480p tiết kiệm dữ liệu</option>
                  </select>
                </div>
              </div>
            </section>
          )}

          {activeTab === 'billing' && !isInstructor && (
            <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
              {isInstructor ? (
                <>
                  <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="text-xl font-semibold tracking-tight text-slate-900">Doanh thu & tài khoản nhận tiền</h2>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowBalance((v) => !v)}
                        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                        title={showBalance ? 'Ẩn số tiền' : 'Hiện số tiền'}
                      >
                        {showBalance ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        {showBalance ? 'Ẩn' : 'Hiện'}
                      </button>
                      <button
                        type="button"
                        onClick={handleOpenWithdraw}
                        disabled={(revenueProfile?.availableBalance || 0) < 100000}
                        className="inline-flex items-center justify-center gap-2 rounded-full bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <BanknoteArrowDown className="h-4 w-4" />
                        Yêu cầu rút tiền
                      </button>
                    </div>
                  </div>

                  <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
                    <div className="rounded-2xl border border-purple-100 bg-purple-50 p-5">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-purple-700">Tổng doanh thu</p>
                      <p className="text-2xl font-bold text-slate-900">{showBalance ? formatCurrency(revenueProfile?.totalRevenue || 0) : '••••••'}</p>
                    </div>
                    <div className="rounded-2xl border border-amber-100 bg-amber-50 p-5">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">Số dư khả dụng để rút</p>
                      <p className="text-2xl font-bold text-slate-900">{showBalance ? formatCurrency(revenueProfile?.availableBalance || 0) : '••••••'}</p>
                    </div>
                    <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Đã rút</p>
                      <p className="text-2xl font-bold text-slate-900">{showBalance ? formatCurrency(revenueProfile?.paidRevenue || 0) : '••••••'}</p>
                    </div>
                  </div>

                  <form onSubmit={handleSavePayoutAccount} className="mb-6 rounded-2xl border border-slate-100 bg-slate-50 p-5">
                    <div className="mb-4 flex items-center gap-2">
                      <Landmark className="h-5 w-5 text-purple-600" />
                      <h3 className="text-sm font-semibold text-slate-900">Tài khoản nhận tiền</h3>
                    </div>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                      <div>
                        <FieldLabel>Tên ngân hàng</FieldLabel>
                        <input
                          value={payoutAccount.bankName}
                          onChange={(event) => setPayoutAccount((prev) => ({ ...prev, bankName: event.target.value }))}
                          placeholder="Ví dụ: Vietcombank"
                          className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-purple-400 focus:ring-4 focus:ring-purple-100"
                        />
                      </div>
                      <div>
                        <FieldLabel>Số tài khoản</FieldLabel>
                        <input
                          value={payoutAccount.accountNumber}
                          onChange={(event) => setPayoutAccount((prev) => ({ ...prev, accountNumber: event.target.value }))}
                          placeholder="Nhập số tài khoản"
                          className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-purple-400 focus:ring-4 focus:ring-purple-100"
                        />
                      </div>
                      <div>
                        <FieldLabel>Chủ tài khoản</FieldLabel>
                        <input
                          value={payoutAccount.accountHolder}
                          onChange={(event) => setPayoutAccount((prev) => ({ ...prev, accountHolder: event.target.value }))}
                          placeholder="Nhập tên chủ tài khoản"
                          className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-purple-400 focus:ring-4 focus:ring-purple-100"
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={saving}
                      className="mt-4 inline-flex items-center gap-2 rounded-full bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-60"
                    >
                      <Check className="h-4 w-4" />
                      Lưu tài khoản nhận tiền
                    </button>
                  </form>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <ReceiptText className="h-4 w-4 text-slate-500" />
                      <h3 className="text-sm font-semibold text-slate-900">Lịch sử doanh thu</h3>
                    </div>
                    {(revenueProfile?.recentTransactions || []).length > 0 ? (
                      revenueProfile.recentTransactions.map((item) => (
                        <div key={item.id} className="flex flex-col gap-3 rounded-xl border border-slate-100 p-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">
                              {item.type === 'WITHDRAWAL' || item.type === 'DEMO_WITHDRAWAL' ? 'Yêu cầu rút tiền' : item.course?.title || 'Doanh thu khóa học'}
                            </p>
                            <p className="text-xs text-slate-400">
                              {new Date(item.createdAt).toLocaleString('vi-VN')}
                              {item.type === 'WITHDRAWAL' || item.type === 'DEMO_WITHDRAWAL'
                                ? ` · ${item.bankName} · ${item.accountHolder}${item.note ? ` · ${item.note}` : ''}`
                                : ` · ${item.user?.name || item.user?.email || 'Học viên'}`}
                            </p>
                          </div>
                          <div className="sm:text-right">
                            <p className={`text-sm font-semibold ${item.type === 'WITHDRAWAL' || item.type === 'DEMO_WITHDRAWAL' ? 'text-purple-600' : 'text-emerald-600'}`}>
                              {showBalance ? formatCurrency(item.amount || 0) : '••••••'}
                            </p>
                            <p className={`text-[11px] ${item.type === 'WITHDRAWAL' || item.type === 'DEMO_WITHDRAWAL' ? 'text-emerald-600' : 'text-amber-600'}`}>
                              {item.statusLabel}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
                        Chưa có giao dịch doanh thu nào
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
              <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-semibold tracking-tight text-slate-900">Ví & giao dịch</h2>
                  <p className="mt-1 text-xs text-slate-400">Theo dõi số dư, danh hiệu hội viên và lịch sử giao dịch.</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowBalance((v) => !v)}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    {showBalance ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    {showBalance ? 'Ẩn' : 'Hiện'}
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/upgrade')}
                    className="inline-flex items-center gap-2 rounded-full bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700"
                  >
                    <Wallet className="h-4 w-4" />
                    Nạp ví
                  </button>
                </div>
              </div>

              <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
                <div className="rounded-2xl border border-amber-100 bg-amber-50 p-5">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">Danh hiệu</p>
                  <p className="text-2xl font-bold text-slate-900">{walletProfile?.memberTierLabel || 'Đồng'}</p>
                  <p className="mt-2 text-xs text-slate-500">Tự động nâng cấp theo tổng chi tiêu.</p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Số dư ví</p>
                  <p className="text-2xl font-bold text-slate-900">{showBalance ? formatCurrency(walletProfile?.walletBalance || 0) : '••••••'}</p>
                  <p className="mt-2 text-xs text-slate-500">Dùng để mua khóa học trả phí.</p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Tổng chi tiêu</p>
                  <p className="text-2xl font-bold text-slate-900">{showBalance ? formatCurrency(walletProfile?.totalSpent || 0) : '••••••'}</p>
                  <p className="mt-2 text-xs text-slate-500">Dùng để xếp hạng hội viên.</p>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-900">Lịch sử giao dịch</h3>
                {walletHistory.length > 0 ? (
                  walletHistory.map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-col gap-3 rounded-xl border border-slate-100 p-3 transition-colors hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{item.note || item.type}</p>
                        <p className="text-xs text-slate-400">
                          {new Date(item.createdAt).toLocaleString('vi-VN')}
                          {item.course?.title ? ` - ${item.course.title}` : ''}
                        </p>
                      </div>
                      <div className="sm:text-right">
                        <p className={`text-sm font-semibold ${item.amount >= 0 ? 'text-emerald-600' : 'text-slate-900'}`}>
                          {showBalance ? item.amountText : '••••••'}
                        </p>
                        <p className="text-[11px] text-slate-400">Số dư sau GD: {showBalance ? item.balanceAfterText : '••••••'}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
                    Chưa có giao dịch nào trong ví.
                  </div>
                )}
              </div>
                </>
              )}
            </section>
          )}

          {activeTab === 'danger' && (
            <section className="rounded-2xl border border-rose-100 bg-white p-6 shadow-sm">
              <div className="mb-5">
                <h2 className="text-xl font-semibold tracking-tight text-rose-700">Dữ liệu & tài khoản</h2>
                <p className="mt-1 text-xs text-slate-400">Các hành động quan trọng liên quan đến dữ liệu cá nhân.</p>
              </div>
              <div className="space-y-3">
                <div className="flex flex-col gap-3 rounded-xl border border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Xuất dữ liệu của tôi</p>
                    <p className="text-xs text-slate-500">Tải hồ sơ, tiến độ học, chứng chỉ và giao dịch dưới dạng JSON.</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleExportData}
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <Download className="h-4 w-4" />
                    Xuất dữ liệu
                  </button>
                </div>
                <div className="flex flex-col gap-3 rounded-xl border border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Đăng xuất khỏi thiết bị này</p>
                    <p className="text-xs text-slate-500">Xóa phiên đăng nhập hiện tại khỏi trình duyệt.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      logout();
                      navigate('/login');
                    }}
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50"
                  >
                    <LogOut className="h-4 w-4" />
                    Đăng xuất
                  </button>
                </div>

              </div>
            </section>
          )}
        </main>
      </div>

      {showWithdrawModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" onClick={() => !withdrawing && setShowWithdrawModal(false)}>
          <form
            onSubmit={handleWithdrawDemo}
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Yêu cầu rút tiền</h2>
                <p className="mt-1 text-xs text-slate-500">Yêu cầu sẽ được ghi nhận ở trạng thái Pending để quản trị viên xử lý.</p>
              </div>
              <button
                type="button"
                aria-label="Đóng"
                disabled={withdrawing}
                onClick={() => setShowWithdrawModal(false)}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-4 rounded-xl border border-purple-100 bg-purple-50 p-4 text-sm">
              <p className="font-semibold text-slate-900">Tài khoản nhận tiền</p>
              <p className="mt-1 text-slate-600">{payoutAccount.bankName} · {payoutAccount.accountNumber}</p>
              <p className="text-slate-600">{payoutAccount.accountHolder}</p>
            </div>

            <div className="space-y-4">
              <div>
                <FieldLabel>Số tiền muốn rút</FieldLabel>
                <input
                  type="number"
                  min="100000"
                  step="1000"
                  required
                  autoFocus
                  value={withdrawForm.soTien}
                  onChange={(event) => setWithdrawForm((prev) => ({ ...prev, soTien: event.target.value }))}
                  placeholder="Tối thiểu 100.000 đ"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-purple-400 focus:ring-4 focus:ring-purple-100"
                />
                <p className="mt-1 text-xs text-slate-500">Số dư khả dụng: {formatCurrency(revenueProfile?.availableBalance || 0)}</p>
              </div>
              <div>
                <FieldLabel>Ghi chú nếu cần</FieldLabel>
                <textarea
                  rows={3}
                  maxLength={500}
                  value={withdrawForm.ghiChu}
                  onChange={(event) => setWithdrawForm((prev) => ({ ...prev, ghiChu: event.target.value }))}
                  placeholder="Ghi chú cho yêu cầu rút tiền"
                  className="w-full resize-none rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-purple-400 focus:ring-4 focus:ring-purple-100"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                disabled={withdrawing}
                onClick={() => setShowWithdrawModal(false)}
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={withdrawing}
                className="inline-flex items-center gap-2 rounded-full bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-60"
              >
                <BanknoteArrowDown className="h-4 w-4" />
                {withdrawing ? 'Đang xử lý...' : 'Xác nhận rút tiền'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default Settings;
