/**
 * Reusable Stat Card with built-in Skeleton loader.
 * Used on the main Dashboard for role-specific KPIs.
 */

const StatCardSkeleton = () => (
  <div className="p-[1.5px] rounded-[1.25rem] bg-purple-50/40 dark:bg-slate-800/60 border border-purple-100/40 dark:border-slate-800/40 shadow-[0_2px_8px_rgba(0,0,0,0.01)] animate-pulse h-full">
    <div className="bg-white dark:bg-slate-900 rounded-[calc(1.25rem-1.5px)] p-5 flex flex-col justify-between h-full">
      <div className="flex items-center gap-4 mb-3">
        <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-16 bg-slate-100 dark:bg-slate-800 rounded" />
          <div className="h-6 w-24 bg-slate-100 dark:bg-slate-800 rounded" />
        </div>
      </div>
      <div className="h-3 w-28 bg-slate-100 dark:bg-slate-800 rounded" />
    </div>
  </div>
);

const StatCard = ({ icon: Icon, label, value, subtitle, color, loading = false }) => {
  if (loading) {
    return <StatCardSkeleton />;
  }

  // Map older raw tailwind bg/text combinations to premium desaturated ones
  let parsedColor = color;
  if (color === 'bg-green-100 text-green-600') {
    parsedColor = 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400';
  } else if (color === 'bg-amber-100 text-amber-600' || color === 'bg-amber-50 text-amber-600') {
    parsedColor = 'bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400';
  } else if (color === 'bg-purple-100 text-purple-600' || color === 'bg-purple-50 text-purple-600') {
    parsedColor = 'bg-purple-50 text-purple-650 dark:bg-purple-950/30 dark:text-purple-400';
  } else if (color === 'bg-blue-50 text-blue-600') {
    parsedColor = 'bg-blue-50 text-blue-650 dark:bg-blue-950/30 dark:text-blue-400';
  } else if (color === 'bg-rose-50 text-rose-600') {
    parsedColor = 'bg-rose-50 text-rose-650 dark:bg-rose-950/30 dark:text-rose-400';
  }

  return (
    <div className="p-[1.5px] rounded-[1.25rem] bg-purple-50/40 dark:bg-slate-800/60 border border-purple-100/40 dark:border-slate-800/40 shadow-[0_2px_8px_rgba(0,0,0,0.01)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_4px_16px_rgba(147,51,234,0.04)] group h-full">
      <div className="bg-white dark:bg-slate-900 rounded-[calc(1.25rem-1.5px)] p-5 flex flex-col justify-between h-full">
        <div>
          <div className="flex items-center gap-3.5 mb-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-105 ${parsedColor}`}
            >
              <Icon className="w-5 h-5" strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-[11px] tracking-wider uppercase font-semibold text-slate-400 dark:text-slate-500">
                {label}
              </p>
              <h4 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">{value}</h4>
            </div>
          </div>
        </div>
        {subtitle && (
          <div className="border-t border-purple-50/30 dark:border-slate-800 pt-2.5 mt-1.5">
            <p className="text-[11px] text-slate-450 dark:text-slate-500 font-medium">{subtitle}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export { StatCard, StatCardSkeleton };
export default StatCard;
