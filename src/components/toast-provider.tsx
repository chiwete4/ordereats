"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";

type ToastTone = "success" | "error" | "info";
type ToastInput = { title: string; description?: string; tone?: ToastTone };
type ToastItem = ToastInput & { id: number };

const ToastContext = createContext<{ toast: (input: ToastInput) => void } | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const toast = useCallback((input: ToastInput) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setItems((current) => [...current.slice(-3), { id, tone: "info", ...input }]);
    window.setTimeout(() => {
      setItems((current) => current.filter((item) => item.id !== id));
    }, 4200);
  }, []);

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed left-1/2 top-[68px] z-[220] flex w-[min(92vw,390px)] -translate-x-1/2 flex-col-reverse gap-2 md:bottom-6 md:top-auto">
        {items.map((item) => {
          const Icon = item.tone === "success" ? CheckCircle2 : item.tone === "error" ? AlertCircle : Info;
          return (
            <div key={item.id} className="pointer-events-auto flex items-start gap-3 rounded-[11px] border border-[#DADADA] bg-white px-3.5 py-3 shadow-[0_12px_38px_rgba(0,0,0,0.14)]">
              <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${item.tone === "error" ? "text-red-600" : item.tone === "success" ? "text-green-600" : "text-black"}`} strokeWidth={2.4} />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold tracking-[-0.02em] text-black">{item.title}</p>
                {item.description ? <p className="mt-0.5 text-[9px] leading-[1.4] text-[#777]">{item.description}</p> : null}
              </div>
              <button type="button" onClick={() => setItems((current) => current.filter((toast) => toast.id !== item.id))} aria-label="Dismiss notification" className="grid h-5 w-5 place-items-center">
                <X className="h-3.5 w-3.5" strokeWidth={2.3} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside ToastProvider");
  return context.toast;
}
