"use client";

import { useState } from "react";
import { useUploadThing } from "@/lib/uploadthing";

export function MenuImageUpload({ name = "imageUrl", defaultValue = "" }: { name?: string; defaultValue?: string | null }) {
  const [imageUrl, setImageUrl] = useState(defaultValue ?? "");
  const [uploading, setUploading] = useState(false);
  const { startUpload } = useUploadThing("menuImage", {
    onClientUploadComplete: (files) => {
      const url = files?.[0]?.ufsUrl;
      if (url) setImageUrl(url);
      setUploading(false);
    },
    onUploadError: () => setUploading(false),
  });

  return (
    <div className="space-y-2">
      <input type="hidden" name={name} value={imageUrl} />
      {imageUrl ? (
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl} alt="Menu item" className="h-20 w-20 rounded-lg border object-cover" />
          <button type="button" onClick={() => setImageUrl("")} className="text-sm underline">Remove image</button>
        </div>
      ) : null}
      <input
        type="file"
        accept="image/*"
        disabled={uploading}
        onChange={async (event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          setUploading(true);
          await startUpload([file]);
        }}
        className="block w-full text-sm"
      />
      {uploading && <p className="text-xs text-gray-500">Uploading image…</p>}
    </div>
  );
}
