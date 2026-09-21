"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Bike,
  ChevronRight,
  PackageCheck,
  ShoppingBag,
  Star,
  UserRound,
  X,
} from "lucide-react";

export type DashboardExplorerItem = {
  id: string;
  title: string;
  subtitle?: string;
  status?: string;
  statusTone?: "neutral" | "green" | "red" | "amber";
  imageUrl?: string | null;
  body?: string | null;
  details?: Array<{ label: string; value: string }>;
  cursor?: string;
};

export type DashboardExplorerPagination = {
  restaurantId: string;
  kind: "pending" | "active" | "past" | "staff" | "riders" | "reviews";
};

function EmptyState({ title }: { title: string }) {
  return (
    <div className="grid min-h-[380px] place-items-center text-center">
      <div>
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-[12px] border border-[#D8D8D8] bg-[#F3F3F3] text-[#8A8A8A]">
          <ShoppingBag className="h-5 w-5" strokeWidth={2.2} />
        </span>
        <p className="mt-3 text-[13px] font-semibold text-black">Nothing here yet</p>
        <p className="mx-auto mt-1 max-w-[260px] text-[10px] leading-[1.5] text-[#808080]">
          {title} will appear here as real data becomes available.
        </p>
      </div>
    </div>
  );
}

function Status({ value, tone = "neutral" }: { value?: string; tone?: DashboardExplorerItem["statusTone"] }) {
  if (!value) return null;
  const classes =
    tone === "green"
      ? "bg-green-50 text-green-600"
      : tone === "red"
        ? "bg-red-50 text-red-600"
        : tone === "amber"
          ? "bg-amber-50 text-amber-700"
          : "bg-[#F1F1F1] text-[#6F6F6F]";
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-[9px] font-semibold ${classes}`}>
      {value}
    </span>
  );
}

export function DashboardSectionExplorer({
  title,
  count,
  items,
  triggerLabel = "Expand",
  triggerClassName,
  pagination,
}: {
  title: string;
  count?: number;
  items: DashboardExplorerItem[];
  triggerLabel?: ReactNode;
  triggerClassName?: string;
  pagination?: DashboardExplorerPagination;
}) {
  const [open, setOpen] = useState(false);
  const [loadedItems, setLoadedItems] = useState(items);
  const [selectedId, setSelectedId] = useState(items[0]?.id ?? "");
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(Boolean(pagination));
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!pagination) {
      setLoadedItems(items);
      setSelectedId((current) =>
        items.some((item) => item.id === current) ? current : items[0]?.id ?? ""
      );
    }
  }, [items, pagination]);

  const loadPage = useCallback(
    async (reset = false) => {
      if (!pagination || loading) return;

      setLoading(true);
      setLoadError("");

      try {
        const params = new URLSearchParams({
          restaurantId: pagination.restaurantId,
          kind: pagination.kind,
        });
        if (!reset && cursor) params.set("cursor", cursor);

        const response = await fetch(
          `/api/restaurant/dashboard/explorer?${params.toString()}`,
          { cache: "no-store" }
        );
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Could not load dashboard items.");
        }

        const incoming = (data.items ?? []) as DashboardExplorerItem[];

        setLoadedItems((current) => {
          if (reset) return incoming;
          const seen = new Set(current.map((item) => item.id));
          return [...current, ...incoming.filter((item) => !seen.has(item.id))];
        });
        setCursor(data.nextCursor ?? null);
        setHasMore(Boolean(data.hasMore));
        setSelectedId((current) => {
          if (!reset && current) return current;
          return incoming[0]?.id ?? "";
        });
      } catch (error) {
        setLoadError(
          error instanceof Error ? error.message : "Could not load more items."
        );
      } finally {
        setLoading(false);
      }
    },
    [cursor, loading, pagination]
  );

  useEffect(() => {
    if (!open || !pagination) return;
    setCursor(null);
    setHasMore(true);
    void loadPage(true);
    // The first page should be refreshed each time the explorer opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, pagination?.restaurantId, pagination?.kind]);

  useEffect(() => {
    if (!open || !pagination || !hasMore || loading) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadPage(false);
      },
      { rootMargin: "160px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [open, pagination, hasMore, loading, loadPage]);

  const selected = useMemo(
    () =>
      loadedItems.find((item) => item.id === selectedId) ??
      loadedItems[0] ??
      null,
    [loadedItems, selectedId]
  );

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setSelectedId((current) => current || loadedItems[0]?.id || "");
          setOpen(true);
        }}
        className={triggerClassName ?? "text-[11px] font-semibold leading-none tracking-[-0.02em] text-black underline underline-offset-2"}
      >
        {triggerLabel}
      </button>

      {open ? (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/25 p-4 backdrop-blur-[1px] sm:p-8">
          <div className="relative h-[min(760px,90vh)] w-[min(1180px,94vw)] overflow-hidden rounded-[14px] border border-[#CFCFCF] bg-white shadow-2xl">
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="absolute right-5 top-5 z-20 grid h-8 w-8 place-items-center rounded-full border border-[#D8D8D8] bg-white text-black"
            >
              <X className="h-4 w-4" strokeWidth={2.2} />
            </button>

            <div className="grid h-full overflow-y-auto lg:grid-cols-[38%_62%] lg:overflow-hidden">
              <aside className="flex min-h-[520px] flex-col border-r border-[#D4D4D4] bg-[#F1F1F1] p-5 sm:p-6">
                <div className="flex items-baseline gap-2">
                  <h2 className="text-[16px] font-semibold tracking-[-0.025em] text-black">{title}</h2>
                  {typeof count === "number" ? (
                    <span className="text-[12px] font-medium text-[#8A8A8A]">{count.toLocaleString()}</span>
                  ) : null}
                </div>

                <div className="mt-5 min-h-0 flex-1 overflow-y-auto">
                  {loadedItems.length === 0 && !loading ? (
                    <EmptyState title={title} />
                  ) : (
                    <div className="divide-y divide-[#D8D8D8]">
                      {loadedItems.map((item) => {
                        const active = selected?.id === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setSelectedId(item.id)}
                            className={`flex w-full items-center gap-3 rounded-[10px] px-3 py-3 text-left transition-colors ${active ? "bg-white" : "hover:bg-white/60"}`}
                          >
                            {item.imageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={item.imageUrl} alt="" className="h-10 w-10 shrink-0 rounded-[8px] object-cover" />
                            ) : (
                              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[8px] bg-[#E4E4E4] text-[#737373]">
                                {title.toLowerCase().includes("staff") ? (
                                  <UserRound className="h-4 w-4" strokeWidth={2.2} />
                                ) : title.toLowerCase().includes("rider") ? (
                                  <Bike className="h-4 w-4" strokeWidth={2.2} />
                                ) : title.toLowerCase().includes("review") ? (
                                  <Star className="h-4 w-4" strokeWidth={2.2} />
                                ) : (
                                  <ShoppingBag className="h-4 w-4" strokeWidth={2.2} />
                                )}
                              </span>
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[11px] font-semibold text-black">{item.title}</p>
                              {item.subtitle ? (
                                <p className="mt-1 truncate text-[9px] font-medium text-[#808080]">{item.subtitle}</p>
                              ) : null}
                            </div>
                            <ChevronRight className="h-4 w-4 shrink-0 text-[#8A8A8A]" strokeWidth={2.2} />
                          </button>
                        );
                      })}
                      {pagination ? (
                        <div
                          ref={sentinelRef}
                          className="flex min-h-12 items-center justify-center px-3 py-3 text-[9px] font-medium text-[#888888]"
                        >
                          {loading
                            ? "Loading more…"
                            : loadError
                              ? (
                                <button
                                  type="button"
                                  onClick={() => void loadPage(false)}
                                  className="font-semibold text-black underline underline-offset-2"
                                >
                                  Try loading more
                                </button>
                              )
                              : hasMore
                                ? "Scroll for more"
                                : loadedItems.length
                                  ? "You’re all caught up"
                                  : null}
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              </aside>

              <section className="min-h-[520px] overflow-y-auto bg-white p-6 pr-16 sm:p-8 sm:pr-16">
                {!selected ? (
                  <EmptyState title={title} />
                ) : (
                  <div className="max-w-[720px]">
                    <div className="flex items-start gap-4">
                      {selected.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={selected.imageUrl} alt="" className="h-14 w-14 shrink-0 rounded-[10px] object-cover" />
                      ) : (
                        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-[10px] bg-[#F0F0F0] text-[#6F6F6F]">
                          {selected.statusTone === "red" ? (
                            <AlertTriangle className="h-5 w-5" strokeWidth={2.2} />
                          ) : selected.statusTone === "green" ? (
                            <PackageCheck className="h-5 w-5" strokeWidth={2.2} />
                          ) : (
                            <ShoppingBag className="h-5 w-5" strokeWidth={2.2} />
                          )}
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-[20px] font-semibold tracking-[-0.03em] text-black">{selected.title}</h3>
                          <Status value={selected.status} tone={selected.statusTone} />
                        </div>
                        {selected.subtitle ? (
                          <p className="mt-2 text-[11px] font-medium text-[#808080]">{selected.subtitle}</p>
                        ) : null}
                      </div>
                    </div>

                    {selected.body ? (
                      <p className="mt-6 max-w-[620px] text-[12px] leading-[1.55] text-[#555555]">
                        {selected.body}
                      </p>
                    ) : null}

                    {selected.details?.length ? (
                      <div className="mt-7 divide-y divide-[#EAEAEA] border-y border-[#EAEAEA]">
                        {selected.details.map((detail) => (
                          <div key={`${detail.label}-${detail.value}`} className="grid grid-cols-[140px_minmax(0,1fr)] gap-5 py-4">
                            <span className="text-[10px] font-medium text-[#8A8A8A]">{detail.label}</span>
                            <span className="text-[11px] font-semibold text-black">{detail.value}</span>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                )}
              </section>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
