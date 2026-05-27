import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Banknote, BookOpen, CreditCard, ReceiptText, Search, Users } from 'lucide-react';

const currencyFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat('vi-VN');

const text = {
  title: 'Th\u1ed1ng k\u00ea doanh thu',
  description: 'Theo d\u00f5i doanh thu th\u1eadt t\u1eeb c\u00e1c giao d\u1ecbch mua kh\u00f3a h\u1ecdc \u0111\u00e3 ho\u00e0n t\u1ea5t.',
  totalRevenue: 'T\u1ed5ng doanh thu',
  totalPurchases: 'Giao d\u1ecbch',
  totalStudents: 'H\u1ecdc vi\u00ean mua kh\u00f3a',
  averageOrderValue: 'Gi\u00e1 tr\u1ecb trung b\u00ecnh',
  revenueByCourse: 'Doanh thu theo kh\u00f3a h\u1ecdc',
  recentPurchases: 'Giao d\u1ecbch g\u1ea7n \u0111\u00e2y',
  search: 'T\u00ecm kh\u00f3a h\u1ecdc...',
  course: 'Kh\u00f3a h\u1ecdc',
  status: 'Tr\u1ea1ng th\u00e1i',
  price: 'Gi\u00e1',
  sales: 'L\u01b0\u1ee3t mua',
  students: 'H\u1ecdc vi\u00ean',
  revenue: 'Doanh thu',
  published: 'C\u00f4ng khai',
  draft: 'B\u1ea3n nh\u00e1p',
  noCourses: 'Ch\u01b0a c\u00f3 doanh thu t\u1eeb kh\u00f3a h\u1ecdc n\u00e0o.',
  noPurchases: 'Ch\u01b0a c\u00f3 giao d\u1ecbch ho\u00e0n t\u1ea5t.',
};

const InstructorRevenue = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const fetchRevenue = async () => {
      try {
        const response = await axios.get('/api/instructor/revenue');
        setData(response.data);
      } catch (error) {
        console.error('Revenue fetch error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRevenue();
  }, []);

  const courses = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    const source = data?.courses || [];
    if (!keyword) {
      return source;
    }
    return source.filter((course) => course.title?.toLowerCase().includes(keyword));
  }, [data, query]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up">
      <div className="mb-6">
        <h1 className="mb-1 text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">{text.title}</h1>
        <p className="max-w-2xl text-sm text-slate-500">{text.description}</p>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={Banknote} label={text.totalRevenue} value={currencyFormatter.format(data?.totalRevenue || 0)} color="bg-emerald-50 text-emerald-600" />
        <MetricCard icon={ReceiptText} label={text.totalPurchases} value={numberFormatter.format(data?.totalPurchases || 0)} color="bg-purple-50 text-purple-600" />
        <MetricCard icon={Users} label={text.totalStudents} value={numberFormatter.format(data?.totalStudents || 0)} color="bg-sky-50 text-sky-600" />
        <MetricCard icon={CreditCard} label={text.averageOrderValue} value={currencyFormatter.format(data?.averageOrderValue || 0)} color="bg-amber-50 text-amber-600" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_0.8fr]">
        <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-5 md:flex-row md:items-center md:justify-between">
            <h2 className="font-semibold text-slate-900">{text.revenueByCourse}</h2>
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={text.search}
                className="w-full rounded-full border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-4 text-sm transition-colors focus:border-purple-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-100"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <TableHead>{text.course}</TableHead>
                  <TableHead>{text.status}</TableHead>
                  <TableHead>{text.price}</TableHead>
                  <TableHead>{text.sales}</TableHead>
                  <TableHead>{text.students}</TableHead>
                  <TableHead className="text-right">{text.revenue}</TableHead>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {courses.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-12 text-center text-sm text-slate-500">{text.noCourses}</td>
                  </tr>
                ) : (
                  courses.map((course) => (
                    <tr key={course.id} className="transition-colors hover:bg-slate-50/50">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-50">
                            <BookOpen className="h-5 w-5 text-purple-600" />
                          </div>
                          <p className="line-clamp-1 text-sm font-medium text-slate-900">{course.title}</p>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge label={course.isPublished ? text.published : text.draft} published={course.isPublished} />
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-600">{currencyFormatter.format(course.price || 0)}</td>
                      <td className="px-5 py-4 text-sm text-slate-600">{numberFormatter.format(course.purchases || 0)}</td>
                      <td className="px-5 py-4 text-sm text-slate-600">{numberFormatter.format(course.enrollments || 0)}</td>
                      <td className="px-5 py-4 text-right text-sm font-semibold text-slate-900">{currencyFormatter.format(course.revenue || 0)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-slate-900">{text.recentPurchases}</h2>
          <div className="mt-4 space-y-3">
            {(data?.recentPurchases || []).length === 0 ? (
              <p className="rounded-2xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">{text.noPurchases}</p>
            ) : (
              data.recentPurchases.map((purchase) => (
                <div key={purchase.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">{purchase.course?.title}</p>
                      <p className="mt-1 truncate text-xs text-slate-500">{purchase.user?.name || purchase.user?.email}</p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold text-emerald-700">{currencyFormatter.format(purchase.amount || 0)}</p>
                  </div>
                  <p className="mt-2 text-xs text-slate-400">{new Date(purchase.createdAt).toLocaleDateString('vi-VN')}</p>
                </div>
              ))
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};

const MetricCard = ({ icon: Icon, label, value, color }) => (
  <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
    <div className="flex items-center gap-4">
      <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${color}`}>
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
      </div>
    </div>
  </div>
);

const TableHead = ({ children, className = '' }) => (
  <th className={`px-5 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500 ${className}`}>
    {children}
  </th>
);

const StatusBadge = ({ label, published }) => (
  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${published ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
    {label}
  </span>
);

export default InstructorRevenue;
