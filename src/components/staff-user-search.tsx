"use client";

import { useEffect, useRef, useState } from "react";

type UserResult = { id: string; email: string; firstName: string; lastName: string };

export function StaffUserSearch({ restaurantId }: { restaurantId: string }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserResult[]>([]);
  const [selected, setSelected] = useState<UserResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (selected || query.trim().length < 2) { setResults([]); setSearched(false); setLoading(false); return; }
    const timer = window.setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setLoading(true);
      try {
        const response = await fetch(`/api/users/search?restaurantId=${encodeURIComponent(restaurantId)}&q=${encodeURIComponent(query.trim())}`, { signal: controller.signal });
        const data = await response.json();
        if (!controller.signal.aborted) { setResults(data.users ?? []); setSearched(true); }
      } catch (error) {
        if ((error as Error).name !== "AbortError") { setResults([]); setSearched(true); }
      } finally { if (!controller.signal.aborted) setLoading(false); }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [query, restaurantId, selected]);

  return <div className="relative">
    <input type="hidden" name="userId" value={selected?.id ?? ""}/>
    <label className="text-sm font-medium">Find an OrderEats user
      <input value={query} onChange={(e) => { setQuery(e.target.value); setSelected(null); }} autoComplete="off" placeholder="Start typing their email or name…" className="mt-2 w-full rounded-lg border px-3 py-2"/>
    </label>
    {selected && <p className="mt-2 text-xs text-gray-600">Selected: <span className="font-medium text-black">{selected.firstName} {selected.lastName}</span> · {selected.email}</p>}
    {!selected && query.trim().length >= 2 && <div className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border bg-white shadow-lg">
      {loading ? <p className="px-3 py-2 text-sm text-gray-500">Searching…</p> : results.length > 0 ? results.map(user => <button key={user.id} type="button" onClick={() => { setSelected(user); setQuery(user.email); setResults([]); }} className="block w-full border-b px-3 py-2 text-left last:border-b-0 hover:bg-gray-50"><span className="block text-sm font-medium">{user.firstName} {user.lastName}</span><span className="block text-xs text-gray-500">{user.email}</span></button>) : searched ? <p className="px-3 py-2 text-sm text-gray-500">No matching OrderEats account. They need to create an account first.</p> : null}
    </div>}
  </div>;
}
