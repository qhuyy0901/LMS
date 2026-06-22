import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  BookOpen,
  ChevronDown,
  Eye,
  EyeOff,
  FileX,
  FilePenLine,
  Layers,
  Plus,
  Search,
  Trash2,
  UploadCloud,
} from 'lucide-react';

const apiRoot = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');
const money = new Intl.NumberFormat('vi-VN');

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'DRAFT', label: 'Bản nháp' },
  { value: 'PUBLIC', label: 'Đã xuất bản' },
  { value: 'HIDDEN', label: 'Đã ẩn' },
];

const emptyForm = {
  title: '',
  shortDescription: '',
  description: '',
  price: 0,
  thumbnail: '',
};

const fieldClass =
  'w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-purple-300 focus:bg-white focus:ring-2 focus:ring-purple-100';

const normalizeStatus = (course) => {
  if (course.trangThai === 'HIDDEN' || course.status === 'HIDDEN') return 'HIDDEN';
  if (course.isPublished || course.daXuatBan || course.trangThai === 'PUBLIC') return 'PUBLIC';
  return 'DRAFT';
};

const isDraftOrUnpublished = (course) => {
  const currentStatus = normalizeStatus(course);
  if (currentStatus === 'DRAFT') return true;
  if (currentStatus === 'HIDDEN' && !course.ngayXuatBan) return true;
  return false;
};

const statusLabel = {
  DRAFT: 'Bản nháp',
  PUBLIC: 'Đã xuất bản',
  HIDDEN: 'Đã ẩn',
};

const statusClass = {
  DRAFT: 'bg-slate-100 text-slate-700',
  PUBLIC: 'bg-emerald-50 text-emerald-700',
  HIDDEN: 'bg-amber-50 text-amber-700',
};

const getImageUrl = (thumbnail) => {
  if (!thumbnail) return '';
  if (/^https?:\/\//i.test(thumbnail)) return thumbnail;
  return `${apiRoot}${thumbnail.startsWith('/') ? thumbnail : `/${thumbnail}`}`;
};

const getPurchaseCount = (course) => Number(course.purchaseCount ?? course.purchases ?? course.totalPurchases ?? 0);
const getStudentCount = (course) => Number(course.studentCount ?? course.enrollments ?? 0);
const canDeleteCourse = (course) => course.canDelete ?? (getPurchaseCount(course) === 0 && getStudentCount(course) === 0);

export default function InstructorCourses() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState('');
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState('ALL');
  const [notice, setNotice] = useState('');
  const [modalMode, setModalMode] = useState(null);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const loadCourses = useCallback(async () => {
    setLoading(true);
    setApiError('');
    try {
      const response = await axios.get('/api/instructor/courses');
      setCourses(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Không thể tải danh sách khóa học.', error);
      setApiError('Không thể tải danh sách khóa học.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  const filteredCourses = useMemo(() => {
    const searchText = keyword.trim().toLowerCase();
    return courses.filter((course) => {
      const matchesSearch = !searchText || course.title?.toLowerCase().includes(searchText);
      const matchesStatus = status === 'ALL' || normalizeStatus(course) === status;
      return matchesSearch && matchesStatus;
    });
  }, [courses, keyword, status]);

  const openCreateModal = () => {
    setSelectedCourse(null);
    setForm(emptyForm);
    setModalMode('create');
  };

  const openEditModal = (course) => {
    setSelectedCourse(course);
    setForm({
      title: course.title || '',
      shortDescription: course.moTaNgan || course.shortDescription || '',
      description: course.moTa || course.description || '',
      price: course.gia ?? course.price ?? 0,
      thumbnail: course.thumbnail || course.anhBia || '',
    });
    setModalMode('edit');
  };

  const closeModal = () => {
    setModalMode(null);
    setSelectedCourse(null);
    setForm(emptyForm);
    setSaving(false);
  };

  const submitCourse = async (event) => {
    event.preventDefault();
    setSaving(true);
    setNotice('');

    const formData = new FormData();
    formData.append('Title', form.title.trim());
    formData.append('Description', form.description.trim());
    formData.append('MoTaNgan', form.shortDescription.trim());
    formData.append('Gia', String(Number(form.price) || 0));
    formData.append('Thumbnail', form.thumbnail.trim());

    try {
      if (modalMode === 'edit' && selectedCourse) {
        await axios.put(`/api/instructor/courses/${selectedCourse.id}`, formData);
        setNotice('Đã cập nhật khóa học.');
      } else {
        await axios.post('/api/instructor/courses', formData);
        setNotice('Đã tạo khóa học mới.');
      }
      closeModal();
      await loadCourses();
    } catch (error) {
      setNotice(error.response?.data?.message || 'Không thể lưu khóa học.');
    } finally {
      setSaving(false);
    }
  };

  const publishCourse = async (course) => {
    setNotice('');
    try {
      await axios.patch(`/api/instructor/courses/${course.id}/publish`, { isPublished: true });
      setNotice('Đã xuất bản khóa học.');
      await loadCourses();
    } catch (error) {
      const fallback = 'Khóa học cần có ít nhất 1 chương và 1 bài học trước khi xuất bản.';
      setNotice(error.response?.status === 400 ? fallback : error.response?.data?.message || fallback);
    }
  };

  const hideCourse = async (course) => {
    setNotice('');
    try {
      await axios.patch(`/api/instructor/courses/${course.id}/hide`, {});
      setNotice('Đã ẩn khóa học.');
      await loadCourses();
    } catch (error) {
      setNotice(error.response?.data?.message || 'Không thể ẩn khóa học.');
    }
  };

  const moveToDraft = async (course) => {
    if (!window.confirm('Bạn có chắc muốn chuyển khóa học này về bản nháp?')) return;
    setNotice('');
    try {
      await axios.patch(`/api/instructor/courses/${course.id}/publish`, { isPublished: false });
      setNotice('Đã chuyển khóa học về bản nháp.');
      await loadCourses();
    } catch (error) {
      setNotice(error.response?.data?.message || 'Không thể chuyển khóa học về bản nháp.');
    }
  };

  const deleteCourse = async (course) => {
    if (!window.confirm('Bạn có chắc muốn xóa khóa học này không?')) return;

    if (getPurchaseCount(course) > 0) {
      setNotice('Khóa học đã có sinh viên mua nên không thể xóa. Bạn chỉ có thể ẩn khóa học.');
      return;
    }

    if (getStudentCount(course) > 0) {
      setNotice('Khóa học đã có học viên nên không thể xóa. Bạn chỉ có thể ẩn khóa học.');
      return;
    }

    setNotice('');
    try {
      await axios.delete(`/api/instructor/courses/${course.id}`);
      setNotice('Đã xóa khóa học.');
      await loadCourses();
    } catch (error) {
      setNotice(error.response?.data?.message || 'Không thể xóa khóa học.');
    }
  };

  return (
    <div className="animate-fade-in-up">
      <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="mb-1 text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
            Khóa học của tôi
          </h1>
        </div>
        <button
          type="button"
          onClick={() => navigate('/instructor/courses/new')}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-purple-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-purple-700"
        >
          <Plus className="h-4 w-4" />
          Tạo khóa học mới
        </button>
      </div>

      <div className="mb-4 grid gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm lg:grid-cols-[1fr_auto]">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="Tìm kiếm khóa học theo tên..."
            className="w-full rounded-full border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-800 outline-none transition focus:border-purple-300 focus:bg-white focus:ring-2 focus:ring-purple-100"
          />
        </label>
        <div className="flex flex-wrap gap-2">
          {STATUS_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setStatus(option.value)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                status === option.value
                  ? 'bg-purple-600 text-white'
                  : 'border border-slate-200 bg-white text-slate-600 hover:border-purple-200 hover:text-purple-700'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {notice && (
        <div className="mb-4 rounded-xl border border-purple-100 bg-purple-50 px-4 py-3 text-sm font-medium text-purple-700">
          {notice}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        {loading ? (
          <div className="px-5 py-12 text-center text-sm font-medium text-slate-500">
            Đang tải danh sách khóa học...
          </div>
        ) : apiError ? (
          <div className="px-5 py-12 text-center text-sm font-medium text-red-600">{apiError}</div>
        ) : courses.length === 0 ? (
          <div className="flex flex-col items-center px-5 py-14 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-50 text-purple-600">
              <BookOpen className="h-6 w-6" />
            </div>
            <p className="mb-4 text-sm font-semibold text-slate-700">Bạn chưa có khóa học nào</p>
            <button
              type="button"
              onClick={() => navigate('/instructor/courses/new')}
              className="inline-flex items-center gap-2 rounded-full bg-purple-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-purple-700"
            >
              <Plus className="h-4 w-4" />
              Tạo khóa học mới
            </button>
          </div>
        ) : filteredCourses.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm font-medium text-slate-500">
            Không tìm thấy khóa học phù hợp.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredCourses.map((course) => (
              <CourseRow
                key={course.id}
                course={course}
                onEdit={() => navigate(`/instructor/courses/${course.id}/edit`)}
                onPublish={() => publishCourse(course)}
                onHide={() => hideCourse(course)}
                onMoveToDraft={() => moveToDraft(course)}
                onDelete={() => deleteCourse(course)}
                onCurriculum={() => navigate(`/instructor/courses/${course.id}`)}
              />
            ))}
          </div>
        )}
      </div>

      {modalMode && (
        <CourseModal
          mode={modalMode}
          form={form}
          saving={saving}
          onChange={setForm}
          onClose={closeModal}
          onSubmit={submitCourse}
        />
      )}
    </div>
  );
}

function CourseRow({ course, onEdit, onPublish, onHide, onMoveToDraft, onDelete, onCurriculum }) {
  const currentStatus = normalizeStatus(course);
  const sectionCount = course.sectionCount ?? course.sections?.length ?? 0;
  const lessonCount = course.lessonCount ?? course.totalLessons ?? 0;
  const studentCount = getStudentCount(course);
  const purchaseCount = getPurchaseCount(course);
  const canDelete = canDeleteCourse(course);
  const isDraftOrUnpub = isDraftOrUnpublished(course);
  const isPublishedHidden = currentStatus === 'HIDDEN' && course.ngayXuatBan;
  const deleteTitle = canDelete
    ? 'Xóa khóa học'
    : purchaseCount > 0
      ? 'Khóa học đã có sinh viên mua nên không thể xóa'
      : 'Khóa học đã có học viên nên không thể xóa';
  const description = course.moTaNgan || course.shortDescription || course.description || 'Chưa có mô tả ngắn.';
  const thumbnail = getImageUrl(course.thumbnail || course.anhBia);

  return (
    <article className="grid gap-4 p-5 transition hover:bg-slate-50/70 xl:grid-cols-[minmax(0,1fr)_auto]">
      <div className="flex min-w-0 flex-col gap-4 sm:flex-row">
        <div className="h-28 w-full shrink-0 overflow-hidden rounded-xl bg-slate-100 sm:w-44">
          {thumbnail ? (
            <img src={thumbnail} alt={course.title} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-purple-50 text-purple-500">
              <BookOpen className="h-8 w-8" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold text-slate-900">{course.title || 'Khóa học chưa có tiêu đề'}</h2>
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass[currentStatus]}`}>
              {statusLabel[currentStatus]}
            </span>
          </div>
          <p className="line-clamp-2 max-w-3xl text-sm leading-6 text-slate-500">{description}</p>
          <div className="mt-4 grid gap-3 text-sm text-slate-600 sm:grid-cols-4">
            <Metric label="Giá" value={Number(course.price || 0) === 0 ? 'Miễn phí' : `${money.format(course.price)} đ`} />
            <Metric label="Số chương" value={money.format(sectionCount)} />
            <Metric label="Số bài học" value={money.format(lessonCount)} />
            <Metric label="Số học viên" value={money.format(studentCount)} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 w-[280px] shrink-0 self-center">
        <ActionLink to={`/course/${course.id}`} icon={Eye} label="Xem chi tiết" />
        
        <ActionButton 
          icon={FilePenLine} 
          label="Sửa khóa học" 
          onClick={onEdit} 
          disabled={!isDraftOrUnpub}
          title={!isDraftOrUnpub ? "Chỉ khóa học bản nháp mới được chỉnh sửa" : ""}
        />

        <ActionButton 
          icon={Layers} 
          label="Quản lý giáo trình" 
          onClick={onCurriculum} 
        />

        {!isPublishedHidden && (
          <ActionButton 
            icon={UploadCloud} 
            label="Xuất bản" 
            onClick={onPublish}
            disabled={currentStatus === 'PUBLIC'}
            title={currentStatus === 'PUBLIC' ? 'Khóa học đã được xuất bản' : ''}
          />
        )}
        
        <ActionButton 
          icon={currentStatus === 'HIDDEN' ? Eye : EyeOff} 
          label={currentStatus === 'HIDDEN' ? 'Hiện khóa học' : 'Ẩn khóa học'} 
          onClick={currentStatus === 'HIDDEN' ? onPublish : onHide}
        />

        <ActionButton 
          icon={FileX} 
          label="Chuyển về bản nháp" 
          disabled={true}
          title={isDraftOrUnpub ? 'Khóa học đã ở trạng thái bản nháp' : 'Khóa đã xuất bản không thể chuyển về bản nháp'}
        />

        <div className={isPublishedHidden ? '' : 'col-span-2'}>
          <ActionButton 
            icon={Trash2} 
            label="Xóa khóa học" 
            onClick={onDelete} 
            danger 
            disabled={!isDraftOrUnpub || !canDelete} 
            title={
              !isDraftOrUnpub
                ? 'Chỉ Admin mới được xóa khóa đã xuất bản'
                : !canDelete
                  ? 'Không thể xóa vì khóa học đã có học viên'
                  : 'Xóa khóa học'
            }
          />
        </div>
      </div>
    </article>
  );
}

function Metric({ label, value }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 font-semibold text-slate-800">{value}</p>
    </div>
  );
}

function ActionButton({ icon: Icon, label, onClick, disabled = false, danger = false, title }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-30 w-full ${
        danger
          ? 'border-red-100 bg-red-50 text-red-600 hover:bg-red-100/50 shadow-sm'
          : 'border-slate-200 bg-white text-slate-600 hover:border-purple-200 hover:bg-purple-50 hover:text-purple-700 shadow-sm'
      }`}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate">{label}</span>
    </button>
  );
}

function ActionLink({ icon: Icon, label, to }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-purple-200 hover:bg-purple-50 hover:text-purple-700"
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </Link>
  );
}

function CourseModal({ mode, form, saving, onChange, onClose, onSubmit }) {
  const title = mode === 'edit' ? 'Sửa khóa học' : 'Tạo khóa học mới';

  const updateField = (field, value) => {
    onChange({ ...form, [field]: value });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <form onSubmit={onSubmit} className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
            <p className="mt-1 text-sm text-slate-500">Nhập thông tin cơ bản của khóa học.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-100">
            Đóng
          </button>
        </div>

        <div className="grid gap-4">
          <Field label="Tên khóa học">
            <input
              value={form.title}
              onChange={(event) => updateField('title', event.target.value)}
              className={fieldClass}
              required
            />
          </Field>
          <Field label="Mô tả ngắn">
            <input
              value={form.shortDescription}
              onChange={(event) => updateField('shortDescription', event.target.value)}
              className={fieldClass}
            />
          </Field>
          <Field label="Mô tả">
            <textarea
              value={form.description}
              onChange={(event) => updateField('description', event.target.value)}
              className={`${fieldClass} min-h-28 resize-y`}
              required
            />
          </Field>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Giá">
              <input
                type="number"
                min="0"
                value={form.price}
                onChange={(event) => updateField('price', event.target.value)}
                className={fieldClass}
              />
            </Field>
            <Field label="Ảnh bìa">
              <input
                value={form.thumbnail}
                onChange={(event) => updateField('thumbnail', event.target.value)}
                placeholder="https://..."
                className={fieldClass}
              />
            </Field>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600">
            Hủy
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-60"
          >
            {saving ? 'Đang lưu...' : 'Lưu khóa học'}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-slate-700">{label}</span>
      {children}
    </label>
  );
}
