import Link from "next/link";
import { SignInButton, UserButton } from "@clerk/nextjs";
import { Menu, Plus } from "lucide-react";

import { getOrCreateCurrentUser } from "@/lib/current-user";

export async function SiteHeader() {
  const user = await getOrCreateCurrentUser();

  return (
    <header className="sticky top-0 z-50 border-b-[0.5px] border-b-[rgba(128,128,128,0.5)] bg-white">
      <div className="mx-auto flex h-[76px] w-full items-center justify-between px-5 sm:px-8 lg:px-11">
        <div className="flex min-w-0 items-center gap-3 sm:gap-3.5">
          <button type="button" aria-label="Open menu" className="grid h-10 w-10 shrink-0 place-items-center rounded-lg transition-colors hover:bg-black/[0.04]">
            <Menu className="h-5 w-5" strokeWidth={2} />
          </button>
          <Link href="/" aria-label="Paperbag home" className="shrink-0">
            <img src="/paperbag-wordmark.svg" alt="Paperbag" className="h-5 w-auto" />
          </Link>
        </div>

        <div className="flex shrink-0 items-center gap-4">
          {!user ? (
            <>
              <SignInButton mode="modal">
                <button className="rounded-full border-2 border-black px-3 py-1 text-[12px] font-semibold leading-[0.8] tracking-[-0.052em] transition-colors hover:bg-black hover:text-white sm:px-3">
                  Log in
                </button>
              </SignInButton>
              <Link href="/restaurant/new" className="hidden items-center gap-2 rounded-full bg-black px-3.5 py-1.5 text-[12px] font-semibold leading-[0.8] tracking-[-0.052em] text-white transition-opacity hover:opacity-80 sm:inline-flex">
                Add your Business <Plus className="h-4 w-4" strokeWidth={2.25} />
              </Link>
            </>
          ) : (
            <div className="flex items-center gap-4">
              <Link href="/restaurant/new" className="hidden items-center gap-2 rounded-full bg-black px-3.5 py-1.5 text-[12px] font-semibold leading-[0.8] tracking-[-0.052em] text-white transition-opacity hover:opacity-80 sm:inline-flex">
                Add your Business <Plus className="h-4 w-4" strokeWidth={2.25} />
              </Link>
              <UserButton />
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
