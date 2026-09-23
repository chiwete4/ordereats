"use client";

import { Check, LoaderCircle } from "lucide-react";
import { useRef, useState } from "react";
import { useFormStatus } from "react-dom";

export function RiderDeliveryCompleteButton() {
  const { pending } = useFormStatus();
  const trackRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef(0);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);

  function geometry() {
    const width = trackRef.current?.clientWidth ?? 0;
    const thumb = 58;
    const inset = 4;
    return {
      width,
      thumb,
      inset,
      maxDrag: Math.max(0, width - thumb - inset * 2),
    };
  }

  function updateFromPointer(clientX: number) {
    const track = trackRef.current;
    if (!track) return 0;

    const bounds = track.getBoundingClientRect();
    const { maxDrag, thumb, inset } = geometry();
    const next = Math.min(
      maxDrag,
      Math.max(0, clientX - bounds.left - inset - thumb / 2)
    );

    dragRef.current = next;
    setDragX(next);
    return next;
  }

  function reset() {
    dragRef.current = 0;
    setDragX(0);
  }

  function finish() {
    const { maxDrag } = geometry();
    if (maxDrag > 0 && dragRef.current >= maxDrag * 0.78) {
      dragRef.current = maxDrag;
      setDragX(maxDrag);
      window.setTimeout(() => trackRef.current?.closest("form")?.requestSubmit(), 100);
      return;
    }

    reset();
  }

  const { width, thumb, inset } = geometry();
  const fillWidth =
    width > 0 ? Math.min(width, dragX + thumb + inset * 2) : thumb + inset * 2;
  const fillPercent = width > 0 ? (fillWidth / width) * 100 : 0;

  return (
    <div
      ref={trackRef}
      className="relative h-[66px] w-full overflow-hidden rounded-[10px] bg-[#202020] p-1"
    >
      <div
        aria-hidden="true"
        className="absolute inset-y-0 left-0 bg-white"
        style={{ width: `${fillWidth}px` }}
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
          updateFromPointer(event.clientX);
        }}
        onPointerMove={(event) => {
          if (!dragging || pending) return;
          updateFromPointer(event.clientX);
        }}
        onPointerUp={(event) => {
          if (!dragging || pending) return;
          updateFromPointer(event.clientX);
          setDragging(false);
          finish();
        }}
        onPointerCancel={() => {
          setDragging(false);
          reset();
        }}
        style={{ transform: `translateX(${dragX}px)` }}
        className={
          "relative z-10 grid h-[58px] w-[58px] touch-none place-items-center rounded-[8px] bg-white text-black " +
          (dragging ? "" : "transition-transform duration-200 ease-out")
        }
      >
        {pending ? (
          <LoaderCircle className="h-5 w-5 animate-spin" strokeWidth={2.4} />
        ) : dragX >= geometry().maxDrag * 0.78 && geometry().maxDrag > 0 ? (
          <Check className="h-5 w-5" strokeWidth={2.6} />
        ) : null}
      </button>
    </div>
  );
}
