"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { AlertTriangle, Bike, LoaderCircle, MoreHorizontal, Plus, UserRound, X } from "lucide-react";
import { useRouter } from "next/navigation";

import { cancelRestaurantOrder, assignReadyOrderToRider, assignRider } from "@/actions/orders";
import { changeRestaurantStaffRole, toggleRestaurantStaffActive } from "@/actions/staff";
import { useToast } from "@/components/toast-provider";

function ConfirmActionDialog({
  open,
  title,
  description,
  confirmLabel,
  pending = false,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  pending?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/30 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !pending) onCancel();
      }}
    >
      <div className="w-[min(420px,92vw)] rounded-[12px] border border-[#D8D8D8] bg-white p-5 shadow-2xl">
        <span className="grid h-10 w-10 place-items-center rounded-[10px] bg-red-50 text-red-600">
          <AlertTriangle className="h-5 w-5" strokeWidth={2.3} />
        </span>
        <h3 className="mt-4 text-[14px] font-semibold tracking-[-0.02em] text-black">{title}</h3>
        <p className="mt-2 text-[11px] leading-[1.5] text-[#777777]">{description}</p>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={onCancel}
            className="h-9 rounded-[8px] border border-[#D8D8D8] text-[11px] font-semibold text-black disabled:opacity-50"
          >
            Go back
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={onConfirm}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-[8px] bg-red-600 px-3 text-[11px] font-semibold text-white disabled:opacity-50"
          >
            {pending ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" strokeWidth={2.3} /> : null}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function OrderMoreMenu({
  restaurantId,
  restaurantOrderId,
  onOpenChange,
}: {
  restaurantId: string;
  restaurantOrderId: string;
  onOpenChange?: (open: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  const rootRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const toast = useToast();

  function changeOpen(next: boolean) {
    setOpen(next);
    onOpenChange?.(next);
  }

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) changeOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  function cancel() {
    const formData = new FormData();
    formData.set("restaurantId", restaurantId);
    formData.set("restaurantOrderId", restaurantOrderId);
    setConfirming(false);
    toast({ title: "Cancelling order…", tone: "info" });
    startTransition(async () => {
      try {
        await cancelRestaurantOrder(formData);
        toast({ title: "Order cancelled", tone: "success" });
        router.refresh();
      } catch (error) {
        toast({ title: "Couldn’t cancel order", description: error instanceof Error ? error.message : "Please try again.", tone: "error" });
      }
    });
  }

  return (
    <>
    <div ref={rootRef} className="relative z-[60] shrink-0">
      <button type="button" onClick={() => changeOpen(!open)} disabled={pending} className="grid h-8 w-8 place-items-center rounded-[8px] bg-[#EAEAEA] disabled:opacity-50" aria-label="Order options">
        {pending ? <LoaderCircle className="h-4 w-4 animate-spin" strokeWidth={2.3} /> : <MoreHorizontal className="h-4 w-4" strokeWidth={2.3} />}
      </button>
      {open ? (
        <div className="absolute right-0 top-[calc(100%+6px)] z-[90] w-[176px] rounded-[9px] border border-[#D9D9D9] bg-white p-1.5 shadow-xl">
          <button type="button" onClick={() => { changeOpen(false); setConfirming(true); }} className="flex w-full items-center gap-2 rounded-[7px] px-2.5 py-2 text-left text-[10px] font-semibold text-red-600 hover:bg-red-50">
            <AlertTriangle className="h-3.5 w-3.5" strokeWidth={2.3} />
            Cancel order
          </button>
        </div>
      ) : null}
    </div>
    <ConfirmActionDialog
      open={confirming}
      title="Cancel this order?"
      description="This will move the order to Cancelled. This action should only be used when you are sure the restaurant will not fulfil it."
      confirmLabel="Cancel Order"
      pending={pending}
      onCancel={() => setConfirming(false)}
      onConfirm={cancel}
    />
    </>
  );
}

export type OrderRider = {
  id: string;
  name: string;
  isActive: boolean;
  deliveringOrderNumber: string | null;
};

export function SendToRiderButton({
  restaurantId,
  restaurantOrderId,
  riders,
}: {
  restaurantId: string;
  restaurantOrderId: string;
  riders: OrderRider[];
}) {
  const [open, setOpen] = useState(false);
  const [pendingRiderId, setPendingRiderId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();
  const available = riders.filter((rider) => rider.isActive && !rider.deliveringOrderNumber);
  const delivering = riders.filter((rider) => rider.isActive && rider.deliveringOrderNumber);

  function assign(rider: OrderRider) {
    const formData = new FormData();
    formData.set("restaurantId", restaurantId);
    formData.set("restaurantOrderId", restaurantOrderId);
    formData.set("riderId", rider.id);
    setPendingRiderId(rider.id);
    setOpen(false);
    toast({ title: `Sending to ${rider.name}…`, tone: "info" });
    startTransition(async () => {
      try {
        await assignReadyOrderToRider(formData);
        toast({ title: "Rider assigned", description: `${rider.name} is now handling this delivery.`, tone: "success" });
        router.refresh();
      } catch (error) {
        toast({ title: "Couldn’t assign rider", description: error instanceof Error ? error.message : "Please try another rider.", tone: "error" });
      } finally {
        setPendingRiderId(null);
      }
    });
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} disabled={pending} className="inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-[8px] bg-black text-[10px] font-semibold text-white disabled:opacity-50">
        {pending ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" strokeWidth={2.3} /> : <Bike className="h-3.5 w-3.5" strokeWidth={2.3} />}
        {pending ? "Assigning…" : "Send to Rider"}
      </button>
      {open ? (
        <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/25 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
          <div className="w-[min(430px,92vw)] max-h-[78vh] overflow-y-auto rounded-[12px] border border-[#D5D5D5] bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-[14px] font-semibold tracking-[-0.02em]">Choose a rider</h3>
                <p className="mt-1 text-[10px] text-[#808080]">Available riders are shown first.</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close"><X className="h-4 w-4" strokeWidth={2.3} /></button>
            </div>
            <div className="mt-5">
              <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.06em] text-[#888]">Available · {available.length}</p>
              <div className="divide-y divide-[#EAEAEA]">
                {available.length ? available.map((rider) => (
                  <button key={rider.id} type="button" onClick={() => assign(rider)} disabled={Boolean(pendingRiderId)} className="flex w-full items-center gap-3 py-3 text-left disabled:opacity-40">
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-[#F0F0F0]"><Bike className="h-4 w-4" strokeWidth={2.3} /></span>
                    <span className="min-w-0 flex-1"><span className="block truncate text-[11px] font-semibold">{rider.name}</span><span className="mt-1 block text-[9px] font-medium text-green-600">Available to deliver</span></span>
                    <span className="rounded-full bg-black px-3 py-1.5 text-[9px] font-semibold text-white">Choose</span>
                  </button>
                )) : <p className="py-3 text-[10px] text-[#888]">No riders are available right now.</p>}
              </div>
            </div>
            <div className="mt-5 border-t border-[#EAEAEA] pt-4">
              <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.06em] text-[#888]">Out delivering · {delivering.length}</p>
              <div className="divide-y divide-[#EAEAEA]">
                {delivering.length ? delivering.map((rider) => (
                  <div key={rider.id} className="flex items-center gap-3 py-3 opacity-55">
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-[#F0F0F0]"><Bike className="h-4 w-4" strokeWidth={2.3} /></span>
                    <span className="min-w-0 flex-1"><span className="block truncate text-[11px] font-semibold">{rider.name}</span><span className="mt-1 block truncate text-[9px] text-[#777]">Delivering #{rider.deliveringOrderNumber}</span></span>
                  </div>
                )) : <p className="py-3 text-[10px] text-[#888]">No riders are currently out delivering.</p>}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

export function StaffMoreMenu({
  restaurantId,
  membershipId,
  name,
  isActive,
  role,
  disabled = false,
}: {
  restaurantId: string;
  membershipId: string;
  name: string;
  isActive: boolean;
  role: "OWNER" | "STAFF" | "RIDER";
  disabled?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [confirmingDeactivate, setConfirmingDeactivate] = useState(false);

  if (disabled || role === "OWNER") {
    return (
      <span className="grid h-7 w-7 place-items-center text-[#B0B0B0]" title="Owner role cannot be changed here">
        <MoreHorizontal className="h-4 w-4" strokeWidth={2.3} />
      </span>
    );
  }

  const nextRole = role === "RIDER" ? "STAFF" : "RIDER";

  function run(action: (formData: FormData) => Promise<void>, extra?: Record<string, string>) {
    const formData = new FormData();
    formData.set("restaurantId", restaurantId);
    formData.set("membershipId", membershipId);
    Object.entries(extra ?? {}).forEach(([key, value]) => formData.set(key, value));

    setError("");
    startTransition(async () => {
      try {
        await action(formData);
        router.refresh();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "That change could not be completed.");
      }
    });
  }

  return (
    <>
    <details className="relative">
      <summary
        className="grid h-7 w-7 cursor-pointer list-none place-items-center rounded-[7px] text-black transition-colors hover:bg-[#F0F0F0] [&::-webkit-details-marker]:hidden"
        aria-label={`Options for ${name}`}
      >
        <MoreHorizontal className="h-4 w-4" strokeWidth={2.3} />
      </summary>

      <div className="absolute right-0 top-[calc(100%+6px)] z-[70] w-[205px] overflow-hidden rounded-[10px] border border-[#D9D9D9] bg-white p-1.5 shadow-xl">
        <button
          type="button"
          disabled={pending}
          onClick={() => run(changeRestaurantStaffRole, { nextRole })}
          className="flex w-full items-center gap-2 rounded-[7px] px-2.5 py-2 text-left text-[10px] font-semibold text-black hover:bg-[#F4F4F4] disabled:opacity-40"
        >
          {nextRole === "RIDER" ? (
            <Bike className="h-3.5 w-3.5" strokeWidth={2.3} />
          ) : (
            <UserRound className="h-3.5 w-3.5" strokeWidth={2.3} />
          )}
          Switch to {nextRole === "RIDER" ? "Rider" : "Staff"}
        </button>

        <div className="my-1 h-px bg-[#EAEAEA]" />

        <button
          type="button"
          disabled={pending}
          onClick={() => isActive ? setConfirmingDeactivate(true) : run(toggleRestaurantStaffActive)}
          className={`w-full rounded-[7px] px-2.5 py-2 text-left text-[10px] font-semibold hover:bg-[#F4F4F4] disabled:opacity-40 ${isActive ? "text-red-600" : "text-black"}`}
        >
          {isActive ? "Deactivate access" : "Reactivate access"}
        </button>

        {error ? (
          <p className="mx-1 mt-1 rounded-[7px] bg-red-50 px-2 py-1.5 text-[9px] leading-[1.35] text-red-600">
            {error}
          </p>
        ) : null}
      </div>
    </details>
    <ConfirmActionDialog
      open={confirmingDeactivate}
      title={`Deactivate ${name}?`}
      description="They will lose active access to this restaurant until you reactivate them."
      confirmLabel="Deactivate"
      pending={pending}
      onCancel={() => setConfirmingDeactivate(false)}
      onConfirm={() => {
        setConfirmingDeactivate(false);
        run(toggleRestaurantStaffActive);
      }}
    />
    </>
  );
}

export type AssignableOrder = {
  id: string;
  orderNumber: string;
  total: string;
};

export function RiderAssignButton({
  restaurantId,
  riderId,
  riderName,
  orders,
}: {
  restaurantId: string;
  riderId: string;
  riderName: string;
  orders: AssignableOrder[];
}) {
  const [open, setOpen] = useState(false);

  if (orders.length === 0) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full bg-black px-3 py-1.5 text-[9px] font-semibold text-white"
      >
        <Plus className="mr-1 inline h-3 w-3" strokeWidth={2.3} />
        Assign
      </button>
      {open ? (
        <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/25 p-4">
          <div className="w-[min(440px,92vw)] rounded-[12px] border border-[#D5D5D5] bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-[14px] font-semibold">Assign {riderName}</h3>
                <p className="mt-1 text-[10px] text-[#808080]">Choose the order this rider should take.</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close">
                <X className="h-4 w-4" strokeWidth={2.3} />
              </button>
            </div>
            <div className="mt-4 divide-y divide-[#EAEAEA]">
              {orders.map((order) => (
                <form key={order.id} action={assignRider} className="flex items-center gap-3 py-3 first:pt-0">
                  <input type="hidden" name="restaurantId" value={restaurantId} />
                  <input type="hidden" name="restaurantOrderId" value={order.id} />
                  <input type="hidden" name="riderId" value={riderId} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold">#{order.orderNumber}</p>
                    <p className="mt-1 text-[9px] text-[#808080]">{order.total}</p>
                  </div>
                  <button className="rounded-full bg-black px-3 py-1.5 text-[9px] font-semibold text-white">
                    Assign
                  </button>
                </form>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
