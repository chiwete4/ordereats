"use client";

import { useState } from "react";
import { AlertTriangle, Bike, MoreHorizontal, Plus, UserRound, X } from "lucide-react";

import { cancelRestaurantOrder, assignRider } from "@/actions/orders";
import { changeRestaurantStaffRole, toggleRestaurantStaffActive } from "@/actions/staff";

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
  if (disabled || role === "OWNER") {
    return (
      <span className="grid h-7 w-7 place-items-center text-[#B0B0B0]" title="Owner role cannot be changed here">
        <MoreHorizontal className="h-4 w-4" strokeWidth={2.3} />
      </span>
    );
  }

  const nextRole = role === "RIDER" ? "STAFF" : "RIDER";

  return (
    <details className="relative">
      <summary
        className="grid h-7 w-7 cursor-pointer list-none place-items-center rounded-[7px] text-black transition-colors hover:bg-[#F0F0F0] [&::-webkit-details-marker]:hidden"
        aria-label={`Options for ${name}`}
      >
        <MoreHorizontal className="h-4 w-4" strokeWidth={2.3} />
      </summary>

      <div className="absolute right-0 top-[calc(100%+6px)] z-[70] w-[190px] overflow-hidden rounded-[10px] border border-[#D9D9D9] bg-white p-1.5 shadow-xl">
        <form action={changeRestaurantStaffRole}>
          <input type="hidden" name="restaurantId" value={restaurantId} />
          <input type="hidden" name="membershipId" value={membershipId} />
          <input type="hidden" name="nextRole" value={nextRole} />
          <button className="flex w-full items-center gap-2 rounded-[7px] px-2.5 py-2 text-left text-[10px] font-semibold text-black hover:bg-[#F4F4F4]">
            {nextRole === "RIDER" ? (
              <Bike className="h-3.5 w-3.5" strokeWidth={2.3} />
            ) : (
              <UserRound className="h-3.5 w-3.5" strokeWidth={2.3} />
            )}
            Switch to {nextRole === "RIDER" ? "Rider" : "Staff"}
          </button>
        </form>

        <div className="my-1 h-px bg-[#EAEAEA]" />

        <form action={toggleRestaurantStaffActive}>
          <input type="hidden" name="restaurantId" value={restaurantId} />
          <input type="hidden" name="membershipId" value={membershipId} />
          <button
            className={`w-full rounded-[7px] px-2.5 py-2 text-left text-[10px] font-semibold hover:bg-[#F4F4F4] ${isActive ? "text-red-600" : "text-black"}`}
          >
            {isActive ? "Deactivate access" : "Reactivate access"}
          </button>
        </form>
      </div>
    </details>
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
