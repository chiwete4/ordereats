"use client";

import { LoaderCircle } from "lucide-react";
import { useRef, useState } from "react";
import { useFormStatus } from "react-dom";

export function RiderDeliveryCompleteButton() {
  const { pending } = useFormStatus();
  const trackRef = useRef<HTMLDivElement | null>(null);
  const fillRef = useRef(0);
  const [fill, setFill] = useState(0);
  const [dragging, setDragging] = useState(false);

  function update(clientX: number) {
    const track = trackRef.current;
    if (!track) return 0;

    const bounds = track.getBoundingClientRect();
    const next = Math.max(0, Math.min(bounds.width, clientX - bounds.left));
    fillRef.current = next;
    setFill(next);
    return next;
  }

  function finish() {
    const width = trackRef.current?.clientWidth ?? 0;
    if (width > 0 && fillRef.current >= width * 0.82) {
      fillRef.current = width;
      setFill(width);
      window.setTimeout(() => trackRef.current?.closest("form")?.requestSubmit(), 90);
      return;
    }

    fillRef.current = 0;
    setFill(0);
  }

  const width = trackRef.current?.clientWidth ?? 0;
  const fillPercent = width > 0 ? Math.min(100, (fill / width) * 100) : 0;

  return (
    <div
      ref={trackRef}
      className="relative h-[66px] w-full select-none overflow-hidden rounded-[10px] bg-[#202020]"
    >
      <div
        aria-hidden="true"
        className={"absolute inset-y-0 left-0 bg-white " + (dragging ? "" : "transition-[width] duration-200 ease-out")}
        style={{ width: `${fill}px` }}
      />

      <div className="pointer-events-none absolute inset-0 grid place-items-center">
        {pending ? (
          <span className="inline-flex items-center gap-2 text-[15px] font-semibold text-black">
            <LoaderCircle className="h-4 w-4 animate-spin" />
            Completing…
          </span>
        ) : (
          <>
            <span className="rider-swipe-shimmer absolute inline-flex items-center gap-2 text-[15px] font-semibold tracking-[-0.02em]">
              <span>Swipe to complete</span>
              <span className="inline-flex items-center gap-[1px]" aria-hidden="true">
                <span className="rider-chevron rider-chevron-1">›</span>
                <span className="rider-chevron rider-chevron-2">›</span>
                <span className="rider-chevron rider-chevron-3">›</span>
              </span>
            </span>

            <span
              aria-hidden="true"
              className="absolute inline-flex items-center gap-2 text-[15px] font-semibold tracking-[-0.02em] text-black"
              style={{
                clipPath: `inset(0 ${Math.max(0, 100 - fillPercent)}% 0 0)`,
              }}
            >
              <span>Swipe to complete</span>
              <span className="inline-flex items-center gap-[1px]">
                <span>›</span><span>›</span><span>›</span>
              </span>
            </span>
          </>
        )}
      </div>

      <button
        type="button"
        disabled={pending}
        aria-label="Swipe to mark delivery complete"
        onPointerDown={(event) => {
          if (pending) return;
          setDragging(true);
          event.currentTarget.setPointerCapture(event.pointerId);
          update(event.clientX);
        }}
        onPointerMove={(event) => {
          if (!dragging || pending) return;
          update(event.clientX);
        }}
        onPointerUp={(event) => {
          if (!dragging || pending) return;
          update(event.clientX);
          setDragging(false);
          finish();
        }}
        onPointerCancel={() => {
          setDragging(false);
          fillRef.current = 0;
          setFill(0);
        }}
        className="absolute inset-0 z-10 touch-none cursor-ew-resize bg-transparent"
      />
    </div>
  );
}
