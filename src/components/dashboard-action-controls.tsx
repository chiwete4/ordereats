"use client";

import { useState } from "react";
import { AlertTriangle, MoreHorizontal, X } from "lucide-react";

import { cancelRestaurantOrder, assignRider } from "@/actions/orders";
import { toggleRestaurantStaffActive } from "@/actions/staff";

export function OrderMoreMenu({
  restaurantId,
  restaurantOrderId,
}: {
  restaurantId: string;
  restaurantOrderId: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="grid h-8 w-8 place-items-center rounded-[8px] bg-[#EAEAEA]"
        aria-label="Order options"
      >
        <MoreHorizontal className="h-4 w-4" strokeWidth={2.3} />
      </button>

      {open ? (
        <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/35 p-4">
          <div className="w-[min(420px,92vw)] rounded-[12px] border border-[#D5D5D5] bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <span className="grid h-10 w-10 place-items-center rounded-[10px] bg-red-50 text-red-600">
                <AlertTriangle className="h-5 w-5" strokeWidth={2.3} />
              </span>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close">
                <X className="h-4 w-4" strokeWidth={2.3} />
              </button>
            </div>
            <h3 className="mt-4 text-[14px] font-semibold tracking-[-0.02em]">Cancel this order?</h3>
            <p className="mt-2 text-[11px] leading-[1.5] text-[#777777]">
              This changes the restaurant order to Cancelled. Orders already sent out for delivery cannot be cancelled here.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setOpen(false)} className="h-9 rounded-[8px] border border-[#D8D8D8] text-[11px] font-semibold">
                Keep Order
              </button>
              <form action={cancelRestaurantOrder}>
                <input type="hidden" name="restaurantId" value={restaurantId} />
                <input type="hidden" name="restaurantOrderId" value={restaurantOrderId} />
                <button className="h-9 w-full rounded-[8px] bg-red-600 text-[11px] font-semibold text-white">
                  Cancel Order
                </button>
              </form>
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
  disabled = false,
}: {
  restaurantId: string;
  membershipId: string;
  name: string;
  isActive: boolean;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);

  if (disabled) {
    return <MoreHorizontal className="h-4 w-4 text-[#B0B0B0]" strokeWidth={2.3} />;
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label={`Options for ${name}`}>
        <MoreHorizontal className="h-4 w-4" strokeWidth={2.3} />
      </button>
      {open ? (
        <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/25 p-4">
          <div className="w-[min(400px,92vw)] rounded-[12px] border border-[#D5D5D5] bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-[14px] font-semibold">{name}</h3>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close">
                <X className="h-4 w-4" strokeWidth={2.3} />
              </button>
            </div>
            <p className="mt-2 text-[11px] text-[#777777]">
              {isActive
                ? "Deactivating removes this person's restaurant dashboard access until you reactivate them."
                : "Reactivating restores this person's restaurant dashboard access."}
            </p>
            <form action={toggleRestaurantStaffActive} className="mt-5">
              <input type="hidden" name="restaurantId" value={restaurantId} />
              <input type="hidden" name="membershipId" value={membershipId} />
              <button className={`h-9 w-full rounded-[8px] text-[11px] font-semibold text-white ${isActive ? "bg-red-600" : "bg-black"}`}>
                {isActive ? "Deactivate Access" : "Reactivate Access"}
              </button>
            </form>
          </div>
        </div>
      ) : null}
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
        + Assign
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
