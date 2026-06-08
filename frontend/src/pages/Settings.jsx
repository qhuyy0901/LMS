import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Bell,
  Check,
  CreditCard,
  GraduationCap,
  KeyRound,
  LogOut,
  Monitor,
  Palette,
  Plug,
  RotateCcw,
  Shield,
  ShieldCheck,
  Sun,
  Upload,
  User,
} from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useDashboardView } from '../context/DashboardViewContext';

const envApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const MVC_BASE_URL = envApiUrl.endsWith('/api') ? envApiUrl.slice(0, -4) : envApiUrl.replace(/\/$/, '');

const defaultSettings = {
  displayName: '',
  twoFactorEnabled: false,
  notifyCourses: true,
  notifyComments: true,
  notifyWallet: true,
  notifyCertificates: true,
  notifyEmail: true,
  theme: 'auto',
  primaryColor: 'purple',
  fontSize: 'medium',
  dailyGoalMinutes: 30,
  dailyReminder: true,
  learningLanguage: 'vi',
  autoNextLesson: true,
  integrations: {
    github: false,
    googleMeet: false,
    zoom: false,
  },
};

const emptyForm = {
  name: '',
  displayName: '',
  email: '',
  phone: '',
  bio: '',
  settings: defaultSettings,
};

const Settings = () => {
  const { user, logout, refreshUser } = useAuth();
  const { activeView } = useDashboardView();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const isInstructor = activeView === 'INSTRUCTOR';

  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [message, setMessage] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [savedData, setSavedData] = useState(emptyForm);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [session, setSession] = useState(null);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
    }
  }, [navigate, user]);

  useEffect(() => {
    if (isInstructor && ['learning', 'billing'].includes(activeTab)) {
      setActiveTab('profile');
    }
  }, [activeTab, isInstructor]);

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    const settings = formData.settings;
    localStorage.setItem('skillio-theme', settings.theme);
    localStorage.setItem('skillio-primary-color', settings.primaryColor);
    localStorage.setItem('skillio-font-size', settings.fontSize);
  }, [formData.settings]);

  const tabs = useMemo(() => ([
    { id: 'profile', icon: User, label: 'Hồ sơ' },
    { id: 'account', icon: Shield, label: 'Tài khoản & Bảo mật' },
    { id: 'notify', icon: Bell, label: 'Thông báo' },
    { id: 'appearance', icon: Palette, label: 'Giao diện' },
    { id: 'learning', icon: GraduationCap, label: 'Học tập' },
    { id: 'billing', icon: CreditCard, label: 'Thanh toán' },
    { id: 'integrations', icon: Plug, label: 'Tích hợp' },
    { id: 'danger', icon: AlertTriangle, label: 'Vùng nguy hiểm', danger: true },
  ].filter((tab) => !isInstructor || !['learning', 'billing'].includes(tab.id))), [isInstructor]);

  const fetchSettings = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const response = await axios.get('/api/account/settings');
      hydrateSettings(response.data);
    } catch (error) {
      if (error.response?.status === 401) {
        navigate('/login', { replace: true });
        return;
      }
      if (error.response?.status === 403) {
        setMessage({ type: 'error', text: 'Bạn không có quyền truy cập trang này.' });
      } else {
        setMessage({ type: 'error', text: 'Không thể tải cài đặt. Vui lòng thử lại.' });
      }
    } finally {
      setLoading(false);
    }
  };

  const hydrateSettings = (payload) => {
    const profile = payload.user || {};
    const settings = { ...defaultSettings, ...(payload.settings || {}) };
    if (!settings.displayName) settings.displayName = createDisplayName(profile.name || '');

    const nextForm = {
      name: profile.name || '',
      displayName: settings.displayName,
      email: profile.email || '',
      phone: profile.phone || '',
      bio: profile.bio || '',
      settings,
    };

    setFormData(nextForm);
    setSavedData(nextForm);
    setAvatarUrl(profile.avatar || null);
    setWallet(payload.wallet || null);
    setTransactions(payload.transactions || []);
    setSession(payload.session || null);
  };

  const validateProfile = () => {
    if (!formData.name.trim()) return 'Họ tên không được rỗng.';
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(formData.email.trim())) return 'Email phải đúng định dạng.';
    const phoneDigits = formData.phone.replace(/\D/g, '').length;
    if (formData.phone.trim() && (!/^\+?[0-9\s]+$/.test(formData.phone.trim()) || phoneDigits < 8 || phoneDigits > 15)) return 'Số điện thoại không hợp lệ.';
    if (formData.bio.length > 500) return 'Giới thiệu tối đa 500 ký tự.';
    return '';
  };

  const validatePassword = () => {
    const hasAnyPassword = Object.values(passwordForm).some((value) => value.trim());
    if (!hasAnyPassword) return '';
    if (passwordForm.newPassword.length < 6) return 'Mật khẩu mới tối thiểu 6 ký tự.';
    if (passwordForm.newPassword !== passwordForm.confirmPassword) return 'Nhập lại mật khẩu phải khớp.';
    if (!passwordForm.currentPassword) return 'Vui lòng nhập mật khẩu hiện tại.';
    return '';
  };

  const handleSave = async () => {
    const profileError = validateProfile();
    const passwordError = validatePassword();
    if (profileError || passwordError) {
      setMessage({ type: 'error', text: profileError || passwordError });
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      const settings = {
        ...formData.settings,
        displayName: formData.displayName || createDisplayName(formData.name),
      };

      const profileResponse = await axios.put('/api/account/profile', {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        bio: formData.bio,
        settings,
      });

      await axios.put('/api/account/notifications', { settings });
      await axios.put('/api/account/preferences', { settings });

      if (Object.values(passwordForm).some((value) => value.trim())) {
        await axios.put('/api/account/password', passwordForm);
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      }

      hydrateSettings({
        user: profileResponse.data.user,
        settings,
        wallet,
        transactions,
        session,
      });
      await refreshUser();
      setMessage({ type: 'success', text: 'Cập nhật cài đặt thành công.' });
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'Không thể cập nhật cài đặt. Vui lòng thử lại.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleUndo = () => {
    setFormData(savedData);
    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setMessage({ type: 'success', text: 'Đã hoàn tác thay đổi chưa lưu.' });
  };

  const handleAvatarUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/png', 'image/jpeg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setMessage({ type: 'error', text: 'Ảnh đại diện chỉ nhận PNG, JPG, JPEG, WEBP.' });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Ảnh đại diện tối đa 2MB.' });
      return;
    }

    setUploadingAvatar(true);
    setMessage(null);
    const form = new FormData();
    form.append('avatar', file);

    try {
      const response = await axios.post('/api/account/avatar', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setAvatarUrl(response.data.avatarUrl);
      await refreshUser();
      setMessage({ type: 'success', text: 'Cập nhật cài đặt thành công.' });
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'Không thể cập nhật cài đặt. Vui lòng thử lại.',
      });
    } finally {
      setUploadingAvatar(false);
      event.target.value = '';
    }
  };

  const updateField = (key, value) => {
    setFormData((current) => ({ ...current, [key]: value }));
  };

  const updateSetting = (key, value) => {
    setFormData((current) => ({
      ...current,
      settings: { ...current.settings, [key]: value },
      ...(key === 'displayName' ? { displayName: value } : {}),
    }));
  };

  const updateIntegration = (key, value) => {
    setFormData((current) => ({
      ...current,
      settings: {
        ...current.settings,
        integrations: { ...(current.settings.integrations || {}), [key]: value },
      },
    }));
  };

  const handleLogoutDevice = async () => {
    if (!window.confirm('Bạn có chắc chắn muốn đăng xuất khỏi thiết bị hiện tại?')) return;
    await axios.post('/api/account/logout').catch(() => null);
    logout();
    navigate('/login');
  };

  const handleDisableDemo = async () => {
    if (!window.confirm('Bạn muốn vô hiệu hóa tài khoản demo? Dữ liệu thật sẽ không bị xóa.')) return;
    const response = await axios.post('/api/account/disable-demo');
    setMessage({ type: 'success', text: response.data?.message || 'Đã vô hiệu hóa tài khoản demo.' });
  };

  const handleDeleteDemo = async () => {
    if (!window.confirm('Bạn muốn xóa tài khoản demo? Dữ liệu thật sẽ không bị xóa.')) return;
    const response = await axios.delete('/api/account/delete-demo');
    setMessage({ type: 'success', text: response.data?.message || 'Đã xóa tài khoản demo.' });
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="rounded-2xl border border-slate-100 bg-white px-6 py-4 text-sm font-medium text-slate-600 shadow-sm">
          Đang tải cài đặt...
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up pb-20">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">Cài đặt</h1>
          <p className="mt-1 text-sm text-slate-500">
            {isInstructor
              ? 'Quản lý hồ sơ giảng viên, bảo mật, thông báo và tích hợp của bạn.'
              : 'Quản lý hồ sơ, bảo mật, thông báo và tùy chọn học tập của bạn.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleUndo}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
          >
            <RotateCcw className="h-4 w-4" />
            Hoàn tác
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-full bg-purple-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-purple-700 disabled:opacity-70"
          >
            <Check className="h-4 w-4" />
            {saving ? 'Đang lưu thay đổi...' : 'Lưu thay đổi'}
          </button>
        </div>
      </div>

      {message && (
        <div className={`mb-5 rounded-2xl border px-4 py-3 text-sm ${message.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-4">
        <aside className="xl:col-span-1">
          <div className="sticky top-4 flex flex-col gap-1 rounded-2xl border border-slate-100 bg-white p-3">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition ${
                    active
                      ? tab.danger ? 'bg-rose-50 font-medium text-rose-700' : 'bg-purple-50 font-medium text-purple-700'
                      : tab.danger ? 'text-rose-600 hover:bg-rose-50' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </aside>

        <main className="xl:col-span-3">
          {activeTab === 'profile' && (
            <Panel title={isInstructor ? 'Hồ sơ giảng viên' : 'Hồ sơ'} subtitle="Thông tin hiển thị công khai trên hệ thống Skillio.">
              <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-purple-100 bg-gradient-to-br from-purple-50 to-pink-50 p-4 sm:flex-row sm:items-center">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Ảnh đại diện" className="h-16 w-16 rounded-2xl object-cover shadow-sm" />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-300 to-purple-400 text-xl font-bold text-white shadow-sm">
                    {formData.name.charAt(0).toUpperCase() || 'U'}
                  </div>
                )}
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-900">Ảnh đại diện</p>
                  <p className="text-xs text-slate-500">PNG, JPG, JPEG hoặc WEBP. Tối đa 2MB.</p>
                </div>
                <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleAvatarUpload} />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 disabled:opacity-60"
                >
                  <Upload className="h-4 w-4" />
                  {uploadingAvatar ? 'Đang tải...' : 'Tải lên'}
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field label="Họ và tên" value={formData.name} onChange={(value) => updateField('name', value)} />
                <Field label="Tên hiển thị" value={formData.displayName} onChange={(value) => { updateField('displayName', value); updateSetting('displayName', value); }} />
                <Field label="Email" type="email" value={formData.email} onChange={(value) => updateField('email', value)} />
                <Field label="Số điện thoại" type="tel" value={formData.phone} onChange={(value) => updateField('phone', value)} placeholder="+84 909 123 456" />
                <div className="md:col-span-2">
                  <label className="mb-1.5 block text-xs font-medium text-slate-500">Giới thiệu</label>
                  <textarea
                    rows="4"
                    maxLength={500}
                    value={formData.bio}
                    onChange={(event) => updateField('bio', event.target.value)}
                    placeholder="Viết một chút về bản thân bạn..."
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-purple-400"
                  />
                  <p className="mt-1 text-right text-xs text-slate-400">{formData.bio.length}/500 ký tự</p>
                </div>
              </div>
            </Panel>
          )}

          {activeTab === 'account' && (
            <Panel title="Tài khoản & Bảo mật" subtitle="Đổi mật khẩu, xác thực 2 lớp và phiên đăng nhập hiện tại.">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <Field label="Mật khẩu hiện tại" type="password" value={passwordForm.currentPassword} onChange={(value) => setPasswordForm((current) => ({ ...current, currentPassword: value }))} />
                <Field label="Mật khẩu mới" type="password" value={passwordForm.newPassword} onChange={(value) => setPasswordForm((current) => ({ ...current, newPassword: value }))} />
                <Field label="Nhập lại mật khẩu mới" type="password" value={passwordForm.confirmPassword} onChange={(value) => setPasswordForm((current) => ({ ...current, confirmPassword: value }))} />
              </div>

              <div className="mt-6 space-y-3">
                <SettingRow
                  icon={ShieldCheck}
                  title="Xác thực 2 lớp (demo)"
                  description="Bật/tắt ở mức giao diện demo để mô phỏng bảo mật bổ sung."
                  control={<Toggle checked={formData.settings.twoFactorEnabled} onChange={(value) => updateSetting('twoFactorEnabled', value)} />}
                />
                <SettingRow
                  icon={Monitor}
                  title="Phiên đăng nhập hiện tại"
                  description={`${session?.device || 'Trình duyệt hiện tại'}${session?.ip ? ` - IP ${session.ip}` : ''}`}
                  control={<button onClick={handleLogoutDevice} className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700">Đăng xuất khỏi thiết bị</button>}
                />
              </div>
            </Panel>
          )}

          {activeTab === 'notify' && (
            <Panel title="Thông báo" subtitle="Chọn những loại thông báo bạn muốn nhận.">
              <div className="divide-y divide-slate-100">
                <ToggleRow title="Thông báo khóa học" description="Bài học mới, cập nhật nội dung và nhắc lịch học." checked={formData.settings.notifyCourses} onChange={(value) => updateSetting('notifyCourses', value)} />
                <ToggleRow title="Thông báo bình luận" description="Phản hồi mới trong bài học hoặc thảo luận." checked={formData.settings.notifyComments} onChange={(value) => updateSetting('notifyComments', value)} />
                <ToggleRow title="Thông báo giao dịch ví" description="Nạp ví, mua khóa học và hoàn tiền." checked={formData.settings.notifyWallet} onChange={(value) => updateSetting('notifyWallet', value)} />
                <ToggleRow title="Thông báo chứng chỉ" description="Khi chứng chỉ được cấp hoặc cập nhật." checked={formData.settings.notifyCertificates} onChange={(value) => updateSetting('notifyCertificates', value)} />
                <ToggleRow title="Email thông báo" description="Gửi bản sao thông báo qua email." checked={formData.settings.notifyEmail} onChange={(value) => updateSetting('notifyEmail', value)} />
              </div>
            </Panel>
          )}

          {activeTab === 'appearance' && (
            <Panel title="Giao diện" subtitle="Tùy chỉnh chế độ hiển thị, màu chủ đạo và cỡ chữ.">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <ChoiceCard icon={Sun} title="Sáng" description="Nền sáng mặc định" active={formData.settings.theme === 'light'} onClick={() => updateSetting('theme', 'light')} />
                <ChoiceCard icon={Monitor} title="Tối" description="Dễ chịu cho mắt" active={formData.settings.theme === 'dark'} onClick={() => updateSetting('theme', 'dark')} dark />
                <ChoiceCard icon={Monitor} title="Tự động" description="Theo hệ thống" active={formData.settings.theme === 'auto'} onClick={() => updateSetting('theme', 'auto')} />
              </div>

              <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                <SelectField
                  label="Màu chủ đạo"
                  value={formData.settings.primaryColor}
                  onChange={(value) => updateSetting('primaryColor', value)}
                  options={[
                    ['purple', 'Tím Skillio'],
                    ['blue', 'Xanh dương'],
                    ['emerald', 'Xanh lá'],
                    ['rose', 'Hồng đỏ'],
                  ]}
                />
                <SelectField
                  label="Cỡ chữ"
                  value={formData.settings.fontSize}
                  onChange={(value) => updateSetting('fontSize', value)}
                  options={[
                    ['small', 'Nhỏ'],
                    ['medium', 'Vừa'],
                    ['large', 'Lớn'],
                  ]}
                />
              </div>
            </Panel>
          )}

          {activeTab === 'learning' && (
            <Panel title="Học tập" subtitle="Tùy chỉnh trải nghiệm học dành cho sinh viên.">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field label="Mục tiêu học mỗi ngày (phút)" type="number" value={formData.settings.dailyGoalMinutes} onChange={(value) => updateSetting('dailyGoalMinutes', Number(value))} />
                <SelectField
                  label="Ngôn ngữ học tập"
                  value={formData.settings.learningLanguage}
                  onChange={(value) => updateSetting('learningLanguage', value)}
                  options={[
                    ['vi', 'Tiếng Việt'],
                    ['en', 'English'],
                    ['ja', '日本語'],
                  ]}
                />
              </div>
              <div className="mt-4 divide-y divide-slate-100">
                <ToggleRow title="Nhắc học hằng ngày" description="Hiển thị nhắc nhở theo mục tiêu học tập." checked={formData.settings.dailyReminder} onChange={(value) => updateSetting('dailyReminder', value)} />
                <ToggleRow title="Tự động chuyển bài tiếp theo" description="Chuyển sang bài tiếp theo sau khi hoàn thành bài học." checked={formData.settings.autoNextLesson} onChange={(value) => updateSetting('autoNextLesson', value)} />
              </div>
            </Panel>
          )}

          {activeTab === 'billing' && (
            <Panel title="Thanh toán" subtitle="Thông tin ví nội bộ và lịch sử nạp gần đây.">
              <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-purple-100 bg-purple-50 p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-purple-600">Số dư ví</p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">{wallet?.balanceText || '0 đ'}</p>
                  <p className="mt-1 text-xs text-slate-500">Không tích hợp thanh toán thật tại trang này.</p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Tổng chi tiêu</p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">{wallet?.totalSpentText || '0 đ'}</p>
                  <a href={`${MVC_BASE_URL}/student/wallet`} className="mt-3 inline-flex rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white">Đi đến trang Ví của tôi</a>
                </div>
              </div>
              <h4 className="mb-3 text-sm font-semibold text-slate-900">Lịch sử phương thức nạp gần đây</h4>
              <div className="space-y-3">
                {transactions.length ? transactions.map((item) => (
                  <div key={item.id} className="flex items-center justify-between rounded-xl border border-slate-100 p-3">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{item.note || item.type}</p>
                      <p className="text-xs text-slate-400">{item.method} - {new Date(item.createdAt).toLocaleString('vi-VN')}</p>
                    </div>
                    <p className="text-sm font-semibold text-slate-900">{item.amountText}</p>
                  </div>
                )) : (
                  <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">Chưa có lịch sử nạp ví nào.</div>
                )}
              </div>
            </Panel>
          )}

          {activeTab === 'integrations' && (
            <Panel title="Tích hợp" subtitle="Bật/tắt kết nối demo với các công cụ hỗ trợ học tập và giảng dạy.">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <ToggleRow title="GitHub" description="Đồng bộ bài tập lập trình demo." checked={formData.settings.integrations?.github || false} onChange={(value) => updateIntegration('github', value)} boxed />
                <ToggleRow title="Google Meet" description="Tạo phòng học trực tuyến demo." checked={formData.settings.integrations?.googleMeet || false} onChange={(value) => updateIntegration('googleMeet', value)} boxed />
                <ToggleRow title="Zoom" description="Kết nối hội thảo trực tuyến demo." checked={formData.settings.integrations?.zoom || false} onChange={(value) => updateIntegration('zoom', value)} boxed />
              </div>
            </Panel>
          )}

          {activeTab === 'danger' && (
            <Panel title="Vùng nguy hiểm" subtitle="Các thao tác nhạy cảm cần xác nhận trước khi thực hiện." danger>
              <div className="space-y-3">
                <DangerAction title="Đăng xuất" description="Đăng xuất khỏi thiết bị hiện tại." button="Đăng xuất" onClick={handleLogoutDevice} />
                <DangerAction title="Vô hiệu hóa tài khoản demo" description="Chỉ mô phỏng trạng thái vô hiệu hóa, không khóa tài khoản thật." button="Vô hiệu hóa demo" onClick={handleDisableDemo} />
                <DangerAction title="Xóa tài khoản demo" description="Chỉ mô phỏng thao tác xóa, dữ liệu thật không bị xóa." button="Xóa demo" onClick={handleDeleteDemo} primary />
              </div>
            </Panel>
          )}
        </main>
      </div>
    </div>
  );
};

const Panel = ({ title, subtitle, children, danger = false }) => (
  <section className={`rounded-3xl border bg-white p-6 shadow-sm ${danger ? 'border-rose-100' : 'border-slate-100'}`}>
    <div className="mb-5">
      <h2 className={`text-xl font-semibold tracking-tight ${danger ? 'text-rose-700' : 'text-slate-900'}`}>{title}</h2>
      <p className="mt-1 text-xs text-slate-400">{subtitle}</p>
    </div>
    {children}
  </section>
);

const Field = ({ label, value, onChange, type = 'text', placeholder = '' }) => (
  <div>
    <label className="mb-1.5 block text-xs font-medium text-slate-500">{label}</label>
    <input
      type={type}
      value={value ?? ''}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-purple-400"
    />
  </div>
);

const SelectField = ({ label, value, onChange, options }) => (
  <div>
    <label className="mb-1.5 block text-xs font-medium text-slate-500">{label}</label>
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-purple-400"
    >
      {options.map(([optionValue, labelText]) => <option key={optionValue} value={optionValue}>{labelText}</option>)}
    </select>
  </div>
);

const Toggle = ({ checked, onChange }) => (
  <label className="relative inline-flex cursor-pointer items-center">
    <input type="checkbox" className="peer sr-only" checked={checked} onChange={(event) => onChange(event.target.checked)} />
    <span className="h-6 w-11 rounded-full bg-slate-200 transition peer-checked:bg-purple-600 peer-focus:ring-4 peer-focus:ring-purple-100 after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:transition peer-checked:after:translate-x-5" />
  </label>
);

const ToggleRow = ({ title, description, checked, onChange, boxed = false }) => (
  <div className={`flex items-center justify-between gap-4 py-4 ${boxed ? 'rounded-2xl border border-slate-100 px-4' : ''}`}>
    <div>
      <p className="text-sm font-medium text-slate-900">{title}</p>
      <p className="mt-1 text-xs text-slate-400">{description}</p>
    </div>
    <Toggle checked={checked} onChange={onChange} />
  </div>
);

const SettingRow = ({ icon: Icon, title, description, control }) => (
  <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-100 p-4">
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-purple-600">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-sm font-medium text-slate-900">{title}</p>
        <p className="mt-1 max-w-xl text-xs text-slate-400">{description}</p>
      </div>
    </div>
    {control}
  </div>
);

const ChoiceCard = ({ icon: Icon, title, description, active, onClick, dark = false }) => (
  <button
    onClick={onClick}
    className={`rounded-2xl border-2 p-4 text-left transition ${active ? 'border-purple-500 bg-purple-50' : 'border-slate-100 hover:border-slate-200'}`}
  >
    <div className={`mb-3 flex h-20 items-center justify-center rounded-xl ${dark ? 'bg-slate-900 text-slate-300' : 'bg-slate-50 text-slate-600'}`}>
      <Icon className="h-6 w-6" />
    </div>
    <p className="text-sm font-semibold text-slate-900">{title}</p>
    <p className="mt-1 text-xs text-slate-400">{description}</p>
  </button>
);

const DangerAction = ({ title, description, button, onClick, primary = false }) => (
  <div className="flex flex-col gap-3 rounded-2xl border border-rose-100 bg-rose-50/40 p-4 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <p className="text-sm font-medium text-slate-900">{title}</p>
      <p className="mt-1 text-xs text-slate-500">{description}</p>
    </div>
    <button
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-sm font-medium transition ${primary ? 'bg-rose-600 text-white hover:bg-rose-700' : 'border border-rose-200 bg-white text-rose-600 hover:bg-rose-50'}`}
    >
      {button}
    </button>
  </div>
);

const createDisplayName = (name = '') => name.trim().toLowerCase().replace(/\s+/g, '.') || '';

export default Settings;
