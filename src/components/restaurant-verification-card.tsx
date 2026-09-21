"use client";

import { useRef } from "react";
import { AlertTriangle, ArrowRight, Check, Navigation, PencilLine, Store, X } from "lucide-react";

import { saveRestaurantBankInfo } from "@/actions/verification";
import { RestaurantImageUpload } from "@/components/restaurant-image-upload";
import { updateRestaurant } from "@/actions/restaurant";

type VerificationStep = {
  label: string;
  complete: boolean;
};

export function RestaurantVerificationCard({
  restaurantId,
  restaurantName,
  imageUrl,
  description,
  phoneNumber,
  address,
  bankName,
  accountName,
  accountNumber,
  openingTime,
  closingTime,
  operatingDays,
  timezone,
  steps,
}: {
  restaurantId: string;
  restaurantName: string;
  imageUrl: string | null;
  description: string | null;
  phoneNumber: string | null;
  address: string | null;
  bankName: string | null;
  accountName: string | null;
  accountNumber: string | null;
  openingTime: string;
  closingTime: string;
  operatingDays: number[];
  timezone: string;
  steps: VerificationStep[];
}) {
  const bankDialogRef = useRef<HTMLDialogElement>(null);
  const detailsDialogRef = useRef<HTMLDialogElement>(null);
  const completedCount = steps.filter((step) => step.complete).length;
  const nextIncomplete = steps.find((step) => !step.complete);
  const allComplete = completedCount === steps.length;

  const helperText = allComplete
    ? "Your restaurant setup is complete and ready for Paperbag."
    : nextIncomplete?.label === "Restaurant Details"
      ? "Your restaurant details are incomplete. Add the missing information so customers know where to find you."
      : nextIncomplete?.label === "Add at least 1 Rider"
        ? "Your restaurant still needs a rider. Add at least one rider so deliveries can be assigned."
        : nextIncomplete?.label === "Create your menu"
          ? "Your menu needs at least 5 items before your restaurant setup is complete."
          : "Your restaurant is missing its payment information, add it so you can start taking orders on Paperbag.";

  return (
    <>
      <section className="flex min-h-[346px] w-full flex-col rounded-[14px] bg-[#FFF3C4] px-6 py-5 sm:px-8 sm:py-6">
        <div className="flex flex-1 flex-col gap-5">
          <div className="inline-flex items-center gap-1.5 text-[14px] font-semibold leading-none tracking-[-0.02em] text-black">
            <AlertTriangle className="h-4 w-4" strokeWidth={2.3} />
            {allComplete ? "Verification Complete" : "Complete your Verification"}
          </div>

          <div className="relative grid h-[56px] w-[56px] shrink-0 place-items-center overflow-visible rounded-[8px] bg-white/70">
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageUrl} alt={restaurantName} className="h-full w-full rounded-[8px] object-cover" />
            ) : (
              <Store className="h-5 w-5 text-black" strokeWidth={2.3} />
            )}
            <span className="absolute bottom-[-2px] right-[-2px] grid h-5 w-5 place-items-center rounded-full border-[3px] border-[#FFF3C4] bg-black">
              <PencilLine className="h-2.5 w-2.5 fill-white text-white" strokeWidth={2.3} />
            </span>
          </div>

          <div className="flex min-w-0 items-center justify-between gap-4">
            <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5">
              <h2 className="truncate text-[26px] font-normal leading-none tracking-[-0.035em] text-black">
                {restaurantName}
              </h2>
              {address ? (
                <span className="inline-flex min-w-0 items-center gap-1 text-[12px] font-medium leading-none tracking-[-0.01em] text-[#808080]">
                  <Navigation className="h-3.5 w-3.5 shrink-0 fill-current" strokeWidth={2.3} />
                  <span className="truncate">{address}</span>
                </span>
              ) : null}
            </div>

            <button
              type="button"
              onClick={() => detailsDialogRef.current?.showModal()}
              className="shrink-0 text-[14px] font-semibold leading-none tracking-[-0.02em] text-black underline decoration-[1.5px] underline-offset-2"
            >
              Edit Restaurant
            </button>
          </div>

          <p className="max-w-[560px] text-[15px] font-medium leading-[1.25] tracking-[-0.01em] text-[#808080]">
            {helperText}
          </p>

          <div>
            <div className="grid grid-cols-4 gap-3">
              {steps.map((step, index) => (
                <div
                  key={step.label}
                  className={`h-2 rounded-full ${step.complete ? "bg-black" : index === completedCount ? "bg-black/20" : "bg-black/15"}`}
                />
              ))}
            </div>

            <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 sm:grid-cols-4">
              {steps.map((step) => (
                <div
                  key={step.label}
                  className={`flex items-center justify-center gap-1.5 text-center text-[10px] font-medium leading-none tracking-[-0.01em] ${step.complete ? "text-[#808080]" : "text-black"}`}
                >
                  {step.complete ? (
                    <Check className="h-3.5 w-3.5 shrink-0" strokeWidth={2.3} />
                  ) : (
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" strokeWidth={2.3} />
                  )}
                  <span className="whitespace-nowrap">{step.label}</span>
                </div>
              ))}
            </div>
          </div>

          {!allComplete ? (
            <button
              type="button"
              onClick={() => {
                if (nextIncomplete?.label === "Restaurant Details") {
                  detailsDialogRef.current?.showModal();
                  return;
                }
                if (nextIncomplete?.label === "Add your Bank Info") {
                  bankDialogRef.current?.showModal();
                }
              }}
              className="flex h-[34px] w-full items-center justify-center rounded-[10px] bg-[#FFE27A] px-4 text-[14px] font-semibold leading-none tracking-[-0.02em] text-black"
            >
              <span>
                {nextIncomplete?.label === "Add your Bank Info"
                  ? "Add your Bank Info"
                  : nextIncomplete?.label}
              </span>
              <ArrowRight className="ml-1.5 h-4 w-4" strokeWidth={2.3} />
            </button>
          ) : (
            <div className="h-[34px]" />
          )}
        </div>
      </section>

      <dialog ref={detailsDialogRef} className="w-[min(92vw,520px)] rounded-[16px] p-0 backdrop:bg-black/30">
        <form action={updateRestaurant} className="p-6">
          <input type="hidden" name="restaurantId" value={restaurantId} />
          <div className="flex items-center justify-between">
            <h3 className="text-[24px] leading-none tracking-[-0.035em]">Edit Restaurant</h3>
            <button type="button" onClick={() => detailsDialogRef.current?.close()} aria-label="Close" className="grid h-8 w-8 place-items-center rounded-full border border-[#EAEAEA]">
              <X className="h-4 w-4" strokeWidth={2.3} />
            </button>
          </div>
          <div className="mt-6 grid gap-4">
            <RestaurantImageUpload defaultValue={imageUrl} />
            <label className="text-[12px] font-semibold tracking-[-0.02em]">Restaurant name<input name="name" defaultValue={restaurantName} required className="mt-2 w-full rounded-[10px] border-2 border-[#EAEAEA] px-3 py-2.5 text-[14px] font-normal outline-none focus:border-black" /></label>
            <label className="text-[12px] font-semibold tracking-[-0.02em]">Description<textarea name="description" defaultValue={description ?? ""} rows={3} className="mt-2 w-full rounded-[10px] border-2 border-[#EAEAEA] px-3 py-2.5 text-[14px] font-normal outline-none focus:border-black" /></label>
            <label className="text-[12px] font-semibold tracking-[-0.02em]">Phone number<input name="phoneNumber" defaultValue={phoneNumber ?? ""} className="mt-2 w-full rounded-[10px] border-2 border-[#EAEAEA] px-3 py-2.5 text-[14px] font-normal outline-none focus:border-black" /></label>
            <label className="text-[12px] font-semibold tracking-[-0.02em]">Campus location<input name="address" defaultValue={address ?? ""} className="mt-2 w-full rounded-[10px] border-2 border-[#EAEAEA] px-3 py-2.5 text-[14px] font-normal outline-none focus:border-black" /></label>

            <div className="grid grid-cols-2 gap-3">
              <label className="text-[12px] font-semibold tracking-[-0.02em]">
                Opens
                <input name="openingTime" type="time" defaultValue={openingTime} required className="mt-2 w-full rounded-[10px] border-2 border-[#EAEAEA] px-3 py-2.5 text-[14px] font-normal outline-none focus:border-black" />
              </label>
              <label className="text-[12px] font-semibold tracking-[-0.02em]">
                Closes
                <input name="closingTime" type="time" defaultValue={closingTime} required className="mt-2 w-full rounded-[10px] border-2 border-[#EAEAEA] px-3 py-2.5 text-[14px] font-normal outline-none focus:border-black" />
              </label>
            </div>

            <fieldset>
              <legend className="text-[12px] font-semibold tracking-[-0.02em]">Operating days</legend>
              <div className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-7">
                {[
                  { value: 1, label: "Mon" },
                  { value: 2, label: "Tue" },
                  { value: 3, label: "Wed" },
                  { value: 4, label: "Thu" },
                  { value: 5, label: "Fri" },
                  { value: 6, label: "Sat" },
                  { value: 0, label: "Sun" },
                ].map((day) => (
                  <label key={day.value} className="cursor-pointer">
                    <input
                      type="checkbox"
                      name="operatingDays"
                      value={day.value}
                      defaultChecked={operatingDays.includes(day.value)}
                      className="peer sr-only"
                    />
                    <span className="flex h-9 items-center justify-center rounded-[10px] border-2 border-[#EAEAEA] text-[11px] font-medium tracking-[-0.01em] peer-checked:border-black peer-checked:bg-black peer-checked:text-white">
                      {day.label}
                    </span>
                  </label>
                ))}
              </div>
              <input type="hidden" name="timezone" value={timezone} />
            </fieldset>
          </div>
          <button className="mt-6 h-10 w-full rounded-[10px] bg-black text-[14px] font-semibold text-white">Save Restaurant</button>
        </form>
      </dialog>

      <dialog ref={bankDialogRef} className="w-[min(92vw,520px)] rounded-[16px] p-0 backdrop:bg-black/30">
        <form action={saveRestaurantBankInfo} className="p-6">
          <input type="hidden" name="restaurantId" value={restaurantId} />
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-[24px] leading-none tracking-[-0.035em]">Bank Information</h3>
              <p className="mt-2 text-[12px] font-medium tracking-[-0.01em] text-[#808080]">Add the account Paperbag should use for restaurant payouts.</p>
            </div>
            <button type="button" onClick={() => bankDialogRef.current?.close()} aria-label="Close" className="grid h-8 w-8 place-items-center rounded-full border border-[#EAEAEA]">
              <X className="h-4 w-4" strokeWidth={2.3} />
            </button>
          </div>
          <div className="mt-6 grid gap-4">
            <label className="text-[12px] font-semibold tracking-[-0.02em]">Bank name<input name="bankName" defaultValue={bankName ?? ""} required className="mt-2 w-full rounded-[10px] border-2 border-[#EAEAEA] px-3 py-2.5 text-[14px] font-normal outline-none focus:border-black" /></label>
            <label className="text-[12px] font-semibold tracking-[-0.02em]">Account name<input name="accountName" defaultValue={accountName ?? ""} required className="mt-2 w-full rounded-[10px] border-2 border-[#EAEAEA] px-3 py-2.5 text-[14px] font-normal outline-none focus:border-black" /></label>
            <label className="text-[12px] font-semibold tracking-[-0.02em]">Account number<input name="accountNumber" defaultValue={accountNumber ?? ""} required inputMode="numeric" pattern="\d{10}" maxLength={10} className="mt-2 w-full rounded-[10px] border-2 border-[#EAEAEA] px-3 py-2.5 text-[14px] font-normal outline-none focus:border-black" /></label>
          </div>
          <button className="mt-6 h-10 w-full rounded-[10px] bg-black text-[14px] font-semibold text-white">Save Bank Information</button>
        </form>
      </dialog>
    </>
  );
}
