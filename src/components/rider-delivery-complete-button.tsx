"use client";

import { Check, ChevronRight, LoaderCircle } from "lucide-react";
import { useRef, useState } from "react";
import { useFormStatus } from "react-dom";

export function RiderDeliveryCompleteButton() {
  const { pending } = useFormStatus();
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);

  function maxDrag() {
    const width = trackRef.current?.clientWidth ?? 0;
    return Math.max(0, width - 68);
  }

  function pointerX(event: React.PointerEvent<HTMLButtonElement>) {
    const bounds = trackRef.current?.getBoundingClientRect();
    if (!bounds) return 0;
    return Math.min(maxDrag(), Math.max(0, event.clientX - bounds.left - 30));
  }

  function finishSwipe() {
    const threshold = maxDrag() * 0.78;
    if (dragX >= threshold && trackRef.current) {
      setDragX(maxDrag());
      const form = trackRef.current.closest("form");
      window.setTimeout(() => form?.requestSubmit(), 120);
      return;
    }

    setDragX(0);
  }

  return (
    <div
      ref={trackRef}
      className="relative h-[68px] w-full overflow-hidden rounded-[12px] bg-[#202020] p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]"
    >
      <div
        aria-hidden="true"
        className="absolute inset-y-0 left-0 bg-white transition-[width] duration-75 ease-linear"
        style={{ width: `${Math.min(100, ((dragX + 62) / Math.max(1, (trackRef.current?.clientWidth ?? 1))) * 100)}%` }}
      />

      <div className="pointer-events-none absolute inset-0 grid place-items-center">
        {pending ? (
          <span className="inline-flex items-center gap-2 text-[15px] font-semibold text-white/70">
            <LoaderCircle className="h-4 w-4 animate-spin" />
            Completing…
          </span>
        ) : (
          <>
            <span className="rider-swipe-shimmer absolute text-[15px] font-semibold tracking-[-0.02em]">
              Swipe to complete
            </span>
            <span
              aria-hidden="true"
              className="absolute overflow-hidden text-[15px] font-semibold tracking-[-0.02em] text-black"
              style={{
                clipPath: `inset(0 ${Math.max(0, 100 - Math.min(100, ((dragX + 62) / Math.max(1, (trackRef.current?.clientWidth ?? 1))) * 100))}% 0 0)`,
              }}
            >
              Swipe to complete
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
        }}
        onPointerMove={(event) => {
          if (!dragging || pending) return;
          setDragX(pointerX(event));
        }}
        onPointerUp={(event) => {
          if (!dragging || pending) return;
          setDragX(pointerX(event));
          setDragging(false);
          window.requestAnimationFrame(finishSwipe);
        }}
        onPointerCancel={() => {
          setDragging(false);
          setDragX(0);
        }}
        style={{ transform: `translateX(${dragX}px)` }}
        className={
          "relative z-10 grid h-[58px] w-[58px] touch-none place-items-center rounded-[9px] bg-white text-black shadow-[0_6px_20px_rgba(0,0,0,0.28)] " +
          (dragging ? "" : "transition-transform duration-300 ease-out")
        }
      >
        {pending ? (
          <LoaderCircle className="h-5 w-5 animate-spin" strokeWidth={2.4} />
        ) : dragX >= maxDrag() * 0.78 && maxDrag() > 0 ? (
          <Check className="h-5 w-5" strokeWidth={2.6} />
        ) : (
          <ChevronRight className="h-5 w-5" strokeWidth={2.6} />
        )}
      </button>
    </div>
  );
}
