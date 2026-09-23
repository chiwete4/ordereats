"use client";

import Link from "next/link";
import { SignInButton, UserButton, useUser } from "@clerk/nextjs";
import { Menu, Plus } from "lucide-react";
import { usePathname } from "next/navigation";

export function SiteHeader() {
  const { isLoaded, isSignedIn } = useUser();
  const pathname = usePathname();
  const isDashboard = pathname.startsWith("/restaurant/dashboard");

  return (
    <header className="sticky top-0 z-50 border-b-[0.5px] border-b-[rgba(196,196,196,0.5)] bg-white">
      <div className="mx-auto flex h-[56px] w-full items-center justify-between px-0 sm:px-2 lg:px-5">
        <div className="flex min-w-0 items-center gap-3 sm:gap-3.5">
          <button type="button" aria-label="Open menu" className="grid h-10 w-10 shrink-0 place-items-center rounded-lg transition-colors hover:bg-black/[0.04]">
            <Menu className="h-5 w-5" strokeWidth={2} />
          </button>
          <Link href="/" aria-label="Paperbag home" className="shrink-0">
            <img src="/paperbag-wordmark.svg" alt="Paperbag" className="h-5 w-auto" />
          </Link>
        </div>

        <div className="flex shrink-0 items-center gap-4">
          {isLoaded && !isSignedIn ? (
            <>
              <SignInButton mode="modal" forceRedirectUrl="/customer">
                <button className="rounded-full border-2 border-black px-[11.5px] py-[3px] text-[12px] font-medium leading-[0.8] tracking-[-0.052em] transition-colors hover:bg-black hover:text-white sm:px-[11.5px]">
                  Log in
                </button>
              </SignInButton>
              <Link href="/restaurant/new" className="hidden items-center gap-2 rounded-full bg-black px-[12.5px] py-[4px] text-[12px] font-medium leading-[0.8] tracking-[-0.052em] text-white transition-opacity hover:opacity-80 sm:inline-flex">
                Add your Business <Plus className="h-4 w-4" strokeWidth={2.25} />
              </Link>
            </>
          ) : isLoaded && isSignedIn ? (
            <div className="flex items-center gap-4">
              <Link href="/restaurant/new" className="hidden items-center gap-2 rounded-full bg-black px-[12.5px] py-[4px] text-[12px] font-medium leading-[0.8] tracking-[-0.052em] text-white transition-opacity hover:opacity-80 sm:inline-flex">
                Add your Business <Plus className="h-4 w-4" strokeWidth={2.25} />
              </Link>
              {!isDashboard && <UserButton />}
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
