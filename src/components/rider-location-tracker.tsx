"use client";

import { LocateFixed, Radio, WifiOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export function RiderLocationTracker({
  deliveryId,
}: {
  deliveryId: string;
}) {
  const [state, setState] = useState<"starting" | "live" | "error" | "stopped">(
    "starting"
  );
  const [message, setMessage] = useState("Requesting your location…");
  const lastSentAt = useRef(0);
  const watchId = useRef<number | null>(null);

  async function send(latitude: number, longitude: number) {
    const now = Date.now();
    if (now - lastSentAt.current < 8000) return;
    lastSentAt.current = now;

    const response = await fetch("/api/rider/location", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        deliveryId,
        latitude,
        longitude,
      }),
    });

    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || "Could not share your location.");
    }

    setState("live");
    setMessage("Live location is being shared with the restaurant.");
  }

  function start() {
    if (!navigator.geolocation) {
      setState("error");
      setMessage("This device does not support location sharing.");
      return;
    }

    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
    }

    setState("starting");
    setMessage("Requesting your location…");

    watchId.current = navigator.geolocation.watchPosition(
      (position) => {
        void send(position.coords.latitude, position.coords.longitude).catch(
          (error) => {
            setState("error");
            setMessage(
              error instanceof Error
                ? error.message
                : "Could not share your location."
            );
          }
        );
      },
      (error) => {
        setState("error");
        setMessage(
          error.code === error.PERMISSION_DENIED
            ? "Location permission is off. Allow location access to share your trip."
            : "Your location is temporarily unavailable."
        );
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 15000,
      }
    );
  }

  function stop() {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    setState("stopped");
    setMessage("Location sharing is paused.");
  }

  useEffect(() => {
    start();
    return () => {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current);
      }
    };
    // Start once for the current delivery.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deliveryId]);

  const Icon = state === "live" ? Radio : state === "error" ? WifiOff : LocateFixed;

  return (
    <div className="rounded-[14px] border border-black/10 bg-white p-5">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] bg-black text-white">
          <Icon className="h-4 w-4" strokeWidth={2.3} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold">
            {state === "live"
              ? "Live location on"
              : state === "error"
                ? "Location unavailable"
                : state === "stopped"
                  ? "Location paused"
                  : "Starting location"}
          </p>
          <p className="mt-1 text-[11px] leading-[1.45] text-black/55">{message}</p>
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        {state !== "live" ? (
          <button
            type="button"
            onClick={start}
            className="h-9 flex-1 rounded-[9px] bg-black text-[11px] font-semibold text-white"
          >
            Share Location
          </button>
        ) : (
          <button
            type="button"
            onClick={stop}
            className="h-9 flex-1 rounded-[9px] border border-black/10 text-[11px] font-semibold"
          >
            Pause Sharing
          </button>
        )}
      </div>
    </div>
  );
}
