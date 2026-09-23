"use client";

import { Check, LoaderCircle } from "lucide-react";
import { useFormStatus } from "react-dom";

export function RiderDeliveryCompleteButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-[10px] bg-black text-[12px] font-semibold text-white transition-[transform,opacity] duration-150 active:scale-[0.985] disabled:cursor-wait disabled:opacity-70 disabled:active:scale-100"
    >
      {pending ? (
        <>
          <LoaderCircle className="h-4 w-4 animate-spin" strokeWidth={2.3} />
          Completing…
        </>
      ) : (
        <>
          <Check className="h-4 w-4" strokeWidth={2.3} />
          Mark Delivery Complete
        </>
      )}
    </button>
  );
}
