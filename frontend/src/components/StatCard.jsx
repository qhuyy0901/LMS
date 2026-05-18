/**
 * Reusable Stat Card with built-in Skeleton loader.
 * Used on the main Dashboard for role-specific KPIs.
 */

const StatCardSkeleton = () => (
  <div className="bg-white rounded-2xl p-5 border border-slate-100 animate-pulse">
    <div className="flex items-center gap-4 mb-4">
      <div className="w-12 h-12 rounded-2xl bg-slate-100" />
      <div className="flex-1 space-y-2">
        <div className="h-3 w-20 bg-slate-100 rounded" />
        <div className="h-6 w-28 bg-slate-100 rounded" />
      </div>
    </div>
    <div className="h-3 w-32 bg-slate-100 rounded" />
  </div>
);

const StatCard = ({ icon: Icon, label, value, subtitle, color, loading = false }) => {
  if (loading) {
    return <StatCardSkeleton />;
  }

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1 group">
      <div className="flex items-center gap-4 mb-4">
        <div
          className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3 ${color}`}
        >
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <p className="text-sm font-medium text-slate-500 transition-colors duration-300 group-hover:text-slate-700">
            {label}
          </p>
          <h4 className="text-2xl font-bold text-slate-900">{value}</h4>
        </div>
      </div>
      {subtitle && (
        <p className="text-xs text-slate-400 font-medium">{subtitle}</p>
      )}
    </div>
  );
};

export { StatCard, StatCardSkeleton };
export default StatCard;
