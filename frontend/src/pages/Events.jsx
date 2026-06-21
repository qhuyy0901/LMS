import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { CalendarDays, Check, Clock3, ExternalLink, MapPin, Users, Video } from 'lucide-react';
import { Link } from 'react-router-dom';
import EventImage from '../components/EventImage';

const TYPES = { WORKSHOP: 'Workshop', SEMINAR: 'Hội thảo', SPECIAL_TOPIC: 'Chuyên đề', WEBINAR: 'Webinar', OTHER: 'Sự kiện' };
const FORMATS = { ONLINE: 'Trực tuyến', OFFLINE: 'Trực tiếp', HYBRID: 'Kết hợp' };
const dateTime = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'full', timeStyle: 'short' });

export default function Events() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('UPCOMING');
  const [busyId, setBusyId] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [currentTime] = useState(() => Date.now());

  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/student/events');
      setEvents(Array.isArray(response.data) ? response.data : []);
      setError('');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Không thể tải danh sách sự kiện.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  const visibleEvents = useMemo(() => {
    return events.filter((item) => {
      return tab === 'REGISTERED'
        ? item.isRegistered
        : tab === 'PAST'
          ? new Date(item.endAt).getTime() < currentTime
          : new Date(item.endAt).getTime() >= currentTime;
    });
  }, [events, tab, currentTime]);

  const registerEvent = async (item) => {
    if (new Date(item.endAt).getTime() <= Date.now()) {
      setError('Sự kiện đã kết thúc, không thể đăng ký.');
      return;
    }
    if (item.registrationCount >= item.capacity) {
      setError('Sự kiện đã đủ số lượng đăng ký');
      return;
    }
    setBusyId(item.id); setNotice(''); setError('');
    try {
      const response = await axios.post(`/api/student/events/${item.id}/register`);
      setEvents((current) => current.map((event) => event.id === item.id
        ? {
            ...event,
            isRegistered: true,
            registrationCount: response.data.registrationCount ?? event.registrationCount + 1,
            pointsUsed: response.data.pointsUsed ?? event.pointCost ?? 0,
            linkThamGia: response.data.linkThamGia ?? event.linkThamGia,
            onlineUrl: response.data.onlineUrl ?? event.onlineUrl,
          }
        : event));
      setNotice((response.data.pointsUsed ?? item.pointCost ?? 0) > 0 ? `Đổi ${(response.data.pointsUsed ?? item.pointCost)} điểm thành công` : 'Đăng ký sự kiện miễn phí thành công');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Không thể đăng ký sự kiện.');
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
      </header>

      {/* Tab Filter */}
      <div className="flex flex-wrap gap-2">
        {[['UPCOMING', 'Sắp diễn ra'], ['REGISTERED', 'Đã đăng ký'], ['PAST', 'Đã kết thúc']].map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition ${
              tab === value 
                ? 'bg-purple-600 text-white shadow-md shadow-purple-200' 
                : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {(notice || error) && (
        <div className={`border px-4 py-3 text-sm ${error ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
          {error || notice}
        </div>
      )}

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="h-64 animate-pulse bg-slate-100" />
          ))}
        </div>
      ) : visibleEvents.length === 0 ? (
        <div className="border border-dashed border-slate-300 bg-white py-16 text-center">
          <CalendarDays className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 text-sm font-medium text-slate-600">Chưa có sự kiện phù hợp.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {visibleEvents.map((item) => {
            const ended = new Date(item.endAt).getTime() <= currentTime;
            const full = item.registrationCount >= item.capacity;
            const online = item.format === 'ONLINE' || item.format === 'HYBRID';
            const pointCost = item.pointCost ?? 0;
            const pointsUsed = item.pointsUsed ?? 0;
            return (
              <article key={item.id} className="flex overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                <div className="flex w-full flex-col">
                  <EventImage src={item.imageUrl} alt={item.title} className="h-44 w-full object-cover" placeholderClassName="h-44 w-full" />
                  <div className="flex flex-1 flex-col p-5">
                    <div className="flex flex-wrap gap-2">
                      <span className="bg-purple-50 px-2 py-1 text-xs font-semibold text-purple-700">{TYPES[item.type]}</span>
                      <span className="bg-cyan-50 px-2 py-1 text-xs font-semibold text-cyan-700">{FORMATS[item.format]}</span>
                      {item.isRegistered && (
                        <span className="inline-flex items-center gap-1 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
                          <Check className="h-3.5 w-3.5" /> Đã đăng ký
                        </span>
                      )}
                    </div>
                    <h2 className="mt-3 text-lg font-semibold text-slate-900">{item.title}</h2>
                    <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-500">{item.description}</p>
                    <div className="mt-4 space-y-2 border-t border-slate-100 pt-4 text-sm text-slate-600">
                      <p className="flex items-start gap-2"><Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-purple-500" />{dateTime.format(new Date(item.startAt))}</p>
                      <p className="flex items-center gap-2">
                        {item.format === 'ONLINE' ? <Video className="h-4 w-4 text-purple-500" /> : <MapPin className="h-4 w-4 text-purple-500" />}
                        {item.location || FORMATS[item.format]}
                      </p>
                      <p className="flex items-center gap-2"><Users className="h-4 w-4 text-purple-500" />{item.registrationCount}/{item.capacity} người tham gia · Giảng viên {item.instructorName}</p>
                      <p className="text-sm font-semibold text-purple-700">
                        {pointCost > 0 ? `${pointCost} điểm để tham gia` : 'Tham gia miễn phí'}
                      </p>
                    </div>
                    {item.isRegistered && online && !ended && (
                      <p className="mt-3 text-xs text-amber-600">Sự kiện chưa bắt đầu, bạn có thể vào phòng trước nếu giảng viên đã mở phòng.</p>
                    )}
                    <div className="mt-auto border-t border-slate-100 pt-5">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <Link to={`/student/events/${item.id}`} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-purple-300 hover:bg-purple-50 hover:text-purple-700">
                          Xem chi tiết
                        </Link>
                        <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
                          {item.isRegistered && online && (
                            <button type="button" onClick={() => joinOnlineEvent(item)} className="inline-flex items-center gap-1.5 rounded-xl border border-purple-200 bg-purple-50 px-4 py-2.5 text-sm font-semibold text-purple-700 transition hover:bg-purple-100">
                              Vào phòng <ExternalLink className="h-4 w-4" />
                            </button>
                          )}
                          {item.isRegistered ? (
                            <span className="inline-flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700">
                              <Check className="h-4 w-4" /> Đã đăng ký
                            </span>
                          ) : (
                            <button
                              type="button"
                              disabled={busyId === item.id || ended || full}
                              onClick={() => registerEvent(item)}
                              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 ${ended || full ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-purple-600 text-white hover:bg-purple-700'}`}
                            >
                              <Check className="h-4 w-4" />
                              {busyId === item.id ? 'Đang đăng ký...' : ended ? 'Sự kiện đã kết thúc' : full ? 'Đã đủ chỗ' : pointCost > 0 ? `Đổi ${pointCost} điểm để tham gia` : 'Tham gia miễn phí'}
                            </button>
                          )}
                        </div>
                      </div>
                      {item.isRegistered && pointsUsed > 0 && (
                        <p className="mt-2 text-right text-xs font-medium text-slate-500">
                          Đã sử dụng {pointsUsed} điểm
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
