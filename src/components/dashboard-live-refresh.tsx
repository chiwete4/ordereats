"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function DashboardLiveRefresh({
  intervalMs = 12000,
}: {
  intervalMs?: number;
}) {
  const router = useRouter();

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;

    const refresh = () => {
      if (document.visibilityState === "visible") {
        router.refresh();
      }
    };

    const start = () => {
      if (timer) clearInterval(timer);
      timer = setInterval(refresh, intervalMs);
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        refresh();
        start();
      }
    };

    const handleFocus = () => refresh();

    start();
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", handleFocus);

    return () => {
      if (timer) clearInterval(timer);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", handleFocus);
    };
  }, [intervalMs, router]);

  return null;
}
