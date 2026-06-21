import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { BookOpen, Check, Eye, Image as ImageIcon, RefreshCw, X } from 'lucide-react';
import DataTable from '../components/DataTable';
import DataTableToolbar from '../components/DataTableToolbar';

const formatCurrency = (amount = 0) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);

const statusLabels = {
  PUBLIC: 'Đã xuất bản',
  PUBLISHED: 'Đã xuất bản',
  DRAFT: 'Bản nháp',
  PENDING: 'Chờ duyệt',
  SUBMITTED: 'Chờ duyệt',
  REJECTED: 'Từ chối',
  HIDDEN: 'Đã ẩn',
};

const statusClasses = {
  PUBLIC: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  PUBLISHED: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  DRAFT: 'bg-slate-100 text-slate-700 border-slate-200',
  PENDING: 'bg-amber-50 text-amber-700 border-amber-100',
  SUBMITTED: 'bg-amber-50 text-amber-700 border-amber-100',
  REJECTED: 'bg-rose-50 text-rose-700 border-rose-100',
  HIDDEN: 'bg-slate-100 text-slate-700 border-slate-200',
};

const reviewableStatuses = new Set(['DRAFT', 'PENDING', 'SUBMITTED', 'REJECTED']);

const getCourseStatus = (course) => course?.status || (course?.isPublished ? 'PUBLIC' : 'DRAFT');

const canReviewCourse = (course) => reviewableStatuses.has(getCourseStatus(course));

const normalizeLessons = (course) => Array.isArray(course?.lessons) ? course.lessons : [];

function StatusBadge({ status }) {
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClasses[status] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
      {statusLabels[status] || status}
    </span>
  );
}

function DetailModal({ course, onClose, onApprove, onReject }) {
  const status = getCourseStatus(course);
  const lessons = normalizeLessons(course);

  if (!course) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 py-6">
      <div className="max-h-[92vh] w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Chi tiết khóa học</h2>
            <p className="text-sm text-slate-500">{course.title}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            title="Đóng"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
          <div className="grid gap-5 lg:grid-cols-[240px,1fr]">
            <div className="overflow-hidden rounded-xl border border-slate-100 bg-slate-50">
              {course.thumbnail ? (
                <img src={course.thumbnail} alt={course.title} className="h-40 w-full object-cover" />
              ) : (
                <div className="flex h-40 items-center justify-center text-slate-400">
                  <ImageIcon className="h-10 w-10" />
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={status} />
                <span className="text-sm font-semibold text-slate-700">{course.price > 0 ? formatCurrency(course.price) : 'Miễn phí'}</span>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-slate-900">{course.title}</h3>
                <p className="mt-1 text-sm text-slate-500">{course.slug}</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-400">Giảng viên</p>
                  <p className="mt-1 text-sm font-medium text-slate-900">{course.instructor?.name || '-'}</p>
                  <p className="text-xs text-slate-500">{course.instructor?.email || ''}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-400">Danh mục</p>
                  <p className="mt-1 text-sm font-medium text-slate-900">{course.category || '-'}</p>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase text-slate-400">Mô tả</p>
                <p className="mt-1 whitespace-pre-line text-sm leading-6 text-slate-700">{course.description || course.shortDescription || 'Chưa có mô tả.'}</p>
              </div>

              {course.rejectReason && (
                <div className="rounded-xl border border-rose-100 bg-rose-50 p-3 text-sm text-rose-700">
                  <p className="font-semibold">Lý do từ chối</p>
                  <p className="mt-1 whitespace-pre-line">{course.rejectReason}</p>
                </div>
              )}
            </div>
          </div>

          <div className="mt-6">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">Danh sách bài học</h3>
              <span className="text-xs font-semibold text-slate-500">{lessons.length || course._count?.lessons || 0} bài học</span>
            </div>
            <div className="overflow-hidden rounded-xl border border-slate-100">
              {lessons.length > 0 ? (
                lessons.map((lesson, index) => (
                  <div key={lesson.id || index} className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 last:border-b-0">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{lesson.position || index + 1}. {lesson.title}</p>
                      <p className="text-xs text-slate-500">{statusLabels[lesson.status] || lesson.status || (lesson.isPublished ? 'Đã xuất bản' : 'Bản nháp')}</p>
                    </div>
                    <span className="text-xs text-slate-500">{lesson.durationSeconds ? `${Math.round(lesson.durationSeconds / 60)} phút` : '-'}</span>
                  </div>
                ))
              ) : (
                <div className="px-4 py-6 text-sm text-slate-500">Chưa có bài học.</div>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 px-6 py-4">
          {canReviewCourse(course) && (
            <>
              <button
                type="button"
                onClick={() => onApprove(course.id)}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
              >
                <Check className="h-4 w-4" />
                Duyệt
              </button>
              <button
                type="button"
                onClick={() => onReject(course)}
                className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700"
              >
                <X className="h-4 w-4" />
                Từ chối
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function RejectModal({ course, reason, error, submitting, onReasonChange, onClose, onSubmit }) {
  if (!course) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/40 px-4">
      <form onSubmit={onSubmit} className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Từ chối khóa học</h2>
            <p className="mt-1 text-sm text-slate-500">{course.title}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            title="Đóng"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <label className="mt-5 block text-sm font-semibold text-slate-700" htmlFor="reject-reason">
          Lý do từ chối
        </label>
        <textarea
          id="reject-reason"
          value={reason}
          onChange={(event) => onReasonChange(event.target.value)}
          rows={5}
          className="mt-2 w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
          placeholder="Nhập lý do để giảng viên chỉnh sửa và gửi duyệt lại"
        />
        {error && <p className="mt-2 text-sm font-medium text-rose-600">{error}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            <X className="h-4 w-4" />
            Từ chối
          </button>
        </div>
      </form>
    </div>
  );
}

export default function AdminCourses() {
  const [courses, setCourses] = useState([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pageSize, setPageSize] = useState(5);
  const [detailCourse, setDetailCourse] = useState(null);
  const [rejectCourse, setRejectCourse] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectError, setRejectError] = useState('');
  const [submittingReject, setSubmittingReject] = useState(false);

  const updateCourse = useCallback((updatedCourse) => {
    setCourses((prev) => prev.map((course) => (course.id === updatedCourse.id ? updatedCourse : course)));
    setDetailCourse((current) => (current?.id === updatedCourse.id ? updatedCourse : current));
  }, []);

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get('/api/admin/courses', {
        params: { q: query || undefined, status: status || undefined, pageSize: 50 },
      });
      setCourses(response.data.items || []);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  }, [query, status]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const approveCourse = async (courseId) => {
    if (!window.confirm('Duyệt khóa học này để xuất bản trên hệ thống?')) return;
    try {
      const response = await axios.patch(`/api/admin/courses/${courseId}/publication`, { isPublished: true });
      updateCourse(response.data);
    } catch (err) {
      window.alert(err.response?.data?.message || err.message);
    }
  };

  const openRejectModal = (course) => {
    setRejectCourse(course);
    setRejectReason(course.rejectReason || '');
    setRejectError('');
  };

  const closeRejectModal = () => {
    if (submittingReject) return;
    setRejectCourse(null);
    setRejectReason('');
    setRejectError('');
  };

  const submitReject = async (event) => {
    event.preventDefault();
    const reason = rejectReason.trim();
    if (!reason) {
      setRejectError('Vui lòng nhập lý do từ chối.');
      return;
    }

    setSubmittingReject(true);
    setRejectError('');
    try {
      const response = await axios.post(`/api/admin/courses/${rejectCourse.id}/reject`, { ghiChu: reason });
      updateCourse(response.data);
      setRejectCourse(null);
      setRejectReason('');
      setRejectError('');
    } catch (err) {
      setRejectError(err.response?.data?.message || err.message);
    } finally {
      setSubmittingReject(false);
    }
  };

  const columns = useMemo(() => [
    { title: 'Khóa học', data: 'title', className: 'px-5 py-4' },
    { title: 'Giảng viên', data: 'instructor.name', className: 'px-5 py-4' },
    { title: 'Danh mục', data: 'category', className: 'px-5 py-4' },
    { title: 'Giá', data: 'price', className: 'px-5 py-4' },
    { title: 'Trạng thái', data: 'status', className: 'px-5 py-4' },
    { title: 'Thao tác', data: 'id', className: 'px-5 py-4 text-right', orderable: false },
  ], []);

  const slots = {
    0: (data, row) => (
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-700">
          <BookOpen className="h-5 w-5" />
        </div>
        <div>
          <p className="font-medium text-slate-900">{row.title}</p>
          <p className="text-xs text-slate-500">{row._count?.lessons || 0} bài học, {row._count?.enrollments || 0} học viên</p>
        </div>
      </div>
    ),
    1: (data, row) => (
      <div>
        <p className="text-slate-900">{row.instructor?.name || '-'}</p>
        <p className="text-xs text-slate-500">{row.instructor?.email || ''}</p>
      </div>
    ),
    2: (data, row) => <span className="text-slate-600">{row.category || '-'}</span>,
    3: (data, row) => (
      <span className="text-slate-600">
        {row.price > 0 ? formatCurrency(row.price) : 'Miễn phí'}
      </span>
    ),
    4: (data, row) => <StatusBadge status={getCourseStatus(row)} />,
    5: (data, row) => (
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => setDetailCourse(row)}
          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
          title="Xem chi tiết"
        >
          <Eye className="h-4 w-4" />
          Xem
        </button>
        {canReviewCourse(row) && (
          <>
            <button
              type="button"
              onClick={() => approveCourse(row.id)}
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-emerald-600 transition hover:bg-emerald-50"
              title="Duyệt khóa học"
            >
              <Check className="h-4 w-4" />
              Duyệt
            </button>
            <button
              type="button"
              onClick={() => openRejectModal(row)}
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-50"
              title="Từ chối khóa học"
            >
              <X className="h-4 w-4" />
              Từ chối
            </button>
          </>
        )}
      </div>
    ),
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Duyệt khóa học</h1>
          <p className="mt-1 text-sm text-slate-500">Kiểm tra khóa học giảng viên gửi lên trước khi xuất bản.</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <DataTableToolbar
          searchValue={query}
          onSearchChange={setQuery}
          placeholder="Tìm theo tên khóa học, giảng viên hoặc email"
          pageSize={pageSize}
          onPageSizeChange={setPageSize}
          filters={
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold outline-none transition focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="published">Đã xuất bản</option>
              <option value="draft">Bản nháp / Chờ duyệt</option>
            </select>
          }
          actions={
            <button
              type="button"
              onClick={fetchCourses}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
            >
              <RefreshCw className="h-4 w-4" />
              Tải lại
            </button>
          }
        />
        <DataTable
          data={courses}
          columns={columns}
          slots={slots}
          loading={loading}
          error={error}
          pageSize={pageSize}
        />
      </div>

      <DetailModal
        course={detailCourse}
        onClose={() => setDetailCourse(null)}
        onApprove={approveCourse}
        onReject={openRejectModal}
      />
      <RejectModal
        course={rejectCourse}
        reason={rejectReason}
        error={rejectError}
        submitting={submittingReject}
        onReasonChange={setRejectReason}
        onClose={closeRejectModal}
        onSubmit={submitReject}
      />
    </div>
  );
}
