"use client";

import { useState } from "react";
import { ImagePlus, X } from "lucide-react";

import { useUploadThing } from "@/lib/uploadthing";

export function RestaurantImageUpload({
  defaultValue = "",
}: {
  defaultValue?: string | null;
}) {
  const [imageUrl, setImageUrl] = useState(defaultValue ?? "");
  const [uploading, setUploading] = useState(false);
  const { startUpload } = useUploadThing("restaurantImage", {
    onClientUploadComplete: (files) => {
      const url = files?.[0]?.ufsUrl;
      if (url) setImageUrl(url);
      setUploading(false);
    },
    onUploadError: () => setUploading(false),
  });

  return (
    <div>
      <input type="hidden" name="imageUrl" value={imageUrl} />
      <div className="flex items-center gap-3">
        {imageUrl ? (
          <div className="relative h-14 w-14 overflow-hidden rounded-[8px] border border-[#EAEAEA]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl} alt="Restaurant" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => setImageUrl("")}
              className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-black text-white"
              aria-label="Remove restaurant image"
            >
              <X className="h-3 w-3" strokeWidth={2.3} />
            </button>
          </div>
        ) : (
          <span className="grid h-14 w-14 place-items-center rounded-[8px] border-2 border-dashed border-[#D8D8D8] text-[#808080]">
            <ImagePlus className="h-5 w-5" strokeWidth={2.3} />
          </span>
        )}
        <label className="cursor-pointer text-[12px] font-semibold tracking-[-0.02em] underline underline-offset-2">
          {uploading ? "Uploading..." : imageUrl ? "Change image" : "Add restaurant image"}
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            disabled={uploading}
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              setUploading(true);
              await startUpload([file]);
            }}
          />
        </label>
      </div>
    </div>
  );
}
