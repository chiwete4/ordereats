"use client";

import { useState } from "react";
import { Check, Copy, LoaderCircle, UsersRound, X } from "lucide-react";
import {
  activateDemoRestaurantTeam,
  type DemoTeamCredential,
} from "@/actions/demo-team";

type DemoRestaurant = { id: string; name: string };

export function DemoTeamActivation({
  restaurants,
  currentRestaurantId,
}: {
  restaurants: DemoRestaurant[];
  currentRestaurantId: string;
}) {
  const [open, setOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState("");
  const [credentials, setCredentials] = useState<DemoTeamCredential[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  async function activate(restaurantIds: string[]) {
    if (running) return;
    setRunning(true);
    setCopied(false);
    setErrors([]);
    setProgress("");

    try {
      for (const [index, restaurantId] of restaurantIds.entries()) {
        const restaurant = restaurants.find((item) => item.id === restaurantId);
        setProgress(`Setting up ${restaurant?.name || "restaurant"} (${index + 1}/${restaurantIds.length})`);

        try {
          const result = await activateDemoRestaurantTeam(restaurantId);
          setCredentials((previous) => {
            const newEmails = new Set(result.accounts.map((account) => account.email));
            return [
              ...previous.filter((account) => !newEmails.has(account.email)),
              ...result.accounts,
            ];
          });
          if (result.errors.length) {
            setErrors((previous) => [
              ...previous,
              ...result.errors.map((message) => `${restaurant?.name}: ${message}`),
            ]);
          }
        } catch (error) {
          setErrors((previous) => [
            ...previous,
            `${restaurant?.name}: ${error instanceof Error ? error.message : "Could not activate accounts"}`,
          ]);
        }
      }
      setProgress("Finished. Copy the credentials below before leaving this page.");
    } finally {
      setRunning(false);
    }
  }

  const credentialText = credentials
    .map(({ restaurant, name, role, email, password }) =>
      `${restaurant} | ${role} | ${name}\nEmail: ${email}\nPassword: ${password}`
    )
    .join("\n\n");

  async function copyCredentials() {
    if (!credentialText) return;
    try {
      await navigator.clipboard.writeText(credentialText);
      setCopied(true);
    } catch {
      setErrors((previous) => [...previous, "Clipboard unavailable. Select and copy the credentials manually."]);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-full border-2 border-[#EAEAEA] px-2.5 py-1 text-[12px] font-semibold leading-none text-black hover:bg-[#F5F5F5]"
      >
        <UsersRound className="h-3.5 w-3.5" strokeWidth={2.3} />
        Demo Account Logins
      </button>

      {open ? (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/45 p-3 sm:p-6">
          <div role="dialog" aria-modal="true" aria-label="Activate demo employee logins" className="flex max-h-[90dvh] w-full max-w-[660px] flex-col overflow-hidden rounded-[14px] bg-white text-black shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-[#EAEAEA] p-5 sm:p-6">
              <div>
                <h2 className="text-[17px] font-semibold tracking-[-0.025em]">Demo employee sign-ins</h2>
                <p className="mt-2 text-[12px] leading-relaxed text-[#777]">
                  Create real Clerk sign-in accounts for your seeded Baze restaurants.
                  Each restaurant gets its own staff and riders. Existing real employees remain untouched.
                </p>
              </div>
              <button type="button" disabled={running} onClick={() => setOpen(false)} aria-label="Close" className="rounded-[6px] p-1 disabled:opacity-30">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">
              <div className="flex flex-wrap gap-2">
                <button type="button" disabled={running} onClick={() => void activate([currentRestaurantId])}
                  className="rounded-[8px] bg-black px-4 py-2.5 text-[11px] font-semibold text-white disabled:opacity-40">
                  Activate this restaurant
                </button>
                <button type="button" disabled={running} onClick={() => void activate(restaurants.map((item) => item.id))}
                  className="rounded-[8px] border border-black px-4 py-2.5 text-[11px] font-semibold text-black disabled:opacity-40">
                  Activate all {restaurants.length} restaurants
                </button>
              </div>

              <p className="mt-3 text-[11px] leading-relaxed text-[#777]">
                Accounts have individual strong passwords. They appear only after activation;
                copy them somewhere safe. Activating an account again generates a new password.
                These are classroom test accounts, not actual restaurant employees.
              </p>

              {progress ? (
                <p aria-live="polite" className="mt-4 flex items-center gap-2 text-[11px] font-medium">
                  {running ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                  {progress}
                </p>
              ) : null}

              {errors.length ? (
                <div className="mt-4 rounded-[8px] bg-red-50 p-3 text-[11px] leading-relaxed text-red-700">
                  <p className="font-semibold">Some accounts could not be activated:</p>
                  {errors.map((error, index) => <p key={index} className="mt-1 break-words">{error}</p>)}
                </div>
              ) : null}

              {credentials.length ? (
                <div className="mt-5 border-t border-[#EAEAEA] pt-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-[12px] font-semibold">Sign-in credentials ({credentials.length})</p>
                    <button type="button" onClick={() => void copyCredentials()}
                      className="inline-flex items-center gap-1.5 rounded-[7px] bg-[#EFEFEF] px-3 py-2 text-[11px] font-semibold">
                      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      {copied ? "Copied" : "Copy all credentials"}
                    </button>
                  </div>

                  <div className="mt-3 max-h-[280px] space-y-2 overflow-y-auto">
                    {credentials.map((person) => (
                      <div key={person.email} className="rounded-[8px] border border-[#EAEAEA] p-3 text-[11px]">
                        <p className="font-semibold">{person.name} · {person.role} · {person.restaurant}</p>
                        <p className="mt-1 break-all text-[#666]">{person.email}</p>
                        <p className="mt-1 break-all font-mono text-[10px] text-[#555]">Password: {person.password}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
