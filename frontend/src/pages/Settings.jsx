import { useState, useEffect, useRef } from 'react';
import { AlertTriangle, Bell, Check, CreditCard, Code, GraduationCap, KeyRound, MessageSquare, Monitor, Moon, Palette, PenTool, Plug, RotateCcw, Shield, ShieldCheck, Sun, Upload, User, Video, LogOut } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const defaultSettings = {
  theme: 'auto',
  language: 'vi',
  autoPlayVideo: true,
  showSubtitles: true,
  videoQuality: 'auto',
};

const Settings = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('profile');
  
  // State quản lý dữ liệu User Settings
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [walletProfile, setWalletProfile] = useState(null);
  const [walletHistory, setWalletHistory] = useState([]);
  const fileInputRef = useRef(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    bio: '',
    settings: defaultSettings,
  });

  useEffect(() => {
    const fetchUserSettings = async () => {
      try {
        const [profileResponse, historyResponse] = await Promise.all([
          axios.get('/api/user/me'),
          axios.get('/api/user/billing-history')
        ]);
        const data = profileResponse.data;
        setAvatarUrl(data.avatar || null);
        setWalletProfile(data);
        setWalletHistory(historyResponse.data || []);
        setFormData({
          name: data.name || '',
          phone: data.phone || '',
          bio: data.bio || '',
          settings: {
            ...defaultSettings,
            ...data.settings,
          },
        });
      } catch (error) {
        console.error('Lỗi tải cài đặt:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchUserSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await axios.put('/api/user/me', formData);
      setWalletProfile(response.data);
      alert('Đã lưu thay đổi thành công!');
    } catch (error) {
      console.error('Lỗi lưu cài đặt:', error);
      alert('Không thể lưu cài đặt.');
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (key, value) => {
    setFormData(prev => ({
      ...prev,
      settings: { ...prev.settings, [key]: value }
    }));
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('Kích thước ảnh quá lớn! Tối đa 2MB.');
      return;
    }

    setUploadingAvatar(true);
    const formData = new FormData();
    formData.append('avatar', file);

    try {
      const response = await axios.post('/api/user/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setAvatarUrl(response.data.avatarUrl);
      alert('Tải ảnh đại diện thành công!');
    } catch (error) {
      console.error('Lỗi upload avatar:', error);
      alert(error.response?.data?.message || 'Không thể tải lên ảnh đại diện.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleAvatarDelete = async () => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa ảnh đại diện?')) return;
    
    setUploadingAvatar(true);
    try {
      await axios.delete('/api/user/avatar');
      setAvatarUrl(null);
    } catch (error) {
      console.error('Lỗi xóa avatar:', error);
      alert('Không thể xóa ảnh đại diện.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleDeleteAccount = async () => {
    const isConfirmed = window.confirm(
      'CẢNH BÁO MẤT DỮ LIỆU: Bạn có chắc chắn muốn xóa vĩnh viễn tài khoản này không? Toàn bộ tiến trình học, khóa học và dữ liệu liên quan sẽ bị xóa và không thể khôi phục.'
    );
    
    if (!isConfirmed) return;

    try {
      await axios.delete('/api/user/me');
      alert('Tài khoản của bạn đã được xóa thành công.');
      logout();
      navigate('/login');
    } catch (error) {
      console.error('Lỗi xóa tài khoản:', error);
      alert(error.response?.data?.message || 'Lỗi hệ thống khi xóa tài khoản.');
    }
  };

  return (
    <div className="animate-fade-in-up">
      {/* Page header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900 mb-1">
              Cài đặt
            </h1>
            <p className="text-sm text-slate-500">
              Quản lý hồ sơ, bảo mật, thông báo và tùy chọn học tập của bạn.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.location.reload()}
              disabled={loading || saving}
              className="bg-white border border-slate-200 text-slate-600 px-4 py-2.5 rounded-full text-sm font-medium inline-flex items-center gap-2 hover:bg-slate-50 transition-colors">
              <RotateCcw className="w-4 h-4" />
              Hoàn tác
            </button>
            <button
              onClick={handleSave}
              disabled={loading || saving}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2.5 rounded-full text-sm font-medium inline-flex items-center gap-2 transition-colors disabled:opacity-70">
              <Check className="w-4 h-4" />
              {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Settings nav */}
          <aside className="xl:col-span-1">
            <div className="bg-white rounded-2xl p-3 border border-slate-100 sticky top-4 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 flex flex-col gap-1">
              {[
                { id: 'profile', icon: User, label: 'Hồ sơ' },
                { id: 'account', icon: Shield, label: 'Tài khoản & Bảo mật' },
                { id: 'notify', icon: Bell, label: 'Thông báo' },
                { id: 'appearance', icon: Palette, label: 'Giao diện' },
                { id: 'learning', icon: GraduationCap, label: 'Học tập' },
                { id: 'billing', icon: CreditCard, label: 'Thanh toán' },
                { id: 'integrations', icon: Plug, label: 'Tích hợp' },
                { id: 'danger', icon: AlertTriangle, label: 'Vùng nguy hiểm', danger: true },
              ].map(item => {
                const isActive = activeTab === item.id;
                const activeClass = item.danger ? "bg-rose-50 text-rose-700" : "bg-purple-50 text-purple-700";
                const inactiveClass = item.danger ? "text-rose-600 hover:bg-rose-50" : "text-slate-600 hover:bg-slate-50";
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`flex items-center w-full text-left gap-3 px-3 py-2.5 rounded-lg transition-all duration-300 ${isActive ? activeClass : inactiveClass}`}
                  >
                    <item.icon className="w-4 h-4" />
                    <span className={`text-sm ${isActive ? 'font-medium' : ''}`}>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </aside>

          {/* Settings content */}
          <div className="xl:col-span-3">

            
            {activeTab === 'profile' && (
              <div className="animate-fade-in-up">
{/* Profile */}
            <div id="profile" className="bg-white rounded-2xl p-6 border border-slate-100">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-xl font-semibold tracking-tight text-slate-900">
                    Hồ sơ
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Thông tin hiển thị công khai trên trang cá nhân của bạn
                  </p>
                </div>
              </div>
              <div
                className="flex items-center gap-4 mb-6 p-4 rounded-2xl bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-100">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-16 h-16 rounded-2xl object-cover shrink-0 shadow-sm" />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-300 to-purple-400 shrink-0 flex items-center justify-center text-white font-bold text-xl shadow-sm">
                    {formData.name ? formData.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                )}
                
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-900">
                    Ảnh đại diện
                  </p>
                  <p className="text-xs text-slate-500">
                    PNG, JPG dưới 2MB. Tỉ lệ vuông được khuyến nghị.
                  </p>
                </div>
                
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleAvatarUpload} 
                  accept="image/png, image/jpeg, image/webp" 
                  className="hidden" 
                />
                
                <button
                  onClick={() => fileInputRef.current.click()}
                  disabled={uploadingAvatar}
                  className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-full text-sm font-medium inline-flex items-center gap-2 disabled:opacity-50">
                  <Upload className="w-4 h-4" />
                  {uploadingAvatar ? 'Đang tải...' : 'Tải lên'}
                </button>
                
                {avatarUrl && (
                  <button 
                    onClick={handleAvatarDelete}
                    disabled={uploadingAvatar}
                    className="text-sm text-slate-500 hover:text-rose-600 disabled:opacity-50">
                    Xóa
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-500 mb-1.5 block">
                    Họ và tên
                  </label>
                  <input type="text" 
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-purple-400" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 mb-1.5 block">
                    Tên hiển thị
                  </label>
                  <input type="text" value={formData.name.toLowerCase().replace(/\s+/g, '.') || ''} disabled
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none text-slate-500 cursor-not-allowed" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 mb-1.5 block">
                    Email
                  </label>
                  <input type="email" value={user?.email || ''} disabled
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none text-slate-500 cursor-not-allowed" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 mb-1.5 block">
                    Số điện thoại
                  </label>
                  <input type="tel" 
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    placeholder="+84 909 123 456"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-purple-400" />
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs font-medium text-slate-500 mb-1.5 block">
                    Giới thiệu
                  </label>
                  <textarea rows="3"
                    value={formData.bio}
                    onChange={(e) => setFormData({...formData, bio: e.target.value})}
                    placeholder="Viết một chút về bản thân bạn..."
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-purple-400"></textarea>
                </div>
              </div>
            </div>
              </div>
            )}


            
            {activeTab === 'account' && (
              <div className="animate-fade-in-up">
{/* Account & Security */}
            <div id="account" className="bg-white rounded-2xl p-6 border border-slate-100">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-xl font-semibold tracking-tight text-slate-900">
                    Tài khoản &amp; Bảo mật
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Mật khẩu, xác thực hai yếu tố và phiên đăng nhập
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                      <KeyRound className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        Mật khẩu
                      </p>
                      <p className="text-xs text-slate-400">
                        Đã đổi 3 tháng trước
                      </p>
                    </div>
                  </div>
                  <button className="text-sm font-medium text-purple-600">
                    Đổi mật khẩu
                  </button>
                </div>
                <div className="flex items-center justify-between p-4 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                      <ShieldCheck className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        Xác thực hai yếu tố (2FA)
                      </p>
                      <p className="text-xs text-slate-400">
                        Bảo vệ tài khoản bằng ứng dụng xác thực
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div
                      className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:bg-purple-600 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition peer-checked:after:translate-x-5">
                    </div>
                  </label>
                </div>
                <div className="flex items-center justify-between p-4 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                      <Monitor className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        Phiên đăng nhập
                      </p>
                      <p className="text-xs text-slate-400">
                        3 thiết bị đang hoạt động
                      </p>
                    </div>
                  </div>
                  <button className="text-sm font-medium text-purple-600">
                    Quản lý
                  </button>
                </div>
              </div>
            </div>
              </div>
            )}


            
            {activeTab === 'notify' && (
              <div className="animate-fade-in-up">
{/* Notifications */}
            <div id="notify" className="bg-white rounded-2xl p-6 border border-slate-100">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-xl font-semibold tracking-tight text-slate-900">
                    Thông báo
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Chọn loại thông báo bạn muốn nhận
                  </p>
                </div>
              </div>
              <div className="divide-y divide-slate-100">
                <div className="flex items-center justify-between py-4">
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      Email tóm tắt hàng tuần
                    </p>
                    <p className="text-xs text-slate-400">
                      Tổng kết tiến độ học và đề xuất khóa học mới
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div
                      className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:bg-purple-600 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition peer-checked:after:translate-x-5">
                    </div>
                  </label>
                </div>
                <div className="flex items-center justify-between py-4">
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      Nhắc nhở giờ học trực tiếp
                    </p>
                    <p className="text-xs text-slate-400">
                      Nhận thông báo trước 15 phút khi có lớp Live
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div
                      className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:bg-purple-600 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition peer-checked:after:translate-x-5">
                    </div>
                  </label>
                </div>
                <div className="flex items-center justify-between py-4">
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      Tin nhắn từ giảng viên
                    </p>
                    <p className="text-xs text-slate-400">
                      Đẩy thông báo khi có phản hồi từ mentor
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" />
                    <div
                      className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:bg-purple-600 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition peer-checked:after:translate-x-5">
                    </div>
                  </label>
                </div>
                <div className="flex items-center justify-between py-4">
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      Khuyến mãi &amp; ưu đãi
                    </p>
                    <p className="text-xs text-slate-400">
                      Email về các khóa học giảm giá
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" />
                    <div
                      className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:bg-purple-600 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition peer-checked:after:translate-x-5">
                    </div>
                  </label>
                </div>
              </div>
            </div>
              </div>
            )}


            
            {activeTab === 'appearance' && (
              <div className="animate-fade-in-up">
{/* Appearance */}
            <div id="appearance" className="bg-white rounded-2xl p-6 border border-slate-100">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-xl font-semibold tracking-tight text-slate-900">
                    Giao diện
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Tùy chỉnh chủ đề và ngôn ngữ hiển thị
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
                <button 
                  onClick={() => updateSetting('theme', 'light')}
                  className={`p-4 rounded-2xl border-2 text-left transition-colors ${formData.settings.theme === 'light' ? 'border-purple-500 bg-purple-50/40' : 'border-slate-100 hover:border-slate-200'}`}>
                  <div className="h-20 rounded-xl bg-white border border-slate-200 mb-3 flex items-center justify-center">
                    <Sun className="w-6 h-6 text-amber-500" />
                  </div>
                  <p className="text-sm font-semibold text-slate-900">Sáng</p>
                  <p className="text-xs text-slate-400">Mặc định</p>
                </button>
                <button 
                  onClick={() => updateSetting('theme', 'dark')}
                  className={`p-4 rounded-2xl border-2 text-left transition-colors ${formData.settings.theme === 'dark' ? 'border-purple-500 bg-purple-50/40' : 'border-slate-100 hover:border-slate-200'}`}>
                  <div className="h-20 rounded-xl bg-slate-900 mb-3 flex items-center justify-center">
                    <Moon className="w-6 h-6 text-slate-300" />
                  </div>
                  <p className="text-sm font-semibold text-slate-900">Tối</p>
                  <p className="text-xs text-slate-400">Dễ chịu cho mắt</p>
                </button>
                <button 
                  onClick={() => updateSetting('theme', 'auto')}
                  className={`p-4 rounded-2xl border-2 text-left transition-colors ${formData.settings.theme === 'auto' ? 'border-purple-500 bg-purple-50/40' : 'border-slate-100 hover:border-slate-200'}`}>
                  <div
                    className="h-20 rounded-xl bg-gradient-to-br from-white to-slate-900 mb-3 flex items-center justify-center">
                    <Monitor className="w-6 h-6 text-slate-600" />
                  </div>
                  <p className="text-sm font-semibold text-slate-900">Tự động</p>
                  <p className="text-xs text-slate-400">Theo hệ thống</p>
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-500 mb-1.5 block">
                    Ngôn ngữ
                  </label>
                  <select
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-purple-400">
                    <option>Tiếng Việt</option>
                    <option>English</option>
                    <option>日本語</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 mb-1.5 block">
                    Múi giờ
                  </label>
                  <select
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-purple-400">
                    <option>(GMT+7) Hà Nội</option>
                    <option>(GMT+9) Tokyo</option>
                    <option>(GMT+0) UTC</option>
                  </select>
                </div>
              </div>
            </div>
              </div>
            )}


            
            {activeTab === 'learning' && (
              <div className="animate-fade-in-up">
{/* Learning */}
            <div id="learning" className="bg-white rounded-2xl p-6 border border-slate-100">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-xl font-semibold tracking-tight text-slate-900">
                    Học tập
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Tùy chỉnh trải nghiệm trong lớp học
                  </p>
                </div>
              </div>
              <div className="divide-y divide-slate-100">
                <div className="flex items-center justify-between py-4">
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      Tự động phát video
                    </p>
                    <p className="text-xs text-slate-400">
                      Tự động chuyển sang bài học tiếp theo khi kết thúc video
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" 
                      checked={formData.settings.autoPlayVideo}
                      onChange={(e) => updateSetting('autoPlayVideo', e.target.checked)}
                    />
                    <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:bg-purple-600 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition peer-checked:after:translate-x-5"></div>
                  </label>
                </div>
                <div className="flex items-center justify-between py-4">
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      Hiển thị phụ đề
                    </p>
                    <p className="text-xs text-slate-400">
                      Luôn bật phụ đề tiếng Việt nếu có sẵn
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" 
                      checked={formData.settings.showSubtitles}
                      onChange={(e) => updateSetting('showSubtitles', e.target.checked)}
                    />
                    <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:bg-purple-600 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition peer-checked:after:translate-x-5"></div>
                  </label>
                </div>
                <div className="py-4">
                  <label className="text-xs font-medium text-slate-500 mb-1.5 block">
                    Chất lượng video mặc định
                  </label>
                  <select 
                    value={formData.settings.videoQuality}
                    onChange={(e) => updateSetting('videoQuality', e.target.value)}
                    className="w-full md:w-1/2 bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-purple-400">
                    <option value="auto">Tự động (Khuyến nghị)</option>
                    <option value="1080p">1080p HD</option>
                    <option value="720p">720p HD</option>
                    <option value="480p">480p Tiết kiệm dữ liệu</option>
                  </select>
                </div>
              </div>
            </div>
              </div>
            )}


            
            {activeTab === 'billing' && (
              <div className="animate-fade-in-up">
                <div id="billing" className="bg-white rounded-2xl p-6 border border-slate-100">
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <h3 className="text-xl font-semibold tracking-tight text-slate-900">Ví hội viên</h3>
                      <p className="text-xs text-slate-400 mt-1">Quản lý số dư ví nội bộ, danh hiệu và lịch sử giao dịch</p>
                    </div>
                    <button
                      onClick={() => navigate('/upgrade')}
                      className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
                    >
                      Nạp thêm vào ví
                    </button>
                  </div>

                  <div className="mb-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div className="rounded-2xl border border-amber-100 bg-gradient-to-r from-amber-50 to-orange-50 p-5">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700 mb-2">Danh hiệu</p>
                      <p className="text-2xl font-bold text-slate-900">{walletProfile?.memberTierLabel || walletProfile?.memberTier || 'Đồng'}</p>
                      <p className="text-xs text-slate-500 mt-2">Tự động nâng cấp theo tổng chi tiêu tích lũy</p>
                    </div>

                    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 mb-2">Số dư ví</p>
                      <p className="text-2xl font-bold text-slate-900">
                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(walletProfile?.walletBalance || 0)}
                      </p>
                      <p className="text-xs text-slate-500 mt-2">Dùng để mua khóa học trả phí trong hệ thống</p>
                    </div>

                    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 mb-2">Tổng chi tiêu</p>
                      <p className="text-2xl font-bold text-slate-900">
                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(walletProfile?.totalSpent || 0)}
                      </p>
                      <p className="text-xs text-slate-500 mt-2">Giá trị dùng để xếp hạng hội viên</p>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-slate-900 mb-3">Lịch sử giao dịch</h4>
                    <div className="space-y-3">
                      {walletHistory.length > 0 ? (
                        walletHistory.map((item) => (
                          <div key={item.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors gap-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                                <CreditCard className="w-5 h-5 text-slate-500" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-slate-900">{item.note || item.type}</p>
                                <p className="text-xs text-slate-400">
                                  {new Date(item.createdAt).toLocaleString('vi-VN')} {item.course?.title ? `• ${item.course.title}` : ''}
                                </p>
                              </div>
                            </div>
                            <div className="text-left sm:text-right w-full sm:w-auto">
                              <p className={`text-sm font-medium ${item.amount >= 0 ? 'text-emerald-600' : 'text-slate-900'}`}>
                                {item.amountText}
                              </p>
                              <p className="text-[10px] text-slate-400">Số dư sau GD: {item.balanceAfterText}</p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="rounded-xl border border-dashed border-slate-200 p-6 text-sm text-slate-500 text-center">
                          Chưa có giao dịch nào trong ví nội bộ.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}


            
            {activeTab === 'integrations' && (
              <div className="animate-fade-in-up">
{/* Integrations */}
            <div id="integrations" className="bg-white rounded-2xl p-6 border border-slate-100">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-xl font-semibold tracking-tight text-slate-900">
                    Tích hợp
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Kết nối tài khoản với các nền tảng khác
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex items-center justify-between p-4 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center">
                      <Code className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">GitHub</p>
                      <p className="text-xs text-emerald-600">Đã kết nối</p>
                    </div>
                  </div>
                  <button className="text-xs font-medium text-slate-500">
                    Ngắt
                  </button>
                </div>
                <div className="flex items-center justify-between p-4 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center">
                      <MessageSquare className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">Slack</p>
                      <p className="text-xs text-slate-400">Chưa kết nối</p>
                    </div>
                  </div>
                  <button className="text-xs font-medium text-purple-600">
                    Kết nối
                  </button>
                </div>
                <div className="flex items-center justify-between p-4 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-rose-500 flex items-center justify-center">
                      <Video className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        YouTube
                      </p>
                      <p className="text-xs text-emerald-600">Đã kết nối</p>
                    </div>
                  </div>
                  <button className="text-xs font-medium text-slate-500">
                    Ngắt
                  </button>
                </div>
                <div className="flex items-center justify-between p-4 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center">
                      <PenTool className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">Figma</p>
                      <p className="text-xs text-slate-400">Chưa kết nối</p>
                    </div>
                  </div>
                  <button className="text-xs font-medium text-purple-600">
                    Kết nối
                  </button>
                </div>
              </div>
            </div>

              </div>
            )}

            {activeTab === 'danger' && (
              <div className="animate-fade-in-up">
            {/* Danger zone */}
            <div id="danger" className="bg-white rounded-2xl p-6 border border-rose-100">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-xl font-semibold tracking-tight text-rose-700">
                    Vùng nguy hiểm
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Các hành động không thể hoàn tác
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 rounded-xl border border-rose-100 bg-rose-50/30">
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      Xuất dữ liệu của tôi
                    </p>
                    <p className="text-xs text-slate-500">
                      Tải về toàn bộ dữ liệu học tập dưới dạng JSON
                    </p>
                  </div>
                  <button
                    className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-full text-sm font-medium">
                    Xuất
                  </button>
                </div>
                <div className="flex items-center justify-between p-4 rounded-xl border border-rose-100 bg-rose-50/30">
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      Đăng xuất
                    </p>
                    <p className="text-xs text-slate-500">
                      Đăng xuất khỏi thiết bị này
                    </p>
                  </div>
                  <button 
                    onClick={() => {
                      if (window.confirm('Bạn có chắc chắn muốn thoát?')) {
                        logout();
                        navigate('/login');
                      }
                    }}
                    className="bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-2">
                    <LogOut className="w-4 h-4" /> Đăng xuất
                  </button>
                </div>
                
                <div className="flex items-center justify-between p-4 rounded-xl border border-rose-100 bg-rose-50/30">
                  <div>
                    <p className="text-sm font-medium text-rose-700">
                      Xóa tài khoản
                    </p>
                    <p className="text-xs text-slate-500">
                      Xóa vĩnh viễn tài khoản và toàn bộ dữ liệu liên quan
                    </p>
                  </div>
                  <button 
                    onClick={handleDeleteAccount}
                    className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-full text-sm font-medium transition-colors">
                    Xóa tài khoản
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
        </div>
      
    </div>
  );
};

export default Settings;
