"use client";

export type PerformanceDay = {
  label: string;
  dateLabel: string;
  count: number;
  revenue: number;
  customers: number;
};

const moneyFormatter = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
});

export function PerformanceChart({ days }: { days: PerformanceDay[] }) {
  const max = Math.max(1, ...days.map((day) => day.count));

  return (
    <div className="mt-8 flex h-[150px] items-end gap-3 border-b border-[#EAEAEA] px-2">
      {days.map((day, index) => {
        const height = Math.max(28, Math.round((day.count / max) * 120));
        const active = index === days.length - 1;
        return (
          <div key={day.dateLabel} className="group relative flex min-w-0 flex-1 flex-col items-center justify-end gap-2">
            <div
              className={`w-full max-w-[34px] rounded-t-[8px] ${active ? "bg-black" : "bg-[#E5E5E5]"}`}
              style={{ height }}
            />
            <span className={`pb-2 text-[8px] font-semibold ${active ? "text-black" : "text-[#9A9A9A]"}`}>
              {day.label}
            </span>

            <div className="pointer-events-none absolute bottom-[calc(100%+8px)] left-1/2 z-20 w-[150px] -translate-x-1/2 rounded-[9px] border border-[#D8D8D8] bg-white px-3 py-2 opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
              <p className="text-[10px] font-semibold text-black">{day.dateLabel}</p>
              <p className="mt-1 text-[9px] text-[#777777]">{day.count} orders</p>
              <p className="mt-1 text-[9px] text-[#777777]">{moneyFormatter.format(day.revenue)} revenue</p>
              <p className="mt-1 text-[9px] text-[#777777]">{day.customers} customers</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
