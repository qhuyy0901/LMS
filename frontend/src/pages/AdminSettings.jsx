import { useEffect, useRef, useState } from 'react';
import {
  Check,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  LogOut,
  RotateCcw,
  Upload,
  User,
} from 'lucide-react';
import axios from 'axios';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import UserAvatar from '../components/UserAvatar';

const defaultSettings = {
  theme: 'light',
  language: 'vi',
  timezone: 'Asia/Ho_Chi_Minh',
};

const tabs = [
  { id: 'profile', icon: User, label: 'Thông tin tài khoản' },
  { id: 'password', icon: KeyRound, label: 'Đổi mật khẩu' },
];

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

export default function AdminSettings() {
  const { user, logout, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const fileInputRef = useRef(null);

  const [activeTab, setActiveTab] = useState(() => {
    const tabParam = searchParams.get('tab');
    return tabs.some((t) => t.id === tabParam) ? tabParam : 'profile';
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [message, setMessage] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  // Password fields
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Profile fields
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    bio: '',
    settings: defaultSettings,
  });



  const displayName = formData.name || user?.name || 'Quản trị viên';

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabs.some((t) => t.id === tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const selectTab = (tabId) => {
    setActiveTab(tabId);
    setMessage(null);
    setSearchParams({ tab: tabId }, { replace: true });
  };

  const loadSettings = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const profileResponse = await axios.get('/api/user/me');
      const profile = profileResponse.data;
      setAvatarUrl(profile.avatar || null);
      setFormData({
        name: profile.name || '',
        phone: profile.phone || '',
        bio: profile.bio || '',
        settings: {
          ...defaultSettings,
          ...profile.settings,
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

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const response = await axios.put('/api/user/me', formData);
      await refreshUser?.();
      setMessage({ type: 'success', text: 'Đã lưu thay đổi thông tin thành công.' });
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

  if (loading) {
    return (
      <div className="animate-fade-in space-y-6">
        <div className="h-20 rounded-2xl bg-slate-100 animate-pulse" />
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-4">
          <div className="h-96 rounded-2xl bg-slate-100 animate-pulse" />
          <div className="h-96 rounded-2xl bg-slate-100 animate-pulse xl:col-span-3" />
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-slate-100 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">Cài đặt tài khoản quản trị</h1>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={loadSettings}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
          >
            <RotateCcw className="h-4 w-4" />
            Tải lại
          </button>
          {activeTab === 'profile' && (
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-full bg-purple-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-purple-700 disabled:opacity-60"
            >
              <Check className="h-4 w-4" />
              {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
          )}
        </div>
      </div>

      <StatusMessage message={message} />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-4 items-start">
        {/* Settings Sidebar */}
        <aside className="xl:col-span-1 flex flex-col gap-1 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
          {tabs.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => selectTab(item.id)}
                className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-sm transition-colors ${
                  isActive
                    ? 'bg-purple-50 font-semibold text-purple-700'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </button>
            );
          })}
          <div className="my-2 border-t border-slate-100" />
          <button
            type="button"
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-sm font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Đăng xuất
          </button>
        </aside>

        {/* Content Area */}
        <main className="xl:col-span-3">
          {/* TAB 1: Profile Info */}
          {activeTab === 'profile' && (
            <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm space-y-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Thông tin tài khoản</h2>
              </div>

              <div className="flex flex-col gap-4 rounded-2xl border border-purple-100 bg-gradient-to-br from-purple-50 to-pink-50 p-4 md:flex-row md:items-center">
                <UserAvatar src={avatarUrl} name={displayName} className="h-16 w-16 shrink-0 rounded-2xl shadow-sm" fallbackClassName="text-xl" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-900">Ảnh đại diện</p>
                  <p className="text-xs text-slate-500">Định dạng PNG, JPG hoặc WebP dưới 2MB. Ảnh hiển thị bên cạnh tên quản trị viên.</p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png, image/jpeg, image/webp"
                  className="hidden"
                  onChange={handleAvatarUpload}
                />
                <div className="flex gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 transition"
                  >
                    <Upload className="h-4 w-4" />
                    {uploadingAvatar ? 'Đang tải...' : 'Tải lên'}
                  </button>
                  {avatarUrl && (
                    <button
                      type="button"
                      onClick={handleAvatarDelete}
                      disabled={uploadingAvatar}
                      className="text-sm font-semibold text-slate-500 hover:text-rose-600 px-2.5 py-2 disabled:opacity-60 transition"
                    >
                      Xóa
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <FieldLabel>Họ và tên</FieldLabel>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-purple-400 focus:ring-4 focus:ring-purple-100"
                  />
                </div>
                <div>
                  <FieldLabel>Email (Tài khoản chính)</FieldLabel>
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
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-purple-400 focus:ring-4 focus:ring-purple-100"
                  />
                </div>
                <div>
                  <FieldLabel>Vai trò hệ thống</FieldLabel>
                  <span className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-500 font-semibold select-none">
                    Quản trị viên (ADMIN)
                  </span>
                </div>
                <div className="md:col-span-2">
                  <FieldLabel>Giới thiệu / Ghi chú admin</FieldLabel>
                  <textarea
                    rows="3"
                    value={formData.bio}
                    onChange={(event) => setFormData({ ...formData, bio: event.target.value })}
                    placeholder="Thông tin giới thiệu ngắn của admin..."
                    className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-purple-400 focus:ring-4 focus:ring-purple-100"
                  />
                </div>
              </div>
            </section>
          )}



          {/* TAB 3: Change Password */}
          {activeTab === 'password' && (
            <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm space-y-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Thay đổi mật khẩu</h2>
              </div>

              <form onSubmit={handlePasswordChange} className="max-w-md space-y-4">
                <div>
                  <FieldLabel>Mật khẩu hiện tại</FieldLabel>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={passwordForm.currentPassword}
                    onChange={(event) => setPasswordForm({ ...passwordForm, currentPassword: event.target.value })}
                    required
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-purple-400 focus:ring-4 focus:ring-purple-100"
                  />
                </div>
                <div>
                  <FieldLabel>Mật khẩu mới</FieldLabel>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={passwordForm.newPassword}
                    onChange={(event) => setPasswordForm({ ...passwordForm, newPassword: event.target.value })}
                    required
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-purple-400 focus:ring-4 focus:ring-purple-100"
                  />
                </div>
                <div>
                  <FieldLabel>Nhập lại mật khẩu mới</FieldLabel>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={passwordForm.confirmPassword}
                    onChange={(event) => setPasswordForm({ ...passwordForm, confirmPassword: event.target.value })}
                    required
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-purple-400 focus:ring-4 focus:ring-purple-100"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    {showPassword ? 'Ẩn' : 'Hiện'} mật khẩu
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60 transition"
                  >
                    <KeyRound className="h-4 w-4" />
                    {saving ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}
                  </button>
                </div>
              </form>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
