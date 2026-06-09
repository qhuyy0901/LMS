import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Edit3,
  ExternalLink,
  MapPin,
  Plus,
  Search,
  Settings,
  Trash2,
  Users,
  Video,
  X,
  XCircle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const TYPES = [
  { value: 'WORKSHOP', label: 'Workshop' },
  { value: 'SEMINAR', label: 'Hội thảo' },
  { value: 'SPECIAL_TOPIC', label: 'Chuyên đề' },
  { value: 'WEBINAR', label: 'Webinar' },
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
  onlineUrl: '',
  imageUrl: '',
  capacity: 50,
};

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

export default function InstructorEvents() {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [googleMeetEnabled, setGoogleMeetEnabled] = useState(false);
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

  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/instructor/events');
      setEvents(Array.isArray(response.data) ? response.data : []);
      setError('');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Không thể tải danh sách sự kiện.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEvents();
    axios.get('/api/account/settings')
      .then((response) => setGoogleMeetEnabled(Boolean(response.data?.settings?.integrations?.googleMeet)))
      .catch(() => setGoogleMeetEnabled(false));
  }, [loadEvents]);

  const openGoogleMeet = (url = '') => {
    if (!googleMeetEnabled) {
      setError('Bạn chưa bật tích hợp Google Meet. Hãy bật trong Cài đặt > Tích hợp trước khi mở phòng.');
      return;
    }
    window.open(url || 'https://meet.google.com/new', '_blank', 'noopener,noreferrer');
  };

  const filteredEvents = useMemo(() => {
    const text = keyword.trim().toLowerCase();
    return events.filter((item) => {
      const matchesStatus = filter === 'ALL' || item.status === filter;
      const matchesText = !text || item.title.toLowerCase().includes(text) || item.description.toLowerCase().includes(text);
      return matchesStatus && matchesText;
    });
  }, [events, keyword, filter]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
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
      onlineUrl: item.onlineUrl || '',
      imageUrl: item.imageUrl || '',
      capacity: item.capacity,
    });
    setShowForm(true);
  };

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const payload = {
        ...form,
        capacity: Number(form.capacity),
        startAt: new Date(form.startAt).toISOString(),
        endAt: new Date(form.endAt).toISOString(),
      };

      if (editing) {
        await axios.put(`/api/instructor/events/${editing.id}`, payload);
        setNotice('Đã cập nhật sự kiện.');
      } else {
        await axios.post('/api/instructor/events', payload);
        setNotice('Đã tạo sự kiện mới.');
      }

      setShowForm(false);
      await loadEvents();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Không thể lưu sự kiện. Vui lòng kiểm tra lại thông tin.');
    } finally {
      setSaving(false);
    }
  };

  const runAction = async (item, action, confirmText) => {
    if (confirmText && !window.confirm(confirmText)) return;
    setError('');
    setNotice('');
    try {
      if (action === 'delete') {
        await axios.delete(`/api/instructor/events/${item.id}`);
      } else {
        await axios.patch(`/api/instructor/events/${item.id}/${action}`);
      }
      setNotice(action === 'publish' ? 'Đã xuất bản sự kiện.' : action === 'cancel' ? 'Đã hủy sự kiện.' : 'Đã xóa sự kiện.');
      await loadEvents();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Không thể thực hiện thao tác.');
    }
  };

  return (
    <div className="animate-fade-in-up space-y-6">
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">Quản lý sự kiện</h1>
          <p className="mt-1 text-sm text-slate-500">Tạo workshop, hội thảo và chuyên đề dành cho học viên.</p>
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
            <input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="Tìm sự kiện..." className={`${fieldClass} pl-11`} />
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
            <article key={item.id} className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <div className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="mb-3 flex flex-wrap gap-2">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${STATUS[item.status]?.className}`}>{STATUS[item.status]?.label}</span>
                      <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-700 ring-1 ring-purple-100">{typeLabel(item.type)}</span>
                    </div>
                    <h2 className="line-clamp-2 text-lg font-semibold text-slate-900">{item.title}</h2>
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">{item.description}</p>
                  </div>
                  <button type="button" title="Chỉnh sửa" onClick={() => openEdit(item)} className="rounded-full border border-slate-200 p-2.5 text-slate-500 transition hover:border-purple-200 hover:bg-purple-50 hover:text-purple-700">
                    <Edit3 className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-5 grid gap-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 sm:grid-cols-2">
                  <p className="flex items-center gap-2"><Clock3 className="h-4 w-4 text-purple-500" />{dateTime.format(new Date(item.startAt))}</p>
                  <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-purple-500" />{item.location || formatLabel(item.format)}</p>
                  <button type="button" onClick={() => setShowAttendees(item)} className="flex items-center gap-2 text-left font-semibold text-slate-700 transition hover:text-purple-700 sm:col-span-2">
                    <Users className="h-4 w-4 text-purple-500" />
                    {item.registrationCount}/{item.capacity} người đăng ký
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-4">
                {item.status === 'PUBLISHED' && (item.format === 'ONLINE' || item.format === 'HYBRID') && new Date(item.endAt) > new Date() && (
                  <button
                    type="button"
                    onClick={() => openGoogleMeet(item.onlineUrl)}
                    className="inline-flex items-center gap-1.5 rounded-full bg-purple-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-purple-700"
                  >
                    <Video className="h-4 w-4" />
                    {new Date(item.startAt) > new Date() ? 'Mở phòng chuẩn bị' : 'Bắt đầu sự kiện'}
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
              <label className="md:col-span-2"><span className="mb-1.5 block text-sm font-semibold text-slate-700">Tên sự kiện</span><input required minLength={5} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} className={fieldClass} /></label>
              <label><span className="mb-1.5 block text-sm font-semibold text-slate-700">Loại sự kiện</span><select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })} className={fieldClass}>{TYPES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
              <label><span className="mb-1.5 block text-sm font-semibold text-slate-700">Hình thức</span><select value={form.format} onChange={(event) => setForm({ ...form, format: event.target.value })} className={fieldClass}>{FORMATS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
              <label><span className="mb-1.5 block text-sm font-semibold text-slate-700">Bắt đầu</span><input required type="datetime-local" value={form.startAt} onChange={(event) => setForm({ ...form, startAt: event.target.value })} className={fieldClass} /></label>
              <label><span className="mb-1.5 block text-sm font-semibold text-slate-700">Kết thúc</span><input required type="datetime-local" value={form.endAt} onChange={(event) => setForm({ ...form, endAt: event.target.value })} className={fieldClass} /></label>
              {(form.format === 'OFFLINE' || form.format === 'HYBRID') && <label><span className="mb-1.5 block text-sm font-semibold text-slate-700">Địa điểm</span><input required value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} className={fieldClass} /></label>}
              {(form.format === 'ONLINE' || form.format === 'HYBRID') && (
                <label>
                  <span className="mb-1.5 flex items-center justify-between gap-2 text-sm font-semibold text-slate-700">
                    Liên kết tham gia
                    <button
                      type="button"
                      onClick={() => openGoogleMeet()}
                      className="inline-flex items-center gap-1 rounded-full border border-purple-200 bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-700 hover:bg-purple-100"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Tạo phòng Google Meet
                    </button>
                  </span>
                  <input required type="url" value={form.onlineUrl} onChange={(event) => setForm({ ...form, onlineUrl: event.target.value })} placeholder="Tạo phòng Meet, sau đó dán liên kết vào đây" className={fieldClass} />
                  {!googleMeetEnabled && (
                    <button type="button" onClick={() => navigate('/settings')} className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-purple-700">
                      <Settings className="h-3.5 w-3.5" />
                      Bật Google Meet trong Cài đặt
                    </button>
                  )}
                </label>
              )}
              <label><span className="mb-1.5 block text-sm font-semibold text-slate-700">Số người tối đa</span><input required type="number" min="1" max="10000" value={form.capacity} onChange={(event) => setForm({ ...form, capacity: event.target.value })} className={fieldClass} /></label>
              <label><span className="mb-1.5 block text-sm font-semibold text-slate-700">URL ảnh bìa</span><input type="url" value={form.imageUrl} onChange={(event) => setForm({ ...form, imageUrl: event.target.value })} placeholder="Không bắt buộc" className={fieldClass} /></label>
              <label className="md:col-span-2"><span className="mb-1.5 block text-sm font-semibold text-slate-700">Mô tả sự kiện</span><textarea required minLength={20} rows={5} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className={fieldClass} /></label>
            </div>

            <div className="sticky bottom-0 flex justify-end gap-2 border-t border-slate-100 bg-white px-5 py-4">
              <button type="button" onClick={() => setShowForm(false)} className="rounded-full border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">Đóng</button>
              <button disabled={saving} className="rounded-full bg-purple-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-purple-200 disabled:opacity-50">{saving ? 'Đang lưu...' : editing ? 'Lưu thay đổi' : 'Tạo bản nháp'}</button>
            </div>
          </form>
        </div>
      )}

      {showAttendees && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
          <div className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 p-5">
              <div><h2 className="font-semibold text-slate-900">Người đăng ký</h2><p className="text-xs text-slate-500">{showAttendees.title}</p></div>
              <button type="button" title="Đóng" onClick={() => setShowAttendees(null)} className="rounded-full p-2 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
            </div>
            <div className="max-h-96 overflow-y-auto p-4">
              {showAttendees.attendees?.length ? showAttendees.attendees.map((person) => (
                <div key={person.id} className="flex items-center justify-between border-b border-slate-100 py-3">
                  <div><p className="text-sm font-medium text-slate-800">{person.name}</p><p className="text-xs text-slate-500">{person.email}</p></div>
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
