"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { BadgeCheck, LoaderCircle, Send } from "lucide-react";
import { useRouter } from "next/navigation";

import { requestRestaurantPayout, retryRestaurantPayout } from "@/actions/payouts";
import { saveRestaurantBankInfo } from "@/actions/verification";

type Bank = {
  id: number;
  name: string;
  code: string;
};

type PayoutSummary = {
  availableAmount: number;
  eligibleOrderCount: number;
  latestPayout: null | {
    id: string;
    amount: number;
    status: string;
    reference: string;
    createdAt: string;
    failureReason: string | null;
  };
};

const moneyFormatter = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
});

export function PaystackBankForm({
  restaurantId,
  initialBankName,
  initialBankCode,
  initialAccountName,
  initialAccountNumber,
  isVerified,
  canRequestPayout,
  onSaved,
}: {
  restaurantId: string;
  initialBankName: string | null;
  initialBankCode: string | null;
  initialAccountName: string | null;
  initialAccountNumber: string | null;
  isVerified: boolean;
  canRequestPayout: boolean;
  onSaved: () => void;
}) {
  const router = useRouter();
  const [banks, setBanks] = useState<Bank[]>([]);
  const [bankCode, setBankCode] = useState(initialBankCode ?? "");
  const [accountNumber, setAccountNumber] = useState(initialAccountNumber ?? "");
  const [accountName, setAccountName] = useState(initialAccountName ?? "");
  const [verifiedKey, setVerifiedKey] = useState(
    isVerified && initialBankCode && initialAccountNumber
      ? `${initialBankCode}:${initialAccountNumber}`
      : ""
  );
  const [loadingBanks, setLoadingBanks] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");
  const [payoutSummary, setPayoutSummary] = useState<PayoutSummary | null>(null);
  const [payoutMessage, setPayoutMessage] = useState("");
  const [confirmPayout, setConfirmPayout] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let active = true;

    fetch("/api/paystack/banks", { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Could not load banks.");
        return payload.banks as Bank[];
      })
      .then((nextBanks) => {
        if (!active) return;
        setBanks(nextBanks);
        if (!initialBankCode && initialBankName) {
          const match = nextBanks.find(
            (bank) => bank.name.toLowerCase() === initialBankName.toLowerCase()
          );
          if (match) setBankCode(match.code);
        }
      })
      .catch((caught) => {
        if (active) {
          setError(caught instanceof Error ? caught.message : "Could not load banks.");
        }
      })
      .finally(() => {
        if (active) setLoadingBanks(false);
      });

    return () => {
      active = false;
    };
  }, [initialBankCode, initialBankName]);

  async function refreshPayoutSummary() {
    if (!canRequestPayout) return;

    try {
      const response = await fetch(
        `/api/restaurant/payout/summary?restaurantId=${encodeURIComponent(restaurantId)}`,
        { cache: "no-store" }
      );
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not load payout balance.");
      setPayoutSummary(payload as PayoutSummary);
    } catch (caught) {
      setPayoutMessage(
        caught instanceof Error ? caught.message : "Could not load payout balance."
      );
    }
  }

  useEffect(() => {
    if (isVerified && canRequestPayout) {
      void refreshPayoutSummary();
    }
    // Refresh once when the saved payout account changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVerified, canRequestPayout, restaurantId]);

  const selectedBank = useMemo(
    () => banks.find((bank) => bank.code === bankCode) ?? null,
    [bankCode, banks]
  );
  const currentKey = bankCode && accountNumber ? `${bankCode}:${accountNumber}` : "";
  const verified = currentKey !== "" && currentKey === verifiedKey && Boolean(accountName);
  const savedAccountSelected =
    isVerified &&
    Boolean(initialBankCode) &&
    Boolean(initialAccountNumber) &&
    currentKey === `${initialBankCode}:${initialAccountNumber}`;

  async function verifyAccount() {
    if (!bankCode || !/^\d{10}$/.test(accountNumber)) {
      setError("Choose a bank and enter a valid 10-digit account number.");
      return;
    }

    setVerifying(true);
    setError("");

    try {
      const response = await fetch("/api/paystack/resolve-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurantId,
          bankCode,
          accountNumber,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Paystack could not verify that account.");
      }

      setAccountName(payload.accountName);
      setVerifiedKey(currentKey);
    } catch (caught) {
      setAccountName("");
      setVerifiedKey("");
      setError(
        caught instanceof Error
          ? caught.message
          : "Paystack could not verify that account."
      );
    } finally {
      setVerifying(false);
    }
  }

  function save() {
    if (!verified || !selectedBank) {
      setError("Verify the bank account with Paystack before saving it.");
      return;
    }

    const formData = new FormData();
    formData.set("restaurantId", restaurantId);
    formData.set("bankCode", bankCode);
    formData.set("bankName", selectedBank.name);
    formData.set("accountNumber", accountNumber);

    setError("");
    startTransition(async () => {
      try {
        const result = await saveRestaurantBankInfo(formData);
        setAccountName(result.accountName);
        router.refresh();
        onSaved();
      } catch (caught) {
        setError(
          caught instanceof Error
            ? caught.message
            : "Paperbag could not save this payout account."
        );
      }
    });
  }

  function sendPayout() {
    const formData = new FormData();
    formData.set("restaurantId", restaurantId);

    setPayoutMessage("");
    startTransition(async () => {
      try {
        const result = await requestRestaurantPayout(formData);
        setConfirmPayout(false);
        setPayoutMessage(
          result.requiresOtp
            ? "Paystack created the transfer, but your Paystack account still requires transfer OTP confirmation."
            : result.status === "SUCCESS"
              ? "Payout completed successfully."
              : "Payout queued with Paystack. Its final status will update from the Paystack webhook."
        );
        await refreshPayoutSummary();
        router.refresh();
      } catch (caught) {
        setPayoutMessage(
          caught instanceof Error ? caught.message : "The payout could not be started."
        );
      }
    });
  }

  function reconcileLatestPayout() {
    if (!payoutSummary?.latestPayout) return;

    const formData = new FormData();
    formData.set("restaurantId", restaurantId);
    formData.set("payoutId", payoutSummary.latestPayout.id);

    setPayoutMessage("");
    startTransition(async () => {
      try {
        const result = await retryRestaurantPayout(formData);
        setPayoutMessage(
          result.requiresOtp
            ? "This payout is waiting for Paystack transfer OTP confirmation."
            : result.status === "SUCCESS"
              ? "Payout confirmed successful."
              : `Payout status: ${result.status}.`
        );
        await refreshPayoutSummary();
        router.refresh();
      } catch (caught) {
        setPayoutMessage(
          caught instanceof Error ? caught.message : "Could not reconcile this payout."
        );
      }
    });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-5">
        <div className="grid gap-4">
          <label className="text-[12px] font-semibold tracking-[-0.02em]">
            Bank
            <select
              value={bankCode}
              disabled={loadingBanks}
              onChange={(event) => {
                setBankCode(event.target.value);
                setVerifiedKey("");
                setAccountName("");
              }}
              className="mt-2 w-full rounded-[10px] border-2 border-[#EAEAEA] bg-white px-3 py-2.5 text-[14px] font-normal outline-none focus:border-black disabled:opacity-50"
            >
              <option value="">
                {loadingBanks ? "Loading Paystack banks..." : "Choose a bank"}
              </option>
              {banks.map((bank) => (
                <option key={bank.id} value={bank.code}>
                  {bank.name}
                </option>
              ))}
            </select>
          </label>

          <label className="text-[12px] font-semibold tracking-[-0.02em]">
            Account number
            <input
              value={accountNumber}
              onChange={(event) => {
                const digits = event.target.value.replace(/\D/g, "").slice(0, 10);
                setAccountNumber(digits);
                setVerifiedKey("");
                setAccountName("");
              }}
              inputMode="numeric"
              maxLength={10}
              placeholder="0123456789"
              className="mt-2 w-full rounded-[10px] border-2 border-[#EAEAEA] px-3 py-2.5 text-[14px] font-normal outline-none focus:border-black"
            />
          </label>

          <button
            type="button"
            onClick={verifyAccount}
            disabled={verifying || loadingBanks || !bankCode || accountNumber.length !== 10}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-[10px] border-2 border-[#EAEAEA] text-[12px] font-semibold text-black disabled:cursor-not-allowed disabled:opacity-40"
          >
            {verifying ? (
              <LoaderCircle className="h-4 w-4 animate-spin" strokeWidth={2.3} />
            ) : (
              <BadgeCheck className="h-4 w-4" strokeWidth={2.3} />
            )}
            {verifying ? "Checking with Paystack..." : "Verify account"}
          </button>

          <div className="rounded-[10px] border-2 border-[#EAEAEA] px-3 py-3">
            <p className="text-[10px] font-medium text-[#808080]">Account name</p>
            <p className={`mt-1 text-[13px] font-semibold ${verified ? "text-black" : "text-[#A0A0A0]"}`}>
              {accountName || "Verify the account to confirm its registered name"}
            </p>
            {verified ? (
              <p className="mt-2 inline-flex items-center gap-1.5 text-[10px] font-semibold text-green-600">
                <BadgeCheck className="h-3.5 w-3.5" strokeWidth={2.3} />
                Verified by Paystack
              </p>
            ) : null}
          </div>

          {savedAccountSelected && canRequestPayout && payoutSummary ? (
            <div className="rounded-[10px] border-2 border-[#EAEAEA] p-3">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-[10px] font-medium text-[#808080]">
                    Available payout
                  </p>
                  <p className="mt-1 text-[18px] font-semibold tracking-[-0.03em]">
                    {moneyFormatter.format(payoutSummary.availableAmount)}
                  </p>
                </div>
                <p className="text-[9px] font-medium text-[#808080]">
                  {payoutSummary.eligibleOrderCount} settled {payoutSummary.eligibleOrderCount === 1 ? "order" : "orders"}
                </p>
              </div>

              {payoutSummary.latestPayout ? (
                <div className="mt-3">
                  <p className="text-[9px] font-medium text-[#808080]">
                    Latest payout:{" "}
                    <span className="font-semibold text-black">
                      {payoutSummary.latestPayout.status}
                    </span>{" "}
                    · {moneyFormatter.format(payoutSummary.latestPayout.amount)}
                  </p>
                  {["FAILED", "PROCESSING"].includes(payoutSummary.latestPayout.status) ? (
                    <button
                      type="button"
                      onClick={reconcileLatestPayout}
                      disabled={pending}
                      className="mt-2 text-[9px] font-semibold text-black underline underline-offset-2 disabled:opacity-40"
                    >
                      {pending ? "Checking Paystack..." : "Check / retry latest payout"}
                    </button>
                  ) : null}
                </div>
              ) : null}

              {!confirmPayout ? (
                <button
                  type="button"
                  onClick={() => setConfirmPayout(true)}
                  disabled={pending || payoutSummary.availableAmount <= 0}
                  className="mt-3 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-[8px] border-2 border-[#EAEAEA] text-[11px] font-semibold disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Send className="h-3.5 w-3.5" strokeWidth={2.3} />
                  Send Available Payout
                </button>
              ) : (
                <div className="mt-3 rounded-[8px] bg-[#F5F5F5] p-3">
                  <p className="text-[10px] font-medium leading-[1.45] text-[#606060]">
                    Send {moneyFormatter.format(payoutSummary.availableAmount)} to the verified Paystack recipient? Only successfully paid, completed restaurant orders are included.
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmPayout(false)}
                      className="h-8 rounded-[7px] border border-[#D8D8D8] text-[10px] font-semibold"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={sendPayout}
                      disabled={pending}
                      className="h-8 rounded-[7px] bg-black text-[10px] font-semibold text-white disabled:opacity-40"
                    >
                      {pending ? "Sending..." : "Send Payout"}
                    </button>
                  </div>
                </div>
              )}

              {payoutMessage ? (
                <p className="mt-3 text-[9px] font-medium leading-[1.45] text-[#606060]">
                  {payoutMessage}
                </p>
              ) : null}
            </div>
          ) : null}

          {error ? (
            <p className="rounded-[10px] bg-red-50 px-3 py-2.5 text-[11px] font-medium text-red-600">
              {error}
            </p>
          ) : null}
        </div>
      </div>

      <div className="shrink-0 border-t border-[#EAEAEA] bg-white px-6 py-4">
        <button
          type="button"
          onClick={save}
          disabled={pending || !verified}
          className="h-10 w-full rounded-[10px] bg-black text-[13px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          {pending ? "Working..." : "Save Verified Payout Account"}
        </button>
      </div>
    </div>
  );
}
