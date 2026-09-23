"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";

type ToastTone = "success" | "error" | "info";
type ToastInput = { title: string; description?: string; tone?: ToastTone; key?: string };
type ToastItem = ToastInput & { id: number; revision: number };

const ToastContext = createContext<{ toast: (input: ToastInput) => void } | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const timersRef = useRef(new Map<string | number, number>());

  const toast = useCallback((input: ToastInput) => {
    const lookupKey = input.key ?? Date.now() + Math.floor(Math.random() * 1000);
    let toastId: number | null = null;

    setItems((current) => {
      const existing = input.key
        ? current.find((item) => item.key === input.key)
        : undefined;

      if (existing) {
        toastId = existing.id;
        return current.map((item) =>
          item.id === existing.id
            ? { ...item, tone: "info", ...input, revision: item.revision + 1 }
            : item
        );
      }

      const id =
        typeof lookupKey === "number"
          ? lookupKey
          : Date.now() + Math.floor(Math.random() * 1000);
      toastId = id;
      return [
        ...current.slice(-3),
        { id, revision: 0, tone: "info", ...input },
      ];
    });

    const timerKey = input.key ?? lookupKey;
    const existingTimer = timersRef.current.get(timerKey);
    if (existingTimer) window.clearTimeout(existingTimer);

    const timer = window.setTimeout(() => {
      setItems((current) =>
        current.filter((item) =>
          input.key ? item.key !== input.key : item.id !== toastId
        )
      );
      timersRef.current.delete(timerKey);
    }, 3200);

    timersRef.current.set(timerKey, timer);
  }, []);

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed left-1/2 top-[68px] z-[220] flex w-[min(92vw,390px)] -translate-x-1/2 flex-col-reverse gap-2 md:bottom-6 md:top-auto">
        {items.map((item) => {
          const Icon = item.tone === "success" ? CheckCircle2 : item.tone === "error" ? AlertCircle : Info;
          return (
            <div key={`${item.id}-${item.revision}`} className="pointer-events-auto flex animate-[toast-in_180ms_ease-out] items-start gap-3 rounded-[11px] border border-[#DADADA] bg-white px-3.5 py-3 shadow-[0_12px_38px_rgba(0,0,0,0.14)]">
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
