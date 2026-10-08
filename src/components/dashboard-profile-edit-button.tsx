"use client";

import { PencilLine } from "lucide-react";
import { useClerk } from "@clerk/nextjs";

export function DashboardProfileEditButton() {
  const { openUserProfile } = useClerk();

  return (
    <button
      type="button"
      onClick={() => openUserProfile()}
      aria-label="Edit profile"
      className="absolute bottom-0 right-0 grid h-6 w-6 place-items-center overflow-hidden rounded-full border-4 border-white bg-black"
    >
      <PencilLine className="h-3 w-3 fill-white text-white" strokeWidth={2.65} />
    </button>
  );
}
