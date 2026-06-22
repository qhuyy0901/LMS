import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, BookOpen, Image as ImageIcon, Loader2, Save, UploadCloud } from 'lucide-react';
import { getFileUrl } from '../utils/fileUtils';

const fieldClass =
  'w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-800 outline-none transition focus:border-purple-400 focus:bg-white focus:ring-2 focus:ring-purple-100';

export default function InstructorCourseForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const fileInputRef = useRef(null);

  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingCourse, setLoadingCourse] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [form, setForm] = useState({
    title: '',
    shortDescription: '',
    description: '',
    detailedDescription: '',
    price: 0,
    category: '',
    level: 'BEGINNER',
    thumbnail: '',
  });

  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState('');

  // Fetch active categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await axios.get('/api/categories');
        setCategories(response.data || []);
      } catch (err) {
        console.error('Không thể tải danh mục:', err);
      } finally {
        setLoadingCategories(false);
      }
    };
    fetchCategories();
  }, []);

  // Fetch course detail if editing
  useEffect(() => {
    if (!isEdit) return;

    const fetchCourse = async () => {
      setLoadingCourse(true);
      setErrorMsg('');
      try {
        const response = await axios.get(`/api/instructor/courses/${id}`);
        const c = response.data;
        setForm({
          title: c.title || c.tieuDe || '',
          shortDescription: c.moTaNgan || '',
          description: c.description || c.moTa || '',
          detailedDescription: c.moTaChiTiet || '',
          price: c.price ?? c.gia ?? 0,
          category: c.danhMucId || c.danhMuc || '',
          level: c.trinhDo || 'BEGINNER',
          thumbnail: c.thumbnail || c.anhBia || '',
        });
        if (c.thumbnail || c.anhBia) {
          setCoverPreview(getFileUrl(c.thumbnail || c.anhBia));
        }
      } catch (err) {
        console.error('Không thể tải thông tin khóa học:', err);
        setErrorMsg('Không thể tải thông tin chi tiết khóa học này.');
      } finally {
        setLoadingCourse(false);
      }
    };
    fetchCourse();
  }, [id, isEdit]);

  const handleInputChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Vui lòng chỉ chọn tệp hình ảnh.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('Kích thước ảnh bìa không được vượt quá 5MB.');
      return;
    }

    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
    setErrorMsg('');
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    setErrorMsg('');
    setSuccessMsg('');

    // Validation
    const titleTrim = form.title.trim();
    const shortDescTrim = form.shortDescription.trim();
    const descTrim = form.description.trim();

    if (!titleTrim || titleTrim.Length < 5) {
      setErrorMsg('Tiêu đề khóa học phải tối thiểu 5 ký tự.');
      return;
    }
    if (!shortDescTrim) {
      setErrorMsg('Vui lòng điền mô tả ngắn.');
      return;
    }
    if (!descTrim || descTrim.Length < 20) {
      setErrorMsg('Mô tả khóa học phải tối thiểu 20 ký tự.');
      return;
    }
    if (!form.category) {
      setErrorMsg('Vui lòng chọn danh mục khóa học.');
      return;
    }
    if (Number(form.price) < 0) {
      setErrorMsg('Giá khóa học không được phép âm.');
      return;
    }

    setSubmitting(true);
    const formData = new FormData();
    formData.append('Title', titleTrim);
    formData.append('Description', descTrim);
    formData.append('MoTaNgan', shortDescTrim);
    formData.append('MoTaChiTiet', form.detailedDescription.trim());
    formData.append('Gia', String(Number(form.price) || 0));
    formData.append('DanhMuc', form.category);
    formData.append('TrinhDo', form.level);
    formData.append('Thumbnail', form.thumbnail || '');

    if (coverFile) {
      formData.append('CoverImageFile', coverFile);
    }

    try {
      if (isEdit) {
        await axios.put(`/api/instructor/courses/${id}`, formData);
        setSuccessMsg('Đã cập nhật khóa học thành công!');
      } else {
        await axios.post('/api/instructor/courses', formData);
        setSuccessMsg('Tạo khóa học mới thành công!');
      }
      
      setTimeout(() => {
        navigate('/instructor/courses');
      }, 1500);
    } catch (err) {
      console.error('Lỗi khi gửi form:', err);
      setErrorMsg(err.response?.data?.message || 'Không thể lưu khóa học. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingCourse) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="text-center">
          <Loader2 className="mx-auto h-9 w-9 animate-spin text-purple-600" />
          <p className="mt-3 text-sm font-medium text-slate-500">Đang tải thông tin khóa học...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl animate-fade-in-up pb-10">
      {/* Header and Back navigation */}
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
            {isEdit ? 'Chỉnh sửa khóa học' : 'Tạo khóa học mới'}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {isEdit ? 'Cập nhật nội dung và cấu hình cơ bản cho khóa học.' : 'Thiết lập các thông tin cơ bản cho khóa học của bạn.'}
          </p>
        </div>
        <Link
          to="/instructor/courses"
          className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Quay lại danh sách
        </Link>
      </div>

      {/* Messages */}
      {errorMsg && (
        <div className="mb-6 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-600">
          {errorMsg}
        </div>
      )}
      {successMsg && (
        <div className="mb-6 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-600">
          {successMsg}
        </div>
      )}

      {/* Form Container */}
      <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm md:p-8">
        <div className="space-y-5">
          {/* Tên khóa học */}
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-slate-700">Tên khóa học *</span>
            <input
              type="text"
              value={form.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="Ví dụ: Lập trình ReactJS từ cơ bản đến nâng cao"
              className={fieldClass}
              required
            />
          </label>

          {/* Hàng: Danh mục & Trình độ */}
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-slate-700">Chuyên mục *</span>
              {loadingCategories ? (
                <div className="flex h-10 items-center pl-2 text-xs text-slate-400">Đang tải chuyên mục...</div>
              ) : (
                <select
                  value={form.category}
                  onChange={(e) => handleInputChange('category', e.target.value)}
                  className={fieldClass}
                  required
                >
                  <option value="">-- Chọn chuyên mục --</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              )}
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-slate-700">Trình độ *</span>
              <select
                value={form.level}
                onChange={(e) => handleInputChange('level', e.target.value)}
                className={fieldClass}
                required
              >
                <option value="BEGINNER">Cơ bản (Beginner)</option>
                <option value="INTERMEDIATE">Trung cấp (Intermediate)</option>
                <option value="ADVANCED">Nâng cao (Advanced)</option>
              </select>
            </label>
          </div>

          {/* Mô tả ngắn */}
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-slate-700">Mô tả ngắn *</span>
            <input
              type="text"
              value={form.shortDescription}
              onChange={(e) => handleInputChange('shortDescription', e.target.value)}
              placeholder="Tóm tắt ngắn gọn mục tiêu hoặc đối tượng của khóa học..."
              className={fieldClass}
              required
            />
          </label>

          {/* Mô tả chi tiết */}
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-slate-700">Mô tả chi tiết * (tối thiểu 20 ký tự)</span>
            <textarea
              value={form.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Giới thiệu chi tiết nội dung, lộ trình học và quyền lợi của học viên..."
              className={`${fieldClass} min-h-32 resize-y`}
              required
            />
          </label>

          {/* Hàng: Giá tiền & Chọn ảnh bìa */}
          <div className="grid gap-4 md:grid-cols-[1fr_2fr]">
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-slate-700">Giá khóa học (VND) *</span>
              <input
                type="number"
                min="0"
                step="1000"
                value={form.price}
                onChange={(e) => handleInputChange('price', e.target.value)}
                className={fieldClass}
                required
              />
            </label>

            {/* Chọn file ảnh */}
            <div className="block">
              <span className="mb-1.5 block text-sm font-semibold text-slate-700">Ảnh bìa khóa học</span>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
              />
              <div className="flex gap-4">
                <div 
                  onClick={triggerFileSelect}
                  className="flex h-28 w-44 shrink-0 cursor-pointer overflow-hidden rounded-xl border border-dashed border-slate-300 bg-slate-50 transition hover:border-purple-400 hover:bg-slate-100/50"
                >
                  {coverPreview ? (
                    <img src={coverPreview} alt="Xem trước" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center text-slate-400">
                      <ImageIcon className="h-8 w-8 text-slate-350" />
                      <span className="mt-1 text-[11px]">Chưa có ảnh bìa</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-col justify-center gap-2">
                  <button
                    type="button"
                    onClick={triggerFileSelect}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-purple-200 hover:bg-purple-50 hover:text-purple-700"
                  >
                    <UploadCloud className="h-3.5 w-3.5" />
                    Tải ảnh lên
                  </button>
                  <p className="text-[11px] text-slate-400 leading-normal">
                    Chấp nhận file PNG, JPG, JPEG hoặc WEBP.<br />Dung lượng tệp tin tối đa 5MB.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Nút lưu cuối form */}
        <div className="flex justify-end gap-3 pt-5 border-t border-slate-100">
          <Link
            to="/instructor/courses"
            className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-655 transition hover:bg-slate-50"
          >
            Hủy bỏ
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-purple-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-purple-100 transition hover:bg-purple-700 disabled:opacity-60"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Đang lưu...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                {isEdit ? 'Lưu thay đổi' : 'Tạo khóa học'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
