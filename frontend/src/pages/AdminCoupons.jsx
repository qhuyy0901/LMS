import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { BookOpen, Calendar, DollarSign, Hash, Percent, Plus, Search, Tag, ToggleLeft, ToggleRight, Trash2, X } from 'lucide-react';
import DataTable from '../components/DataTable';
import DataTableToolbar from '../components/DataTableToolbar';

const formatCurrency = (amount = 0) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);

const formatDate = (value) => {
  if (!value) return '-';
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(value));
};

const INITIAL_FORM = {
  code: '',
  discountType: 'PERCENTAGE',
  discountValue: '',
  minPurchaseAmount: '',
  maxDiscountAmount: '',
  startDate: '',
  endDate: '',
  usageLimit: '',
  courseId: '',
};

function CreateCouponModal({ onClose, onCreated }) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [courses, setCourses] = useState([]);
  const [courseQuery, setCourseQuery] = useState('');
  const [showCourseDropdown, setShowCourseDropdown] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const response = await axios.get('/api/courses', { params: { pageSize: 50, paginate: true } });
        setCourses(response.data.items || []);
      } catch {
        setCourses([]);
      }
    };
    fetchCourses();
  }, []);

  const filteredCourses = courses.filter(
    (course) =>
      course.title?.toLowerCase().includes(courseQuery.toLowerCase()) ||
      course.slug?.toLowerCase().includes(courseQuery.toLowerCase())
  );

  const handleChange = (field) => (event) => setForm((prev) => ({ ...prev, [field]: event.target.value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const payload = {
        code: form.code,
        discountType: form.discountType,
        discountValue: Number(form.discountValue),
        minPurchaseAmount: Number(form.minPurchaseAmount) || 0,
        maxDiscountAmount: form.maxDiscountAmount ? Number(form.maxDiscountAmount) : null,
        startDate: form.startDate || null,
        endDate: form.endDate || null,
        usageLimit: form.usageLimit ? Number(form.usageLimit) : null,
        courseId: form.courseId || null,
      };
      const response = await axios.post('/api/admin/coupons', payload);
      onCreated(response.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    'w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition-all focus:border-purple-400 focus:ring-2 focus:ring-purple-100';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-8 shadow-2xl">
        <button onClick={onClose} className="absolute right-4 top-4 rounded-full p-2 transition hover:bg-slate-100">
          <X className="h-5 w-5 text-slate-400" />
        </button>

        <div className="mb-6">
          <div className="mb-2 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100">
              <Tag className="h-5 w-5 text-purple-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Tạo mã giảm giá mới</h2>
          </div>
          <p className="text-sm text-slate-500">Điền thông tin bên dưới để tạo mã giảm giá cho khóa học.</p>
        </div>

        {error && <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Mã giảm giá *</label>
            <input value={form.code} onChange={handleChange('code')} placeholder="VD: CHAOHE2026" className={`${inputClass} font-semibold uppercase tracking-wider`} required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Loại giảm giá</label>
              <select value={form.discountType} onChange={handleChange('discountType')} className={inputClass}>
                <option value="PERCENTAGE">Phần trăm (%)</option>
                <option value="FIXED_AMOUNT">Số tiền cố định</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Giá trị giảm *</label>
              <input
                type="number"
                value={form.discountValue}
                onChange={handleChange('discountValue')}
                placeholder={form.discountType === 'PERCENTAGE' ? 'VD: 20' : 'VD: 50000'}
                className={inputClass}
                required
                min="1"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Đơn hàng tối thiểu</label>
              <input type="number" value={form.minPurchaseAmount} onChange={handleChange('minPurchaseAmount')} placeholder="0" className={inputClass} min="0" />
            </div>
            {form.discountType === 'PERCENTAGE' && (
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Giảm tối đa</label>
                <input type="number" value={form.maxDiscountAmount} onChange={handleChange('maxDiscountAmount')} placeholder="Không giới hạn" className={inputClass} min="0" />
              </div>
            )}
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Giới hạn lượt dùng</label>
              <input type="number" value={form.usageLimit} onChange={handleChange('usageLimit')} placeholder="Không giới hạn" className={inputClass} min="1" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Ngày bắt đầu</label>
              <input type="date" value={form.startDate} onChange={handleChange('startDate')} className={inputClass} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Ngày kết thúc</label>
              <input type="date" value={form.endDate} onChange={handleChange('endDate')} className={inputClass} />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Áp dụng cho khóa học</label>
            {selectedCourse ? (
              <div className="flex items-center gap-2 rounded-xl border border-purple-200 bg-purple-50 px-4 py-2.5 text-sm">
                <BookOpen className="h-4 w-4 flex-shrink-0 text-purple-600" />
                <span className="flex-1 truncate font-medium text-purple-900">{selectedCourse.title}</span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCourse(null);
                    setForm((prev) => ({ ...prev, courseId: '' }));
                  }}
                  className="rounded-full p-1 transition hover:bg-purple-100"
                >
                  <X className="h-3.5 w-3.5 text-purple-500" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <input
                  value={courseQuery}
                  onChange={(event) => {
                    setCourseQuery(event.target.value);
                    setShowCourseDropdown(true);
                  }}
                  onFocus={() => setShowCourseDropdown(true)}
                  placeholder="Tất cả khóa học nếu để trống"
                  className={inputClass}
                />
                {showCourseDropdown && filteredCourses.length > 0 && (
                  <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-44 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
                    {filteredCourses.map((course) => (
                      <button
                        key={course.id}
                        type="button"
                        onClick={() => {
                          setSelectedCourse(course);
                          setForm((prev) => ({ ...prev, courseId: course.id }));
                          setShowCourseDropdown(false);
                          setCourseQuery('');
                        }}
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition hover:bg-purple-50"
                      >
                        <BookOpen className="h-4 w-4 flex-shrink-0 text-slate-400" />
                        <span className="truncate">{course.title}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <button type="submit" disabled={saving} className="w-full rounded-xl bg-purple-600 py-3 text-sm font-semibold text-white transition-all hover:bg-purple-700 disabled:opacity-70">
            {saving ? 'Đang tạo...' : 'Tạo mã giảm giá'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState([]);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [pageSize, setPageSize] = useState(5);

  const fetchCoupons = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get('/api/admin/coupons', {
        params: { q: query || undefined, status: statusFilter || undefined, pageSize: 50 },
      });
      setCoupons(response.data.items || []);
      setTotal(response.data.total || 0);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  }, [query, statusFilter]);

  useEffect(() => {
    fetchCoupons();
  }, [fetchCoupons]);

  const toggleActive = async (id) => {
    try {
      const response = await axios.patch(`/api/admin/coupons/${id}/toggle`);
      setCoupons((prev) => prev.map((coupon) => (coupon.id === id ? response.data : coupon)));
    } catch (err) {
      window.alert(err.response?.data?.message || err.message);
    }
  };

  const deleteCoupon = async (id, code) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa mã "${code}"? Thao tác này không thể hoàn tác.`)) return;
    try {
      await axios.delete(`/api/admin/coupons/${id}`);
      setCoupons((prev) => prev.filter((coupon) => coupon.id !== id));
      setTotal((prev) => Math.max(0, prev - 1));
    } catch (err) {
      window.alert(err.response?.data?.message || err.message);
    }
  };

  const handleCouponCreated = (newCoupon) => {
    setCoupons((prev) => [newCoupon, ...prev]);
    setTotal((prev) => prev + 1);
  };

  const activeCoupons = coupons.filter((coupon) => coupon.isActive).length;
  const totalUsage = coupons.reduce((sum, coupon) => sum + (coupon.usageCount || 0), 0);

  const columns = [
    { title: 'Mã', data: 'code', className: 'px-5 py-4' },
    { title: 'Loại và giá trị', data: 'discountValue', className: 'px-5 py-4' },
    { title: 'Khóa học', data: 'course.title', className: 'px-5 py-4' },
    { title: 'Lượt dùng', data: 'usageCount', className: 'px-5 py-4' },
    { title: 'Thời hạn', data: 'endDate', className: 'px-5 py-4' },
    { title: 'Trạng thái', data: 'isActive', className: 'px-5 py-4' },
    { title: 'Thao tác', data: 'id', className: 'px-5 py-4 text-right', orderable: false }
  ];

  const slots = {
    0: (data, row) => (
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 text-white">
          <Tag className="h-4 w-4" />
        </div>
        <span className="font-mono text-sm font-bold tracking-wider text-slate-900">{row.code}</span>
      </div>
    ),
    1: (data, row) => (
      <div>
        {row.discountType === 'PERCENTAGE' ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
            <Percent className="h-3 w-3" />
            {row.discountValue}%
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
            <DollarSign className="h-3 w-3" />
            {formatCurrency(row.discountValue)}
          </span>
        )}
        {row.minPurchaseAmount > 0 && <p className="mt-1 text-xs text-slate-400">Tối thiểu: {formatCurrency(row.minPurchaseAmount)}</p>}
      </div>
    ),
    2: (data, row) => (
      row.course ? (
        <span className="block max-w-[160px] truncate text-sm text-slate-700" title={row.course.title}>{row.course.title}</span>
      ) : (
        <span className="text-xs italic text-slate-400">Tất cả khóa học</span>
      )
    ),
    3: (data, row) => (
      <div>
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-900">{row.usageCount}</span>
          {row.usageLimit != null && <span className="text-xs text-slate-400">/ {row.usageLimit}</span>}
        </div>
        {row.usageLimit != null && (
          <div className="mt-1.5 h-1.5 w-20 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-purple-500 transition-all" style={{ width: `${Math.min(100, (row.usageCount / row.usageLimit) * 100)}%` }} />
          </div>
        )}
      </div>
    ),
    4: (data, row) => (
      <div className="flex items-center gap-1.5 text-xs text-slate-500">
        <Calendar className="h-3.5 w-3.5" />
        <span>
          {formatDate(row.startDate)} → {formatDate(row.endDate)}
        </span>
      </div>
    ),
    5: (data, row) => (
      <button
        onClick={() => toggleActive(row.id)}
        className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
          row.isActive ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
        }`}
      >
        {row.isActive ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
        {row.isActive ? 'Hoạt động' : 'Vô hiệu'}
      </button>
    ),
    6: (data, row) => (
      <button
        onClick={() => deleteCoupon(row.id, row.code)}
        className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
        title="Xóa mã giảm giá"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    )
  };

  return (
    <div className="animate-fade-in-up space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Quản lý mã giảm giá</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: 'Tổng số mã', value: total, icon: Tag, color: 'text-purple-600 bg-purple-50' },
          { label: 'Đang hoạt động', value: activeCoupons, icon: ToggleRight, color: 'text-emerald-600 bg-emerald-50' },
          { label: 'Tổng lượt dùng', value: totalUsage, icon: Hash, color: 'text-amber-600 bg-amber-50' },
        ].map((stat) => (
          <div key={stat.label} className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${stat.color}`}>
              <stat.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{stat.label}</p>
              <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <DataTableToolbar
          searchValue={query}
          onSearchChange={setQuery}
          onSearchKeyDown={(event) => event.key === 'Enter' && fetchCoupons()}
          placeholder="Tìm theo mã giảm giá..."
          pageSize={pageSize}
          onPageSizeChange={setPageSize}
          filters={
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold outline-none transition focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="active">Đang hoạt động</option>
              <option value="inactive">Đã vô hiệu hóa</option>
            </select>
          }
          actions={
            <div className="flex items-center gap-2">
              <button onClick={fetchCoupons} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition">
                Tìm kiếm
              </button>
              <button
                onClick={() => setShowModal(true)}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-purple-600 px-4 py-2 text-xs font-semibold text-white hover:bg-purple-700 transition"
              >
                <Plus className="h-4 w-4" />
                Tạo mã mới
              </button>
            </div>
          }
        />
        <DataTable
          data={coupons}
          columns={columns}
          slots={slots}
          loading={loading}
          error={error}
          pageSize={pageSize}
        />
      </div>

      {showModal && <CreateCouponModal onClose={() => setShowModal(false)} onCreated={handleCouponCreated} />}
    </div>
  );
}
