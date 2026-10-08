"use client";

import { useState } from "react";
import { Eye, EyeOff, ShoppingBag, Store, UserRound } from "lucide-react";

type Metric = {
  id: "revenue" | "orders" | "customers";
  value: string;
  label: string;
};

export function PerformanceMetrics({
  revenue,
  orders,
  customers,
}: {
  revenue: string;
  orders: string;
  customers: string;
}) {
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  const metrics: Metric[] = [
    { id: "revenue", value: revenue, label: "Revenue today" },
    { id: "orders", value: orders, label: "Orders made" },
    { id: "customers", value: customers, label: "Customers" },
  ];

  function toggle(id: string) {
    setHidden((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="mt-5 divide-y divide-[#EAEAEA]">
      {metrics.map((row, index) => {
        const Icon = index === 0 ? Store : index === 1 ? ShoppingBag : UserRound;
        const isHidden = hidden.has(row.id);

        return (
          <div key={row.id} className="flex items-center gap-3 py-4 first:pt-0">
            <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-[8px] ${index === 0 ? "bg-black text-white" : "bg-[#EFEFEF] text-black"}`}>
              <Icon className="h-4 w-4" strokeWidth={2.3} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-semibold tracking-[-0.02em] text-black">
                {isHidden ? "••••" : row.value}
              </p>
              <p className="mt-1 text-[10px] font-medium text-[#808080]">{row.label}</p>
            </div>
            <button
              type="button"
              onClick={() => toggle(row.id)}
              aria-label={isHidden ? `Show ${row.label}` : `Hide ${row.label}`}
              className="grid h-7 w-7 place-items-center rounded-[7px] text-[#808080] hover:bg-[#F2F2F2]"
            >
              {isHidden ? (
                <Eye className="h-3.5 w-3.5" strokeWidth={2.3} />
              ) : (
                <EyeOff className="h-3.5 w-3.5" strokeWidth={2.3} />
              )}
            </button>
          </div>
        );
      })}
    </div>
  );
}
