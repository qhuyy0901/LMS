import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Award, CalendarDays, Search } from 'lucide-react';

const formatDate = (value) =>
  value
    ? new Intl.DateTimeFormat('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }).format(new Date(value))
    : 'Chưa có ngày cấp';

const Certificates = () => {
  const [certificates, setCertificates] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCertificates = async () => {
      try {
        const response = await axios.get('/api/user/certificates');
        setCertificates(response.data || []);
      } catch (error) {
        console.error('Certificates fetch error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCertificates();
  }, []);

  const filteredCertificates = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) {
      return certificates;
    }
    return certificates.filter((certificate) =>
      certificate.course?.title?.toLowerCase().includes(keyword) ||
      certificate.certificateNo?.toLowerCase().includes(keyword)
    );
  }, [certificates, query]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up pb-20">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">Chứng chỉ của tôi</h1>

        </div>
        <div className="relative w-full md:w-80">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm chứng chỉ..."
            className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm outline-none transition focus:border-purple-400 focus:ring-4 focus:ring-purple-100"
          />
        </div>
      </div>

      {filteredCertificates.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-10 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-50 text-purple-600">
            <Award className="h-7 w-7" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900">Chưa có chứng chỉ</h2>
          <p className="mt-2 text-sm text-slate-500">Hoàn thành khóa học để chứng chỉ xuất hiện tại đây.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredCertificates.map((certificate) => (
            <article key={certificate.id} className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
              <div className="mb-4 flex h-40 items-center justify-center overflow-hidden rounded-2xl bg-slate-50">
                {certificate.course?.thumbnail ? (
                  <img src={certificate.course.thumbnail} alt={certificate.course.title} className="h-full w-full object-cover" />
                ) : (
                  <Award className="h-12 w-12 text-purple-300" />
                )}
              </div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-purple-500">{certificate.certificateNo}</p>
              <h2 className="mt-2 line-clamp-2 text-base font-semibold text-slate-900">{certificate.course?.title || 'Khóa học'}</h2>
              <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
                <CalendarDays className="h-4 w-4" />
                {formatDate(certificate.issuedAt)}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};

export default Certificates;
