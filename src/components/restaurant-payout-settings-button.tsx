"use client";

import { useRef } from "react";
import { Landmark, X } from "lucide-react";

import { PaystackBankForm } from "@/components/paystack-bank-form";

export function RestaurantPayoutSettingsButton({
  restaurantId,
  bankName,
  bankCode,
  accountName,
  accountNumber,
  payoutVerified,
}: {
  restaurantId: string;
  bankName: string | null;
  bankCode: string | null;
  accountName: string | null;
  accountNumber: string | null;
  payoutVerified: boolean;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-full border-2 border-[#EAEAEA] px-2.5 py-1 text-[12px] font-semibold leading-none tracking-[-0.02em] text-black"
      >
        <Landmark className="h-3 w-3" strokeWidth={2.3} />
        Payout Account
      </button>

      <dialog
        ref={dialogRef}
        className="h-[min(650px,90vh)] w-[min(92vw,520px)] rounded-[16px] p-0 backdrop:bg-black/30"
      >
        <div className="flex h-full min-h-0 flex-col bg-white">
          <div className="flex items-start justify-between gap-4 border-b border-[#EAEAEA] px-6 py-5">
            <div>
              <h3 className="text-[24px] leading-none tracking-[-0.035em]">Payout Account</h3>
              <p className="mt-2 text-[11px] leading-[1.45] text-[#808080]">
                Manage the Paystack subaccount and settlement bank for this restaurant.
              </p>
            </div>
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="grid h-8 w-8 place-items-center rounded-full border border-[#EAEAEA]"
              aria-label="Close payout account settings"
            >
              <X className="h-4 w-4" strokeWidth={2.3} />
            </button>
          </div>

          <PaystackBankForm
            restaurantId={restaurantId}
            initialBankName={bankName}
            initialBankCode={bankCode}
            initialAccountName={accountName}
            initialAccountNumber={accountNumber}
            isVerified={payoutVerified}
            canRequestPayout={false}
            onSaved={() => dialogRef.current?.close()}
          />
        </div>
      </dialog>
    </>
  );
}
