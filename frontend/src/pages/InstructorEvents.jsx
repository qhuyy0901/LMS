import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { CalendarDays, CheckCircle2, Clock3, Edit3, MapPin, Plus, Search, Trash2, Users, X, XCircle } from 'lucide-react';

const TYPES = [
  { value: 'WORKSHOP', label: 'Workshop' }, { value: 'SEMINAR', label: 'Hội thảo' },
  { value: 'SPECIAL_TOPIC', label: 'Chuyên đề' }, { value: 'WEBINAR', label: 'Webinar' },
  { value: 'OTHER', label: 'Khác' },
];
const FORMATS = [{ value: 'OFFLINE', label: 'Trực tiếp' }, { value: 'ONLINE', label: 'Trực tuyến' }, { value: 'HYBRID', label: 'Kết hợp' }];
const STATUS = {
  DRAFT: { label: 'Bản nháp', className: 'bg-slate-100 text-slate-700' },
  PUBLISHED: { label: 'Đã xuất bản', className: 'bg-emerald-50 text-emerald-700' },
  CANCELLED: { label: 'Đã hủy', className: 'bg-red-50 text-red-700' },
};
const emptyForm = { title: '', description: '', type: 'WORKSHOP', format: 'OFFLINE', startAt: '', endAt: '', location: '', onlineUrl: '', imageUrl: '', capacity: 50 };
const fieldClass = 'w-full border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-purple-400 focus:ring-2 focus:ring-purple-100';
const dateTime = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' });
const toInputDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

export default function InstructorEvents() {
  const [events, setEvents] = useState([]);
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
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  const filteredEvents = useMemo(() => {
    const text = keyword.trim().toLowerCase();
    return events.filter((item) => (filter === 'ALL' || item.status === filter)
      && (!text || item.title.toLowerCase().includes(text) || item.description.toLowerCase().includes(text)));
  }, [events, keyword, filter]);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setShowForm(true); };
  const openEdit = (item) => {
    setEditing(item);
    setForm({ title: item.title, description: item.description, type: item.type, format: item.format, startAt: toInputDate(item.startAt), endAt: toInputDate(item.endAt), location: item.location || '', onlineUrl: item.onlineUrl || '', imageUrl: item.imageUrl || '', capacity: item.capacity });
    setShowForm(true);
  };

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true); setError(''); setNotice('');
    try {
      const payload = { ...form, capacity: Number(form.capacity), startAt: new Date(form.startAt).toISOString(), endAt: new Date(form.endAt).toISOString() };
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
    } finally { setSaving(false); }
  };

  const runAction = async (item, action, confirmText) => {
    if (confirmText && !window.confirm(confirmText)) return;
    setError(''); setNotice('');
    try {
      if (action === 'delete') await axios.delete(`/api/instructor/events/${item.id}`);
      else await axios.patch(`/api/instructor/events/${item.id}/${action}`);
      setNotice(action === 'publish' ? 'Đã xuất bản sự kiện.' : action === 'cancel' ? 'Đã hủy sự kiện.' : 'Đã xóa sự kiện.');
      await loadEvents();
    } catch (requestError) { setError(requestError.response?.data?.message || 'Không thể thực hiện thao tác.'); }
  };

  return (
    <div className="animate-fade-in-up space-y-5">
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div><h1 className="text-2xl font-semibold text-slate-900 md:text-3xl">Quản lý sự kiện</h1><p className="mt-1 text-sm text-slate-500">Tạo workshop, hội thảo và chuyên đề dành cho học viên.</p></div>
        <button type="button" onClick={openCreate} className="inline-flex items-center justify-center gap-2 bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-purple-700"><Plus className="h-4 w-4" /> Tạo sự kiện</button>
      </header>

      <div className="grid gap-3 border border-slate-200 bg-white p-4 lg:grid-cols-[1fr_auto]">
        <label className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="Tìm sự kiện..." className={`${fieldClass} pl-9`} /></label>
        <div className="flex flex-wrap gap-2">{['ALL', 'DRAFT', 'PUBLISHED', 'CANCELLED'].map((value) => <button key={value} type="button" onClick={() => setFilter(value)} className={`px-3 py-2 text-sm font-medium ${filter === value ? 'bg-slate-900 text-white' : 'border border-slate-200 text-slate-600 hover:border-purple-300'}`}>{value === 'ALL' ? 'Tất cả' : STATUS[value].label}</button>)}</div>
      </div>
      {(notice || error) && <div className={`border px-4 py-3 text-sm ${error ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>{error || notice}</div>}

      {loading ? <div className="py-16 text-center text-sm text-slate-500">Đang tải sự kiện...</div> : filteredEvents.length === 0 ? (
        <div className="border border-dashed border-slate-300 bg-white py-16 text-center"><CalendarDays className="mx-auto h-9 w-9 text-slate-300" /><p className="mt-3 text-sm font-medium text-slate-600">Chưa có sự kiện phù hợp.</p></div>
      ) : <div className="grid gap-4 xl:grid-cols-2">{filteredEvents.map((item) => (
        <article key={item.id} className="border border-slate-200 bg-white p-5">
          <div className="flex items-start justify-between gap-4"><div><div className="mb-2 flex flex-wrap gap-2"><span className={`px-2 py-1 text-xs font-semibold ${STATUS[item.status]?.className}`}>{STATUS[item.status]?.label}</span><span className="bg-purple-50 px-2 py-1 text-xs font-semibold text-purple-700">{TYPES.find((type) => type.value === item.type)?.label}</span></div><h2 className="text-lg font-semibold text-slate-900">{item.title}</h2><p className="mt-1 line-clamp-2 text-sm text-slate-500">{item.description}</p></div><button type="button" title="Chỉnh sửa" onClick={() => openEdit(item)} className="border border-slate-200 p-2 text-slate-500 hover:border-purple-300 hover:text-purple-700"><Edit3 className="h-4 w-4" /></button></div>
          <div className="mt-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-2"><p className="flex items-center gap-2"><Clock3 className="h-4 w-4 text-purple-500" />{dateTime.format(new Date(item.startAt))}</p><p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-purple-500" />{item.location || FORMATS.find((format) => format.value === item.format)?.label}</p><button type="button" onClick={() => setShowAttendees(item)} className="flex items-center gap-2 text-left font-medium text-slate-700 hover:text-purple-700"><Users className="h-4 w-4 text-purple-500" />{item.registrationCount}/{item.capacity} người đăng ký</button></div>
          <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4">{item.status !== 'PUBLISHED' && <button type="button" onClick={() => runAction(item, 'publish')} className="inline-flex items-center gap-1.5 bg-emerald-600 px-3 py-2 text-xs font-semibold text-white"><CheckCircle2 className="h-4 w-4" /> Xuất bản</button>}{item.status !== 'CANCELLED' && <button type="button" onClick={() => runAction(item, 'cancel', 'Bạn chắc chắn muốn hủy sự kiện này?')} className="inline-flex items-center gap-1.5 border border-amber-200 px-3 py-2 text-xs font-semibold text-amber-700"><XCircle className="h-4 w-4" /> Hủy sự kiện</button>}<button type="button" onClick={() => runAction(item, 'delete', 'Bạn chắc chắn muốn xóa sự kiện này?')} className="inline-flex items-center gap-1.5 border border-red-200 px-3 py-2 text-xs font-semibold text-red-700"><Trash2 className="h-4 w-4" /> Xóa</button></div>
        </article>
      ))}</div>}

      {showForm && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4"><form onSubmit={submit} className="max-h-[92vh] w-full max-w-3xl overflow-y-auto bg-white shadow-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4"><div><h2 className="text-lg font-semibold text-slate-900">{editing ? 'Chỉnh sửa sự kiện' : 'Tạo sự kiện mới'}</h2><p className="text-xs text-slate-500">Điền đủ thông tin trước khi xuất bản.</p></div><button type="button" title="Đóng" onClick={() => setShowForm(false)} className="p-2 text-slate-500"><X className="h-5 w-5" /></button></div>
        <div className="grid gap-4 p-5 md:grid-cols-2">
          <label className="md:col-span-2"><span className="mb-1.5 block text-sm font-medium">Tên sự kiện</span><input required minLength={5} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={fieldClass} /></label>
          <label><span className="mb-1.5 block text-sm font-medium">Loại sự kiện</span><select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className={fieldClass}>{TYPES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
          <label><span className="mb-1.5 block text-sm font-medium">Hình thức</span><select value={form.format} onChange={(e) => setForm({ ...form, format: e.target.value })} className={fieldClass}>{FORMATS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
          <label><span className="mb-1.5 block text-sm font-medium">Bắt đầu</span><input required type="datetime-local" value={form.startAt} onChange={(e) => setForm({ ...form, startAt: e.target.value })} className={fieldClass} /></label>
          <label><span className="mb-1.5 block text-sm font-medium">Kết thúc</span><input required type="datetime-local" value={form.endAt} onChange={(e) => setForm({ ...form, endAt: e.target.value })} className={fieldClass} /></label>
          {(form.format === 'OFFLINE' || form.format === 'HYBRID') && <label><span className="mb-1.5 block text-sm font-medium">Địa điểm</span><input required value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className={fieldClass} /></label>}
          {(form.format === 'ONLINE' || form.format === 'HYBRID') && <label><span className="mb-1.5 block text-sm font-medium">Liên kết tham gia</span><input required type="url" value={form.onlineUrl} onChange={(e) => setForm({ ...form, onlineUrl: e.target.value })} className={fieldClass} /></label>}
          <label><span className="mb-1.5 block text-sm font-medium">Số người tối đa</span><input required type="number" min="1" max="10000" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} className={fieldClass} /></label>
          <label><span className="mb-1.5 block text-sm font-medium">URL ảnh bìa (không bắt buộc)</span><input type="url" value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} className={fieldClass} /></label>
          <label className="md:col-span-2"><span className="mb-1.5 block text-sm font-medium">Mô tả sự kiện</span><textarea required minLength={20} rows={5} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={fieldClass} /></label>
        </div>
        <div className="sticky bottom-0 flex justify-end gap-2 border-t border-slate-200 bg-white px-5 py-4"><button type="button" onClick={() => setShowForm(false)} className="border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600">Đóng</button><button disabled={saving} className="bg-purple-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? 'Đang lưu...' : editing ? 'Lưu thay đổi' : 'Tạo bản nháp'}</button></div>
      </form></div>}

      {showAttendees && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4"><div className="w-full max-w-lg bg-white shadow-xl"><div className="flex items-center justify-between border-b border-slate-200 p-4"><div><h2 className="font-semibold text-slate-900">Người đăng ký</h2><p className="text-xs text-slate-500">{showAttendees.title}</p></div><button type="button" title="Đóng" onClick={() => setShowAttendees(null)} className="p-2 text-slate-500"><X className="h-5 w-5" /></button></div><div className="max-h-96 overflow-y-auto p-4">{showAttendees.attendees?.length ? showAttendees.attendees.map((person) => <div key={person.id} className="flex items-center justify-between border-b border-slate-100 py-3"><div><p className="text-sm font-medium text-slate-800">{person.name}</p><p className="text-xs text-slate-500">{person.email}</p></div><span className="text-xs text-slate-400">{dateTime.format(new Date(person.registeredAt))}</span></div>) : <p className="py-8 text-center text-sm text-slate-500">Chưa có người đăng ký.</p>}</div></div></div>}
    </div>
  );
}
