import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { CalendarDays, Check, Clock3, ExternalLink, MapPin, Search, Users, Video, X } from 'lucide-react';

const TYPES = { WORKSHOP: 'Workshop', SEMINAR: 'Hội thảo', SPECIAL_TOPIC: 'Chuyên đề', WEBINAR: 'Webinar', OTHER: 'Sự kiện' };
const FORMATS = { ONLINE: 'Trực tuyến', OFFLINE: 'Trực tiếp', HYBRID: 'Kết hợp' };
const dateTime = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'full', timeStyle: 'short' });

export default function Events() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [tab, setTab] = useState('UPCOMING');
  const [busyId, setBusyId] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [currentTime] = useState(() => Date.now());

  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/events');
      setEvents(Array.isArray(response.data) ? response.data : []);
      setError('');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Không thể tải danh sách sự kiện.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  const visibleEvents = useMemo(() => {
    const text = keyword.trim().toLowerCase();
    return events.filter((item) => {
      const matchesText = !text || item.title.toLowerCase().includes(text) || item.description.toLowerCase().includes(text);
      const matchesTab = tab === 'REGISTERED' ? item.isRegistered : tab === 'PAST' ? new Date(item.endAt).getTime() < currentTime : new Date(item.endAt).getTime() >= currentTime;
      return matchesText && matchesTab;
    });
  }, [events, keyword, tab, currentTime]);

  const toggleRegistration = async (item) => {
    setBusyId(item.id); setNotice(''); setError('');
    try {
      const response = item.isRegistered
        ? await axios.delete(`/api/events/${item.id}/register`)
        : await axios.post(`/api/events/${item.id}/register`);
      setNotice(response.data.message);
      await loadEvents();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Không thể cập nhật đăng ký sự kiện.');
    } finally { setBusyId(''); }
  };

  const joinOnlineEvent = (item) => {
    const link = item.linkThamGia || item.onlineUrl;
    if (!link) {
      setError('Sự kiện chưa có liên kết tham gia.');
      return;
    }
    window.open(link, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="animate-fade-in-up space-y-5">
      <header className="border-b border-slate-200 pb-6">
        <h1 className="text-2xl font-semibold text-slate-900 md:text-3xl">Sự kiện học tập</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-500">Khám phá workshop, hội thảo và chuyên đề do các giảng viên Skillio tổ chức.</p>
      </header>

      <div className="grid gap-3 border border-slate-200 bg-white p-4 lg:grid-cols-[1fr_auto]">
        <label className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="Tìm theo tên hoặc nội dung sự kiện..." className="w-full border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-purple-300 focus:bg-white focus:ring-2 focus:ring-purple-100" /></label>
        <div className="flex flex-wrap gap-2">
          {[['UPCOMING', 'Sắp diễn ra'], ['REGISTERED', 'Đã đăng ký'], ['PAST', 'Đã kết thúc']].map(([value, label]) => <button key={value} type="button" onClick={() => setTab(value)} className={`px-3 py-2 text-sm font-medium ${tab === value ? 'bg-slate-900 text-white' : 'border border-slate-200 text-slate-600 hover:border-purple-300'}`}>{label}</button>)}
        </div>
      </div>

      {(notice || error) && <div className={`border px-4 py-3 text-sm ${error ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>{error || notice}</div>}

      {loading ? <div className="grid gap-4 md:grid-cols-2">{[1, 2, 3, 4].map((item) => <div key={item} className="h-64 animate-pulse bg-slate-100" />)}</div> : visibleEvents.length === 0 ? (
        <div className="border border-dashed border-slate-300 bg-white py-16 text-center"><CalendarDays className="mx-auto h-10 w-10 text-slate-300" /><p className="mt-3 text-sm font-medium text-slate-600">Chưa có sự kiện phù hợp.</p></div>
      ) : <div className="grid gap-4 md:grid-cols-2">{visibleEvents.map((item) => {
        const started = new Date(item.startAt).getTime() <= currentTime;
        const full = item.registrationCount >= item.capacity;
        return <article key={item.id} className="overflow-hidden border border-slate-200 bg-white">
          {item.imageUrl && <img src={item.imageUrl} alt="" className="h-40 w-full object-cover" />}
          <div className="p-5">
            <div className="flex flex-wrap gap-2"><span className="bg-purple-50 px-2 py-1 text-xs font-semibold text-purple-700">{TYPES[item.type]}</span><span className="bg-cyan-50 px-2 py-1 text-xs font-semibold text-cyan-700">{FORMATS[item.format]}</span>{item.isRegistered && <span className="inline-flex items-center gap-1 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700"><Check className="h-3.5 w-3.5" /> Đã đăng ký</span>}</div>
            <h2 className="mt-3 text-lg font-semibold text-slate-900">{item.title}</h2>
            <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-500">{item.description}</p>
            <div className="mt-4 space-y-2 border-t border-slate-100 pt-4 text-sm text-slate-600">
              <p className="flex items-start gap-2"><Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-purple-500" />{dateTime.format(new Date(item.startAt))}</p>
              <p className="flex items-center gap-2">{item.format === 'ONLINE' ? <Video className="h-4 w-4 text-purple-500" /> : <MapPin className="h-4 w-4 text-purple-500" />}{item.location || FORMATS[item.format]}</p>
              <p className="flex items-center gap-2"><Users className="h-4 w-4 text-purple-500" />{item.registrationCount}/{item.capacity} người tham gia · Giảng viên {item.instructorName}</p>
            </div>
            {(item.format === 'ONLINE' || item.format === 'HYBRID') && !started && (
              <p className="mt-3 text-xs text-amber-600">Sự kiện chưa bắt đầu, bạn có thể vào trước nếu giảng viên đã mở phòng.</p>
            )}
            <div className="mt-5 flex items-center justify-between gap-3">
              {(item.format === 'ONLINE' || item.format === 'HYBRID') && (
                <button type="button" onClick={() => joinOnlineEvent(item)} className="inline-flex items-center gap-1.5 bg-purple-50 px-3 py-2 text-xs font-semibold text-purple-700 hover:bg-purple-100">
                  Tham gia <ExternalLink className="h-3.5 w-3.5" />
                </button>
              )}
              <button type="button" disabled={busyId === item.id || started || (!item.isRegistered && full)} onClick={() => toggleRegistration(item)} className={`ml-auto inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 ${item.isRegistered ? 'border border-red-200 text-red-700 hover:bg-red-50' : 'bg-purple-600 text-white hover:bg-purple-700'}`}>{item.isRegistered ? <X className="h-4 w-4" /> : <Check className="h-4 w-4" />}{started ? 'Đã bắt đầu' : item.isRegistered ? 'Hủy đăng ký' : full ? 'Đã đủ chỗ' : 'Đăng ký tham gia'}</button>
            </div>
          </div>
        </article>;
      })}</div>}
    </div>
  );
}
