import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Crown,
  Edit3,
  ExternalLink,
  Image as ImageIcon,
  MapPin,
  Plus,
  Search,
  Star,
  Trash2,
  Upload,
  Users,
  Video,
  X,
  XCircle,
} from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { resolveMediaUrl } from '../utils/mediaUrl';

const TYPES = [
  { value: 'WORKSHOP', label: 'Workshop' },
  { value: 'SEMINAR', label: 'Hội thảo' },
  { value: 'SPECIAL_TOPIC', label: 'Chuyên đề' },
  { value: 'WEBINAR', label: 'Livestream' },
  { value: 'OTHER', label: 'Khác' },
];

const FORMATS = [
  { value: 'OFFLINE', label: 'Trực tiếp' },
  { value: 'ONLINE', label: 'Trực tuyến' },
  { value: 'HYBRID', label: 'Kết hợp' },
];

const STATUS = {
  DRAFT: { label: 'Bản nháp', className: 'bg-slate-100 text-slate-700 ring-slate-200' },
  PUBLISHED: { label: 'Đã xuất bản', className: 'bg-emerald-50 text-emerald-700 ring-emerald-100' },
  CANCELLED: { label: 'Đã hủy', className: 'bg-rose-50 text-rose-700 ring-rose-100' },
};

const emptyForm = {
  title: '',
  description: '',
  type: 'WORKSHOP',
  format: 'OFFLINE',
  startAt: '',
  endAt: '',
  location: '',
  linkThamGia: '',
  capacity: 50,
  pointCost: 0,
};

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const fieldClass =
  'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-purple-400 focus:ring-4 focus:ring-purple-100';
const dateTime = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' });
const typeLabel = (value) => TYPES.find((item) => item.value === value)?.label || 'Sự kiện';
const formatLabel = (value) => FORMATS.find((item) => item.value === value)?.label || 'Chưa rõ';

const toInputDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

const API_BASE = '/api/instructor/events';

export default function InstructorEvents() {
  const [searchParams, setSearchParams] = useSearchParams();
  const fileInputRef = useRef(null);
  const [events, setEvents] = useState([]);
  const [googleMeetLink, setGoogleMeetLink] = useState('');
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showAttendees, setShowAttendees] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  // Image management state
  const [existingImages, setExistingImages] = useState([]); // Images already on server
  const [newFiles, setNewFiles] = useState([]); // Files selected but not yet uploaded
  const [uploadingImages, setUploadingImages] = useState(false);
  const [imageError, setImageError] = useState('');

  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get(API_BASE);
      setEvents(Array.isArray(response.data) ? response.data : []);
      setError('');
    } catch (requestError) {
      if (requestError.response?.status === 401 || requestError.response?.status === 403) {
        setError('');
        setEvents([]);
      } else {
        setError(requestError.response?.data?.message || 'Không thể tải danh sách sự kiện.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEvents();
    axios.get('/api/instructor/settings/meet-link')
      .then((response) => setGoogleMeetLink(response.data?.googleMeetLink || ''))
      .catch(() => setGoogleMeetLink(''));
  }, [loadEvents]);

  const useSavedGoogleMeet = () => {
    if (!googleMeetLink) {
      setError('Bạn chưa cấu hình Google Meet. Vui lòng mở Avatar > Cài đặt tài khoản để thêm liên kết.');
      return;
    }
    setForm((prev) => ({ ...prev, linkThamGia: googleMeetLink }));
    setError('');
  };

  const openMeetingRoom = (url) => {
    if (!url) {
      setError('Sự kiện chưa có liên kết tham gia.');
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const filteredEvents = useMemo(() => {
    const text = keyword.trim().toLowerCase();
    return events.filter((item) => {
      const matchesStatus = filter === 'ALL' || item.status === filter;
      const matchesText =
        !text ||
        item.title.toLowerCase().includes(text) ||
        item.description.toLowerCase().includes(text) ||
        typeLabel(item.type).toLowerCase().includes(text) ||
        formatLabel(item.format).toLowerCase().includes(text);
      return matchesStatus && matchesText;
    });
  }, [events, keyword, filter]);

  // ===== Form handlers =====
  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setExistingImages([]);
    setNewFiles([]);
    setImageError('');
    setShowForm(true);
  };

  const openEdit = (item) => {
    setEditing(item);
    setForm({
      title: item.title,
      description: item.description,
      type: item.type,
      format: item.format,
      startAt: toInputDate(item.startAt),
      endAt: toInputDate(item.endAt),
      location: item.location || '',
      linkThamGia: item.linkThamGia || item.onlineUrl || '',
      capacity: item.capacity,
      pointCost: item.pointCost ?? 0,
    });
    setExistingImages(item.images || []);
    setNewFiles([]);
    setImageError('');
    setShowForm(true);
  };

  useEffect(() => {
    const editId = searchParams.get('edit');
    const item = events.find((event) => event.id === editId);
    if (item) {
      openEdit(item);
      setSearchParams({}, { replace: true });
    }
  }, [events, searchParams, setSearchParams]);

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const payload = {
        ...form,
        capacity: Number(form.capacity),
        pointCost: Number(form.pointCost || 0),
        startAt: new Date(form.startAt).toISOString(),
        endAt: new Date(form.endAt).toISOString(),
      };

      let eventId;
      if (editing) {
        await axios.put(`${API_BASE}/${editing.id}`, payload);
        eventId = editing.id;
        setNotice('Đã cập nhật sự kiện.');
      } else {
        const response = await axios.post(API_BASE, payload);
        eventId = response.data.id;
        setNotice('Đã tạo sự kiện mới.');
      }

      // Upload new images if any
      if (newFiles.length > 0 && eventId) {
        await uploadImages(eventId, newFiles);
      }

      setShowForm(false);
      setNewFiles([]);
      await loadEvents();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Không thể lưu sự kiện. Vui lòng kiểm tra lại thông tin.');
    } finally {
      setSaving(false);
    }
  };

  // ===== Image handlers =====
  const uploadImages = async (eventId, files) => {
    const formData = new FormData();
    files.forEach((f) => formData.append('files', f.file));
    try {
      const response = await axios.post(`${API_BASE}/${eventId}/images`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      // If the first image was uploaded and there was no cover, auto-set cover
      if (response.data?.images?.length > 0) {
        const newImages = response.data.images;
        // Check if we need to set cover for a specific new file
        const coverFile = files.find((f) => f.isCover);
        if (coverFile && newImages.length > 0) {
          const coverIndex = files.indexOf(coverFile);
          if (coverIndex < newImages.length) {
            await axios.patch(`${API_BASE}/${eventId}/images/${newImages[coverIndex].id}/set-cover`);
          }
        }
      }
    } catch (uploadError) {
      console.error('Upload error:', uploadError);
    }
  };

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files || []);
    setImageError('');

    const validFiles = [];
    const errors = [];

    selectedFiles.forEach((file) => {
      if (!ALLOWED_TYPES.includes(file.type)) {
        errors.push(`"${file.name}": Chỉ hỗ trợ PNG, JPG, JPEG, WEBP.`);
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        errors.push(`"${file.name}": Kích thước tối đa 5MB.`);
        return;
      }
      validFiles.push({
        id: `new_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        file,
        preview: URL.createObjectURL(file),
        isCover: false,
      });
    });

    if (errors.length > 0) {
      setImageError(errors.join(' '));
    }

    if (validFiles.length > 0) {
      setNewFiles((prev) => {
        const updated = [...prev, ...validFiles];
        // If no cover set anywhere, set first overall image as cover
        const hasAnyCover = existingImages.some((img) => img.isCover) || updated.some((f) => f.isCover);
        if (!hasAnyCover && existingImages.length === 0 && updated.length > 0) {
          updated[0].isCover = true;
        }
        return updated;
      });
    }

    // Reset input so same file can be selected again
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeNewFile = (fileId) => {
    setNewFiles((prev) => {
      const updated = prev.filter((f) => f.id !== fileId);
      const removed = prev.find((f) => f.id === fileId);
      if (removed?.preview) URL.revokeObjectURL(removed.preview);
      // If removed file was cover, reassign
      if (removed?.isCover && updated.length > 0) {
        if (!existingImages.some((img) => img.isCover)) {
          updated[0].isCover = true;
        }
      }
      return updated;
    });
  };

  const removeExistingImage = async (imageId) => {
    if (!editing) return;
    if (!window.confirm('Bạn chắc chắn muốn xóa ảnh này?')) return;
    try {
      await axios.delete(`${API_BASE}/${editing.id}/images/${imageId}`);
      setExistingImages((prev) => prev.filter((img) => img.id !== imageId));
      setNotice('Đã xóa ảnh.');
      // Reload event to get updated cover info
      try {
        const response = await axios.get(`${API_BASE}/${editing.id}`);
        setExistingImages(response.data.images || []);
      } catch { /* ignore */ }
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể xóa ảnh.');
    }
  };

  const setCoverExisting = async (imageId) => {
    if (!editing) return;
    try {
      await axios.patch(`${API_BASE}/${editing.id}/images/${imageId}/set-cover`);
      setExistingImages((prev) =>
        prev.map((img) => ({ ...img, isCover: img.id === imageId }))
      );
      // Clear cover from new files
      setNewFiles((prev) => prev.map((f) => ({ ...f, isCover: false })));
      setNotice('Đã đặt ảnh đại diện.');
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể đặt ảnh đại diện.');
    }
  };

  const setCoverNewFile = (fileId) => {
    setExistingImages((prev) => prev.map((img) => ({ ...img, isCover: false })));
    setNewFiles((prev) => prev.map((f) => ({ ...f, isCover: f.id === fileId })));
  };

  // Upload images immediately when editing (not creating)
  const uploadImmediately = async () => {
    if (!editing || newFiles.length === 0) return;
    setUploadingImages(true);
    setImageError('');
    try {
      await uploadImages(editing.id, newFiles);
      // Clean up previews
      newFiles.forEach((f) => { if (f.preview) URL.revokeObjectURL(f.preview); });
      setNewFiles([]);
      // Reload images
      const response = await axios.get(`${API_BASE}/${editing.id}`);
      setExistingImages(response.data.images || []);
      setNotice('Đã upload ảnh thành công.');
    } catch {
      setImageError('Không thể upload ảnh. Vui lòng thử lại.');
    } finally {
      setUploadingImages(false);
    }
  };

  const runAction = async (item, action, confirmText) => {
    if (confirmText && !window.confirm(confirmText)) return;
    setError('');
    setNotice('');
    try {
      if (action === 'delete') {
        await axios.delete(`${API_BASE}/${item.id}`);
      } else {
        await axios.patch(`${API_BASE}/${item.id}/${action}`);
      }
      setNotice(action === 'publish' ? 'Đã xuất bản sự kiện.' : action === 'cancel' ? 'Đã hủy sự kiện.' : 'Đã xóa sự kiện.');
      await loadEvents();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Không thể thực hiện thao tác.');
    }
  };

  // Cleanup previews on unmount
  useEffect(() => {
    return () => {
      newFiles.forEach((f) => { if (f.preview) URL.revokeObjectURL(f.preview); });
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const allImages = [
    ...existingImages.map((img) => ({ ...img, source: 'existing' })),
    ...newFiles.map((f) => ({ id: f.id, imageUrl: f.preview, isCover: f.isCover, source: 'new' })),
  ];

  const coverImageUrl = (item) => {
    if (item.images?.length > 0) {
      const cover = item.images.find((img) => img.isCover) || item.images[0];
      return cover.imageUrl;
    }
    return item.imageUrl;
  };

  return (
    <div className="animate-fade-in-up space-y-6">
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">Quản lý sự kiện</h1>
        </div>
        <button type="button" onClick={openCreate} className="inline-flex items-center justify-center gap-2 rounded-full bg-purple-600 px-5 py-3 text-sm font-semibold text-white shadow-sm shadow-purple-200 transition hover:bg-purple-700">
          <Plus className="h-4 w-4" />
          Tạo sự kiện
        </button>
      </header>

      <section className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
          <label className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="Tìm theo tên, loại sự kiện..." className={`${fieldClass} pl-11`} />
          </label>
          <div className="flex flex-wrap gap-2">
            {['ALL', 'DRAFT', 'PUBLISHED', 'CANCELLED'].map((value) => (
              <button key={value} type="button" onClick={() => setFilter(value)} className={`rounded-full px-4 py-2.5 text-sm font-semibold transition ${filter === value ? 'bg-slate-900 text-white shadow-sm' : 'border border-slate-200 bg-white text-slate-600 hover:border-purple-200 hover:text-purple-700'}`}>
                {value === 'ALL' ? 'Tất cả' : STATUS[value].label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {(notice || error) && (
        <div className={`rounded-2xl border px-4 py-3 text-sm font-medium ${error ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
          {error || notice}
        </div>
      )}

      {loading ? (
        <div className="rounded-3xl border border-slate-100 bg-white py-16 text-center text-sm font-medium text-slate-500">Đang tải sự kiện...</div>
      ) : filteredEvents.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white py-16 text-center">
          <CalendarDays className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 text-sm font-medium text-slate-600">Chưa có sự kiện phù hợp.</p>
        </div>
      ) : (
        <div className="grid gap-5 xl:grid-cols-2">
          {filteredEvents.map((item) => (
            <article key={item.id} className="flex flex-col overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              {/* Cover image */}
              {coverImageUrl(item) ? (
                <div className="relative h-44 w-full overflow-hidden bg-gradient-to-br from-purple-50 to-indigo-50">
                  <img
                    src={resolveMediaUrl(coverImageUrl(item))}
                    alt={item.title}
                    className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                  {item.images?.length > 1 && (
                    <span className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-full bg-black/50 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
                      <ImageIcon className="h-3 w-3" />
                      {item.images.length}
                    </span>
                  )}
                </div>
              ) : (
                <div className="flex h-32 items-center justify-center bg-gradient-to-br from-purple-50 to-indigo-50">
                  <CalendarDays className="h-10 w-10 text-purple-200" />
                </div>
              )}

              <div className="flex flex-1 flex-col p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="mb-3 flex flex-wrap gap-2">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${STATUS[item.status]?.className}`}>{STATUS[item.status]?.label}</span>
                      <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-700 ring-1 ring-purple-100">{typeLabel(item.type)}</span>
                      <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-100">{formatLabel(item.format)}</span>
                    </div>
                    <h2 className="line-clamp-2 text-lg font-semibold text-slate-900">{item.title}</h2>
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">{item.description}</p>
                  </div>
                  <button type="button" title="Chỉnh sửa" onClick={() => openEdit(item)} className="rounded-full border border-slate-200 p-2.5 text-slate-500 transition hover:border-purple-200 hover:bg-purple-50 hover:text-purple-700">
                    <Edit3 className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-auto pt-5">
                  <div className="grid gap-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 sm:grid-cols-2">
                  <p className="flex items-center gap-2"><Clock3 className="h-4 w-4 text-purple-500" />{dateTime.format(new Date(item.startAt))}</p>
                  <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-purple-500" />{item.location || formatLabel(item.format)}</p>
                  <button type="button" onClick={() => setShowAttendees(item)} className="flex items-center gap-2 text-left font-semibold text-slate-700 transition hover:text-purple-700 sm:col-span-2">
                    <Users className="h-4 w-4 text-purple-500" />
                    {item.registrationCount}/{item.capacity} người đăng ký
                  </button>
                  <p className="font-semibold text-purple-700 sm:col-span-2">{(item.pointCost ?? 0) > 0 ? `${item.pointCost} điểm để tham gia` : 'Tham gia miễn phí'}</p>
                </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-4">
                <Link to={`/instructor/events/${item.id}`} className="inline-flex items-center gap-1.5 rounded-full border border-purple-200 bg-white px-4 py-2 text-xs font-semibold text-purple-700 transition hover:bg-purple-50">
                  <ExternalLink className="h-4 w-4" /> Xem chi tiết
                </Link>
                {item.status === 'PUBLISHED' && (item.format === 'ONLINE' || item.format === 'HYBRID') && new Date(item.endAt) > new Date() && (
                  <button
                    type="button"
                    onClick={() => openMeetingRoom(item.linkThamGia || item.onlineUrl)}
                    className="inline-flex items-center gap-1.5 rounded-full bg-purple-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-purple-700"
                  >
                    <Video className="h-4 w-4" />
                    Vào phòng
                  </button>
                )}
                {item.status !== 'PUBLISHED' && (
                  <button type="button" onClick={() => runAction(item, 'publish')} className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700">
                    <CheckCircle2 className="h-4 w-4" /> Xuất bản
                  </button>
                )}
                {item.status !== 'CANCELLED' && (
                  <button type="button" onClick={() => runAction(item, 'cancel', 'Bạn chắc chắn muốn hủy sự kiện này?')} className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-white px-4 py-2 text-xs font-semibold text-amber-700 transition hover:bg-amber-50">
                    <XCircle className="h-4 w-4" /> Hủy sự kiện
                  </button>
                )}
                <button type="button" onClick={() => runAction(item, 'delete', 'Bạn chắc chắn muốn xóa sự kiện này?')} className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-white px-4 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-50">
                  <Trash2 className="h-4 w-4" /> Xóa
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* ===== Create/Edit Form Modal ===== */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
          <form onSubmit={submit} className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">{editing ? 'Chỉnh sửa sự kiện' : 'Tạo sự kiện mới'}</h2>
                <p className="text-xs text-slate-500">Điền đủ thông tin trước khi xuất bản.</p>
              </div>
              <button type="button" title="Đóng" onClick={() => setShowForm(false)} className="rounded-full p-2 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
            </div>

            <div className="grid gap-4 p-5 md:grid-cols-2">
              <label className="md:col-span-2"><span className="mb-1.5 block text-sm font-semibold text-slate-700">Tên sự kiện <span className="text-rose-500">*</span></span><input required minLength={5} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} className={fieldClass} /></label>
              <label><span className="mb-1.5 block text-sm font-semibold text-slate-700">Loại sự kiện</span><select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })} className={fieldClass}>{TYPES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
              <label><span className="mb-1.5 block text-sm font-semibold text-slate-700">Hình thức</span><select value={form.format} onChange={(event) => setForm({ ...form, format: event.target.value })} className={fieldClass}>{FORMATS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
              <label><span className="mb-1.5 block text-sm font-semibold text-slate-700">Bắt đầu <span className="text-rose-500">*</span></span><input required type="datetime-local" value={form.startAt} onChange={(event) => setForm({ ...form, startAt: event.target.value })} className={fieldClass} /></label>
              <label><span className="mb-1.5 block text-sm font-semibold text-slate-700">Kết thúc <span className="text-rose-500">*</span></span><input required type="datetime-local" value={form.endAt} onChange={(event) => setForm({ ...form, endAt: event.target.value })} className={fieldClass} /></label>
              {(form.format === 'OFFLINE' || form.format === 'HYBRID') && <label><span className="mb-1.5 block text-sm font-semibold text-slate-700">Địa điểm <span className="text-rose-500">*</span></span><input required value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} className={fieldClass} /></label>}
              {(form.format === 'ONLINE' || form.format === 'HYBRID') && (
                <label>
                  <span className="mb-1.5 flex items-center justify-between gap-2 text-sm font-semibold text-slate-700">
                    Liên kết tham gia <span className="text-rose-500">*</span>
                    <button
                      type="button"
                      onClick={useSavedGoogleMeet}
                      className="inline-flex items-center gap-1 rounded-full border border-purple-200 bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-700 hover:bg-purple-100"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Dùng Google Meet từ tài khoản
                    </button>
                  </span>
                  <input required type="url" value={form.linkThamGia} onChange={(event) => setForm({ ...form, linkThamGia: event.target.value })} placeholder="Tạo phòng Meet, sau đó dán liên kết vào đây" className={fieldClass} />
                  {!googleMeetLink && <p className="mt-2 text-xs font-medium text-amber-600">Bạn chưa cấu hình Google Meet.</p>}
                </label>
              )}
              <label><span className="mb-1.5 block text-sm font-semibold text-slate-700">Số người tối đa <span className="text-rose-500">*</span></span><input required type="number" min="1" max="10000" value={form.capacity} onChange={(event) => setForm({ ...form, capacity: event.target.value })} className={fieldClass} /></label>
              <label><span className="mb-1.5 block text-sm font-semibold text-slate-700">Điểm cần đổi</span><input type="number" min="0" max="10000" value={form.pointCost} onChange={(event) => setForm({ ...form, pointCost: event.target.value })} className={fieldClass} /></label>
              <label className="md:col-span-2"><span className="mb-1.5 block text-sm font-semibold text-slate-700">Mô tả sự kiện <span className="text-rose-500">*</span></span><textarea required minLength={20} rows={5} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className={fieldClass} /></label>

              {/* ===== Image Upload Section ===== */}
              <div className="md:col-span-2">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-700">
                    <ImageIcon className="mr-1.5 inline h-4 w-4 text-purple-500" />
                    Ảnh sự kiện
                  </span>
                  <span className="text-xs text-slate-400">PNG, JPG, JPEG, WEBP • Tối đa 5MB/ảnh</span>
                </div>

                {imageError && (
                  <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
                    {imageError}
                  </div>
                )}

                {/* Image preview grid */}
                {allImages.length > 0 && (
                  <div className="mb-3 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
                    {allImages.map((img) => (
                      <div key={img.id} className="group relative aspect-square overflow-hidden rounded-xl border-2 border-slate-200 bg-slate-50 transition hover:border-purple-300">
                        <img
                          src={img.source === 'existing' ? resolveMediaUrl(img.imageUrl) : img.imageUrl}
                          alt="Ảnh sự kiện"
                          className="h-full w-full object-cover"
                        />
                        {/* Cover badge */}
                        {img.isCover && (
                          <span className="absolute left-1.5 top-1.5 inline-flex items-center gap-1 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
                            <Crown className="h-3 w-3" />
                            Ảnh đại diện
                          </span>
                        )}
                        {/* Overlay actions */}
                        <div className="absolute inset-0 flex items-center justify-center gap-1.5 bg-black/0 opacity-0 transition-all group-hover:bg-black/40 group-hover:opacity-100">
                          {!img.isCover && (
                            <button
                              type="button"
                              title="Đặt làm ảnh đại diện"
                              onClick={(e) => {
                                e.preventDefault();
                                if (img.source === 'existing') setCoverExisting(img.id);
                                else setCoverNewFile(img.id);
                              }}
                              className="rounded-full bg-white/90 p-2 text-amber-600 shadow transition hover:bg-amber-50 hover:text-amber-700"
                            >
                              <Star className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            type="button"
                            title="Xóa ảnh"
                            onClick={(e) => {
                              e.preventDefault();
                              if (img.source === 'existing') removeExistingImage(img.id);
                              else removeNewFile(img.id);
                            }}
                            className="rounded-full bg-white/90 p-2 text-rose-600 shadow transition hover:bg-rose-50 hover:text-rose-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Upload button area */}
                <div className="flex items-center gap-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".png,.jpg,.jpeg,.webp"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                    id="event-image-upload"
                  />
                  <label
                    htmlFor="event-image-upload"
                    className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border-2 border-dashed border-purple-200 bg-purple-50/50 px-5 py-3 text-sm font-semibold text-purple-700 transition hover:border-purple-400 hover:bg-purple-50"
                  >
                    <Upload className="h-4 w-4" />
                    Chọn ảnh từ máy tính
                  </label>
                  {editing && newFiles.length > 0 && (
                    <button
                      type="button"
                      onClick={uploadImmediately}
                      disabled={uploadingImages}
                      className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {uploadingImages ? (
                        <>
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                          Đang upload...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4" />
                          Upload {newFiles.length} ảnh
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 flex justify-end gap-2 border-t border-slate-100 bg-white px-5 py-4">
              <button type="button" onClick={() => setShowForm(false)} className="rounded-full border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">Đóng</button>
              <button disabled={saving} className="rounded-full bg-purple-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-purple-200 disabled:opacity-50">{saving ? 'Đang lưu...' : editing ? 'Lưu thay đổi' : 'Tạo bản nháp'}</button>
            </div>
          </form>
        </div>
      )}

      {/* ===== Attendees Modal ===== */}
      {showAttendees && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
          <div className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 p-5">
              <div><h2 className="font-semibold text-slate-900">Người đăng ký</h2><p className="text-xs text-slate-500">{showAttendees.title}</p></div>
              <button type="button" title="Đóng" onClick={() => setShowAttendees(null)} className="rounded-full p-2 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
            </div>
            <div className="max-h-96 overflow-y-auto p-4">
              {showAttendees.attendees?.length ? showAttendees.attendees.map((person) => (
                <div key={person.id} className="flex items-center justify-between gap-3 border-b border-slate-100 py-3">
                  <div><p className="text-sm font-medium text-slate-800">{person.name}</p><p className="text-xs text-slate-500">{person.email}</p>{person.pointsUsed > 0 && <p className="mt-1 text-xs font-medium text-purple-600">Đã dùng {person.pointsUsed} điểm</p>}</div>
                  <span className="text-xs text-slate-400">{dateTime.format(new Date(person.registeredAt))}</span>
                </div>
              )) : <p className="py-8 text-center text-sm text-slate-500">Chưa có người đăng ký.</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
