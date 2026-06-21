import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import {
  ArrowLeft,
  Check,
  Clock3,
  Edit3,
  Image as ImageIcon,
  MapPin,
  Trash2,
  Users,
  Video,
  XCircle,
} from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import EventImage from '../components/EventImage';

const TYPES = { WORKSHOP: 'Workshop', SEMINAR: 'Hội thảo', SPECIAL_TOPIC: 'Chuyên đề', WEBINAR: 'Webinar', OTHER: 'Sự kiện' };
const FORMATS = { ONLINE: 'Trực tuyến', OFFLINE: 'Trực tiếp', HYBRID: 'Kết hợp' };
const STATUS = { DRAFT: 'Bản nháp', PUBLISHED: 'Đã xuất bản', CANCELLED: 'Đã hủy' };
const dateTime = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'full', timeStyle: 'short' });

export default function EventDetails() {
  const { eventId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isInstructor = user?.role === 'INSTRUCTOR' || user?.role === 'ADMIN';
  const apiBase = isInstructor ? '/api/instructor/events' : '/api/student/events';
  const backUrl = isInstructor ? '/instructor/events' : '/events';
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [currentTime] = useState(() => Date.now());
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadEvent = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.get(`${apiBase}/${eventId}`);
      setEvent(response.data);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Không thể tải chi tiết sự kiện.');
    } finally {
      setLoading(false);
    }
  }, [apiBase, eventId]);

  useEffect(() => { loadEvent(); }, [loadEvent]);

  const openMeeting = () => {
    const link = event?.linkThamGia || event?.onlineUrl;
    if (!link) {
      setError('Sự kiện chưa có liên kết tham gia.');
      return;
    }
    window.open(link, '_blank', 'noopener,noreferrer');
  };

  const register = async () => {
    if (new Date(event.endAt).getTime() <= Date.now()) {
      setError('Sự kiện đã kết thúc, không thể đăng ký.');
      return;
    }
    if (event.registrationCount >= event.capacity) {
      setError('Sự kiện đã đủ số lượng đăng ký');
      return;
    }
    setBusy(true); setError(''); setMessage('');
    try {
      const response = await axios.post(`/api/student/events/${eventId}/register`);
      setEvent((current) => ({
        ...current,
        isRegistered: true,
        registrationCount: response.data.registrationCount ?? current.registrationCount + 1,
        pointsUsed: response.data.pointsUsed ?? current.pointCost ?? 0,
        linkThamGia: response.data.linkThamGia ?? current.linkThamGia,
        onlineUrl: response.data.onlineUrl ?? current.onlineUrl,
      }));
      const pointsUsed = response.data.pointsUsed ?? event.pointCost ?? 0;
      setMessage(pointsUsed > 0 ? `Đổi ${pointsUsed} điểm thành công` : 'Đăng ký sự kiện miễn phí thành công');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Không thể đăng ký tham gia.');
    } finally { setBusy(false); }
  };

  const runInstructorAction = async (action) => {
    if ((action === 'cancel' || action === 'delete') && !window.confirm(`Bạn chắc chắn muốn ${action === 'delete' ? 'xóa' : 'hủy'} sự kiện này?`)) return;
    setBusy(true); setError(''); setMessage('');
    try {
      if (action === 'delete') {
        await axios.delete(`/api/instructor/events/${eventId}`);
        navigate('/instructor/events');
        return;
      }
      const response = await axios.patch(`/api/instructor/events/${eventId}/${action}`);
      setMessage(response.data.message);
      await loadEvent();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Không thể thực hiện thao tác.');
    } finally { setBusy(false); }
  };

  if (loading) return <div className="rounded-3xl border border-slate-100 bg-white py-16 text-center text-sm text-slate-500">Đang tải chi tiết sự kiện...</div>;
  if (!event) return <div className="rounded-3xl border border-rose-100 bg-white py-16 text-center text-sm text-rose-600">{error || 'Không tìm thấy sự kiện.'}</div>;

  const online = event.format === 'ONLINE' || event.format === 'HYBRID';
  const ended = new Date(event.endAt).getTime() <= currentTime;
  const full = event.registrationCount >= event.capacity;
  const images = event.images || [];
  const pointCost = event.pointCost ?? 0;
  const pointsUsed = event.pointsUsed ?? 0;

  return (
    <div className="animate-fade-in-up space-y-6 pb-16">
      <Link to={backUrl} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-purple-700">
        <ArrowLeft className="h-4 w-4" /> Quay lại danh sách sự kiện
      </Link>

      {(message || error) && <div className={`rounded-2xl border px-4 py-3 text-sm ${error ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>{error || message}</div>}

      <article className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
        <EventImage src={event.imageUrl} alt={event.title} className="h-72 w-full object-cover md:h-96" placeholderClassName="h-64 w-full md:h-96" />
        <div className="p-6 md:p-8">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <div className="mb-3 flex flex-wrap gap-2">
                <Badge>{TYPES[event.type] || 'Sự kiện'}</Badge>
                <Badge>{FORMATS[event.format] || event.format}</Badge>
                <Badge>{STATUS[event.status] || event.status}</Badge>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">{event.title}</h1>
              <p className="mt-2 text-sm text-slate-500">Giảng viên {event.instructorName}</p>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <div className="flex flex-wrap items-center gap-2">
                {online && ((isInstructor && event.linkThamGia) || (!isInstructor && event.isRegistered)) && <ActionButton icon={Video} onClick={openMeeting}>Vào phòng</ActionButton>}
                {isInstructor && <>
                  <ActionButton icon={Edit3} secondary onClick={() => navigate(`/instructor/events?edit=${event.id}`)}>Sửa</ActionButton>
                  {event.status !== 'PUBLISHED' && <ActionButton icon={Check} onClick={() => runInstructorAction('publish')} disabled={busy}>Xuất bản</ActionButton>}
                  {event.status !== 'CANCELLED' && <ActionButton icon={XCircle} secondary onClick={() => runInstructorAction('cancel')} disabled={busy}>Hủy</ActionButton>}
                  <ActionButton icon={Trash2} danger onClick={() => runInstructorAction('delete')} disabled={busy}>Xóa</ActionButton>
                </>}
                {!isInstructor && !event.isRegistered && <ActionButton icon={Check} onClick={register} disabled={busy || ended || full}>{busy ? 'Đang đăng ký...' : ended ? 'Sự kiện đã kết thúc' : full ? 'Đã đủ chỗ' : pointCost > 0 ? `Đổi ${pointCost} điểm để tham gia` : 'Tham gia miễn phí'}</ActionButton>}
                {!isInstructor && event.isRegistered && <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700"><Check className="h-4 w-4" /> Đã đăng ký</span>}
              </div>
              {!isInstructor && event.isRegistered && pointsUsed > 0 && (
                <p className="text-xs font-medium text-slate-500">
                  Đã sử dụng {pointsUsed} điểm
                </p>
              )}
            </div>
          </div>

          <div className="mt-8 grid gap-4 rounded-2xl bg-slate-50 p-5 md:grid-cols-2">
            <Info icon={Clock3} label="Bắt đầu" value={dateTime.format(new Date(event.startAt))} />
            <Info icon={Clock3} label="Kết thúc" value={dateTime.format(new Date(event.endAt))} />
            <Info icon={online ? Video : MapPin} label={online ? 'Liên kết tham gia' : 'Địa điểm tổ chức'} value={online ? (event.linkThamGia || event.onlineUrl || (!isInstructor && !event.isRegistered ? (pointCost > 0 ? 'Đổi điểm để xem liên kết.' : 'Đăng ký để xem liên kết.') : 'Sự kiện chưa có liên kết tham gia.')) : (event.location || 'Chưa cập nhật địa điểm')} />
            <Info icon={Users} label="Người tham gia" value={`${event.registrationCount}/${event.capacity} người đã đăng ký`} />
            <Info icon={Check} label="Điểm tham gia" value={pointCost > 0 ? `${pointCost} điểm` : 'Miễn phí'} />
          </div>

          <section className="mt-8">
            <h2 className="text-lg font-semibold text-slate-900">Mô tả sự kiện</h2>
            <p className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-600">{event.description}</p>
          </section>

          {images.length > 0 && <section className="mt-8">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900"><ImageIcon className="h-5 w-5 text-purple-600" /> Danh sách ảnh sự kiện</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{images.map((image) => <EventImage key={image.id} src={image.imageUrl} alt={event.title} className="aspect-video w-full rounded-2xl border border-slate-100 object-cover" placeholderClassName="aspect-video w-full rounded-2xl border border-slate-100" />)}</div>
          </section>}
        </div>
      </article>
    </div>
  );
}

const Badge = ({ children }) => <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-700">{children}</span>;
const Info = ({ icon: Icon, label, value }) => <div className="flex items-start gap-3"><Icon className="mt-0.5 h-5 w-5 shrink-0 text-purple-600" /><div><p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</p><p className="mt-1 break-all text-sm font-medium text-slate-700">{value}</p></div></div>;
const ActionButton = ({ icon: Icon, children, secondary, danger, ...props }) => <button type="button" className={`inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold disabled:opacity-50 ${danger ? 'border border-rose-200 bg-white text-rose-700 hover:bg-rose-50' : secondary ? 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50' : 'bg-purple-600 text-white hover:bg-purple-700'}`} {...props}><Icon className="h-4 w-4" />{children}</button>;
