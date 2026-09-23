"use client";

import { Check, LoaderCircle } from "lucide-react";
import { useFormStatus } from "react-dom";

export function RiderDeliveryCompleteButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-[62px] w-full items-center justify-center gap-2.5 rounded-[14px] bg-white text-[15px] font-semibold tracking-[-0.02em] text-black shadow-[0_12px_36px_rgba(255,255,255,0.08)] transition-[transform,opacity] duration-150 active:scale-[0.985] disabled:cursor-wait disabled:opacity-70 disabled:active:scale-100"
    >
      {pending ? (
        <>
          <LoaderCircle className="h-5 w-5 animate-spin" strokeWidth={2.3} />
          Completing…
        </>
      ) : (
        <>
          <Check className="h-5 w-5" strokeWidth={2.3} />
          Mark Delivery Complete
        </>
      )}
    </button>
  );
}
