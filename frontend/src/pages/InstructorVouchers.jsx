import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
  BookOpen,
  Calendar,
  DollarSign,
  Edit3,
  Percent,
  Plus,
  Search,
  Send,
  Tag,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Users,
  X,
} from 'lucide-react';

const formatCurrency = (amount = 0) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(Number(amount) || 0);

const formatDate = (value) => {
  if (!value) return 'Chưa cập nhật';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Chưa cập nhật';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
};

const toDateInput = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
};

const initialForm = {
  code: '',
  discountType: 'PERCENTAGE',
  discountValue: '',
  minPurchaseAmount: '',
  maxDiscountAmount: '',
  usageLimit: '',
  startDate: '',
  endDate: '',
  courseId: '',
};

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-purple-400 focus:ring-2 focus:ring-purple-100';

const statusLabel = {
  ACTIVE: 'Đang hoạt động',
  INACTIVE: 'Đã tắt',
  EXPIRED: 'Hết hạn',
};

const statusClass = {
  ACTIVE: 'bg-emerald-50 text-emerald-700',
  INACTIVE: 'bg-slate-100 text-slate-500',
  EXPIRED: 'bg-amber-50 text-amber-700',
};

export default function InstructorVouchers() {
  const [vouchers, setVouchers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [sendVoucher, setSendVoucher] = useState(null);
  const [sourceCourseId, setSourceCourseId] = useState('');
  const [eligibleStudents, setEligibleStudents] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [sending, setSending] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const fetchCourses = useCallback(async () => {
    try {
      const response = await axios.get('/api/instructor/courses');
      setCourses(Array.isArray(response.data) ? response.data : response.data.items || []);
    } catch {
      setCourses([]);
    }
  }, []);

  const fetchVouchers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.get('/api/teacher/vouchers', {
        params: { q: query || undefined, status: status || undefined },
      });
      setVouchers(response.data.items || []);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  }, [query, status]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  useEffect(() => {
    fetchVouchers();
  }, [fetchVouchers]);

  const stats = useMemo(() => {
    const active = vouchers.filter((item) => item.status === 'ACTIVE').length;
    const sent = vouchers.reduce((sum, item) => sum + Number(item.recipientCount || 0), 0);
    const used = vouchers.reduce((sum, item) => sum + Number(item.usedCount ?? item.usageCount ?? 0), 0);
    return { active, sent, used };
  }, [vouchers]);

  const handleChange = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const resetForm = () => {
    setForm(initialForm);
    setEditingId(null);
    setNotice('');
    setError('');
  };

  const openCreateForm = () => {
    resetForm();
    setShowForm(true);
  };

  const openEditForm = (voucher) => {
    setForm({
      code: voucher.code || '',
      discountType: voucher.discountType || 'PERCENTAGE',
      discountValue: voucher.discountValue?.toString() || '',
      minPurchaseAmount: voucher.minPurchaseAmount?.toString() || '',
      maxDiscountAmount: voucher.maxDiscountAmount?.toString() || '',
      usageLimit: (voucher.maxUses ?? voucher.usageLimit)?.toString() || '',
      startDate: toDateInput(voucher.startDate),
      endDate: toDateInput(voucher.endDate),
      courseId: voucher.courseId || '',
    });
    setEditingId(voucher.id);
    setShowForm(true);
    setNotice('');
    setError('');
  };

  const saveVoucher = async (event) => {
    event.preventDefault();
    setSaving(true);
    setNotice('');
    setError('');

    try {
      const payload = {
        code: form.code.trim().toUpperCase(),
        discountType: form.discountType,
        discountValue: Number(form.discountValue),
        minPurchaseAmount: Number(form.minPurchaseAmount) || 0,
        maxDiscountAmount: form.maxDiscountAmount ? Number(form.maxDiscountAmount) : null,
        usageLimit: form.usageLimit ? Number(form.usageLimit) : null,
        startDate: form.startDate || null,
        endDate: form.endDate || null,
        courseId: form.courseId,
      };

      if (editingId) {
        const response = await axios.put(`/api/teacher/vouchers/${editingId}`, payload);
        setVouchers((prev) => prev.map((item) => (item.id === editingId ? response.data : item)));
        setNotice('Đã cập nhật mã giảm giá thành công.');
      } else {
        const response = await axios.post('/api/teacher/vouchers', payload);
        setVouchers((prev) => [response.data, ...prev]);
        setNotice('Đã tạo mã giảm giá cho khóa học.');
      }
      setForm(initialForm);
      setEditingId(null);
      setShowForm(false);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteVoucher = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setError('');
    setNotice('');
    try {
      await axios.delete(`/api/teacher/vouchers/${deleteTarget.id}`);
      setVouchers((prev) => prev.filter((item) => item.id !== deleteTarget.id));
      setNotice('Đã xóa voucher thành công.');
      setDeleteTarget(null);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setDeleting(false);
    }
  };

  const toggleVoucher = async (voucher) => {
    setNotice('');
    setError('');
    try {
      const response = await axios.patch(`/api/teacher/vouchers/${voucher.id}/toggle`);
      setVouchers((prev) => prev.map((item) => (item.id === voucher.id ? response.data : item)));
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  };

  const openSendModal = (voucher) => {
    setSendVoucher(voucher);
    setSourceCourseId('');
    setEligibleStudents([]);
    setSelectedStudents([]);
    setNotice('');
    setError('');
  };

  const loadEligibleStudents = async (courseId) => {
    setSourceCourseId(courseId);
    setSelectedStudents([]);
    setEligibleStudents([]);
    if (!courseId) return;

    setLoadingStudents(true);
    try {
      const response = await axios.get('/api/teacher/vouchers/eligible-students', {
        params: { sourceCourseId: courseId },
      });
      setEligibleStudents(response.data.items || []);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoadingStudents(false);
    }
  };

  const toggleStudent = (studentId) => {
    setSelectedStudents((prev) =>
      prev.includes(studentId) ? prev.filter((item) => item !== studentId) : [...prev, studentId]
    );
  };

  const sendToStudents = async () => {
    if (!sendVoucher || !sourceCourseId || selectedStudents.length === 0) return;
    setSending(true);
    setError('');
    setNotice('');
    try {
      const response = await axios.post(`/api/teacher/vouchers/${sendVoucher.id}/send`, {
        sourceCourseId,
        studentIds: selectedStudents,
      });
      setVouchers((prev) => prev.map((item) => (item.id === sendVoucher.id ? response.data.voucher : item)));
      setNotice(`Đã gửi voucher cho ${response.data.sentCount} học viên hợp lệ.`);
      setSendVoucher(null);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">Mã giảm giá</h1>
        </div>
        <button
          type="button"
          onClick={openCreateForm}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-purple-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-purple-700"
        >
          <Plus className="h-4 w-4" />
          Tạo mã mới
        </button>
      </div>

      {(notice || error) && (
        <div
          className={`rounded-2xl border p-4 text-sm ${
            error ? 'border-rose-100 bg-rose-50 text-rose-700' : 'border-emerald-100 bg-emerald-50 text-emerald-700'
          }`}
        >
          {error || notice}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: 'Đang hoạt động', value: stats.active, icon: ToggleRight, tone: 'text-emerald-600 bg-emerald-50' },
          { label: 'Đã gửi học viên', value: stats.sent, icon: Send, tone: 'text-purple-600 bg-purple-50' },
          { label: 'Đã sử dụng', value: stats.used, icon: Users, tone: 'text-amber-600 bg-amber-50' },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${item.tone}`}>
              <item.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{item.label}</p>
              <p className="text-2xl font-bold text-slate-900">{item.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Create / Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-sm">
          <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
            <button
              type="button"
              onClick={() => { setShowForm(false); resetForm(); }}
              className="absolute right-4 top-4 rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              aria-label="Đóng"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                <Tag className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900">{editingId ? 'Chỉnh sửa voucher' : 'Tạo voucher mới'}</h2>
                <p className="text-xs text-slate-500">{editingId ? 'Cập nhật thông tin mã giảm giá' : 'Tạo mã giảm giá cho khóa học của bạn'}</p>
              </div>
            </div>

            <form onSubmit={saveVoucher} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Mã giảm giá</label>
                <input
                  value={form.code}
                  onChange={handleChange('code')}
                  required
                  placeholder="VD: SKILLIO20"
                  className={`${inputClass} font-semibold uppercase tracking-wider`}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Khóa học áp dụng</label>
                <select value={form.courseId} onChange={handleChange('courseId')} required className={inputClass}>
                  <option value="">Chọn khóa học</option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.title || course.tieuDe}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Loại giảm</label>
                  <select value={form.discountType} onChange={handleChange('discountType')} className={inputClass}>
                    <option value="PERCENTAGE">Phần trăm</option>
                    <option value="FIXED_AMOUNT">Số tiền cố định</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Giá trị</label>
                  <input
                    type="number"
                    value={form.discountValue}
                    onChange={handleChange('discountValue')}
                    required
                    min="1"
                    max={form.discountType === 'PERCENTAGE' ? '100' : undefined}
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Lượt dùng tối đa</label>
                  <input type="number" value={form.usageLimit} onChange={handleChange('usageLimit')} min="1" className={inputClass} />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Đơn tối thiểu</label>
                  <input type="number" value={form.minPurchaseAmount} onChange={handleChange('minPurchaseAmount')} min="0" className={inputClass} />
                </div>
              </div>

              {form.discountType === 'PERCENTAGE' ? (
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Giảm tối đa</label>
                  <input type="number" value={form.maxDiscountAmount} onChange={handleChange('maxDiscountAmount')} min="0" className={inputClass} />
                </div>
              ) : null}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Bắt đầu</label>
                  <input type="date" value={form.startDate} onChange={handleChange('startDate')} className={inputClass} />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Kết thúc</label>
                  <input type="date" value={form.endDate} onChange={handleChange('endDate')} className={inputClass} />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowForm(false); resetForm(); }}
                  className="flex-1 rounded-xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-xl bg-purple-600 py-3 text-sm font-semibold text-white transition hover:bg-purple-700 disabled:opacity-60"
                >
                  {saving ? 'Đang lưu...' : editingId ? 'Cập nhật' : 'Tạo voucher'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Voucher List */}
      <section className="rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center">
          <label className="flex flex-1 items-center gap-2 rounded-xl border border-slate-200 px-3">
            <Search className="h-4 w-4 shrink-0 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && fetchVouchers()}
              placeholder="Tìm mã hoặc tên khóa học..."
              className="flex-1 bg-transparent py-2.5 text-sm outline-none"
            />
          </label>
          <div className="flex gap-3">
            <select value={status} onChange={(event) => setStatus(event.target.value)} className={`${inputClass} w-auto min-w-[160px]`}>
              <option value="">Tất cả trạng thái</option>
              <option value="ACTIVE">Đang hoạt động</option>
              <option value="INACTIVE">Đã tắt</option>
              <option value="EXPIRED">Hết hạn</option>
            </select>
            <button
              type="button"
              onClick={fetchVouchers}
              className="whitespace-nowrap rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              Tìm kiếm
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="whitespace-nowrap px-4 py-3">Mã</th>
                <th className="whitespace-nowrap px-4 py-3">Giảm giá</th>
                <th className="whitespace-nowrap px-4 py-3">Khóa học</th>
                <th className="whitespace-nowrap px-4 py-3">Lượt dùng</th>
                <th className="whitespace-nowrap px-4 py-3">Thời hạn</th>
                <th className="whitespace-nowrap px-4 py-3">Trạng thái</th>
                <th className="whitespace-nowrap px-4 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-5 py-10 text-center text-slate-500">
                    <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-purple-600 border-t-transparent" />
                  </td>
                </tr>
              ) : vouchers.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-5 py-10 text-center text-slate-500">
                    Chưa có voucher nào.
                  </td>
                </tr>
              ) : (
                vouchers.map((voucher) => (
                  <tr key={voucher.id} className="transition hover:bg-slate-50/80">
                    <td className="whitespace-nowrap px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
                          <Tag className="h-3.5 w-3.5" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-mono text-sm font-bold tracking-wider text-slate-900">{voucher.code}</p>
                          {voucher.isPrivate ? <p className="text-xs text-purple-600">Riêng cho học viên</p> : null}
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {voucher.discountType === 'PERCENTAGE' ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                          <Percent className="h-3 w-3" />
                          {voucher.discountValue}%
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                          <DollarSign className="h-3 w-3" />
                          {formatCurrency(voucher.discountValue)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="block max-w-[160px] truncate text-slate-700" title={voucher.course?.title || 'Tất cả khóa học'}>
                        {voucher.course?.title || 'Tất cả khóa học'}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className="font-semibold text-slate-900">{voucher.usedCount ?? voucher.usageCount ?? 0}</span>
                      {voucher.maxUses || voucher.usageLimit ? (
                        <span className="text-xs text-slate-400"> / {voucher.maxUses ?? voucher.usageLimit}</span>
                      ) : null}
                      <p className="mt-0.5 text-xs text-slate-400">{voucher.recipientCount || 0} người nhận</p>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <Calendar className="h-3.5 w-3.5 shrink-0" />
                        <span>{formatDate(voucher.startDate)} - {formatDate(voucher.endDate)}</span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass[voucher.status] || statusClass.ACTIVE}`}>
                        {statusLabel[voucher.status] || voucher.status || 'Đang hoạt động'}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => openEditForm(voucher)}
                          className="rounded-lg p-2 text-slate-400 transition hover:bg-blue-50 hover:text-blue-600"
                          title="Chỉnh sửa"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openSendModal(voucher)}
                          className="rounded-lg p-2 text-slate-400 transition hover:bg-purple-50 hover:text-purple-600"
                          title="Gửi voucher"
                        >
                          <Send className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleVoucher(voucher)}
                          className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                          title={voucher.status === 'ACTIVE' ? 'Tắt voucher' : 'Bật voucher'}
                        >
                          {voucher.status === 'ACTIVE' ? <ToggleRight className="h-4 w-4 text-emerald-500" /> : <ToggleLeft className="h-4 w-4" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(voucher)}
                          className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                          title="Xóa voucher"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Delete Confirmation Modal */}
      {deleteTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
              <Trash2 className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Xóa voucher</h3>
            <p className="mt-2 text-sm text-slate-600">
              Bạn có chắc muốn xóa mã giảm giá <span className="font-mono font-bold text-slate-900">{deleteTarget.code}</span> không?
              Hành động này không thể hoàn tác.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={deleteVoucher}
                disabled={deleting}
                className="flex-1 rounded-xl bg-rose-600 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-60"
              >
                {deleting ? 'Đang xóa...' : 'Xóa voucher'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Send Voucher Modal */}
      {sendVoucher ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-sm">
          <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
            <button
              type="button"
              onClick={() => setSendVoucher(null)}
              className="absolute right-4 top-4 rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              aria-label="Đóng"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="mb-5">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-purple-500">Gửi voucher</p>
              <h2 className="mt-1 text-2xl font-bold text-slate-900">{sendVoucher.code}</h2>
              <p className="mt-2 text-sm text-slate-500">
                Chọn khóa học nguồn. Học viên đã mua hoặc hoàn thành khóa học đó mới được nhận voucher này.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Khóa học nguồn</label>
                <select value={sourceCourseId} onChange={(event) => loadEligibleStudents(event.target.value)} className={inputClass}>
                  <option value="">Chọn khóa học đã có học viên</option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.title || course.tieuDe}
                    </option>
                  ))}
                </select>
              </div>

              <div className="rounded-2xl border border-slate-100">
                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <Users className="h-4 w-4 text-purple-600" />
                    Học viên đủ điều kiện
                  </div>
                  {eligibleStudents.length > 0 ? (
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedStudents(
                          selectedStudents.length === eligibleStudents.length ? [] : eligibleStudents.map((student) => student.id)
                        )
                      }
                      className="text-xs font-semibold text-purple-600 hover:underline"
                    >
                      {selectedStudents.length === eligibleStudents.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                    </button>
                  ) : null}
                </div>

                <div className="max-h-64 overflow-y-auto p-3">
                  {loadingStudents ? (
                    <div className="py-8 text-center text-sm text-slate-500">Đang tải học viên...</div>
                  ) : eligibleStudents.length === 0 ? (
                    <div className="py-8 text-center text-sm text-slate-500">
                      {sourceCourseId ? 'Chưa có học viên đủ điều kiện.' : 'Vui lòng chọn khóa học nguồn.'}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {eligibleStudents.map((student) => (
                        <label
                          key={student.id}
                          className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 transition hover:bg-purple-50"
                        >
                          <input
                            type="checkbox"
                            checked={selectedStudents.includes(student.id)}
                            onChange={() => toggleStudent(student.id)}
                            className="h-4 w-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                          />
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-600">
                            {(student.name || 'H').charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-900">{student.name || 'Học viên'}</p>
                            <p className="truncate text-xs text-slate-500">{student.email}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={sendToStudents}
                disabled={!sourceCourseId || selectedStudents.length === 0 || sending}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-purple-600 py-3 text-sm font-semibold text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Send className="h-4 w-4" />
                {sending ? 'Đang gửi...' : `Gửi cho ${selectedStudents.length} học viên`}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
