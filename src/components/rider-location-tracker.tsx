"use client";

import { LocateFixed, Phone, Radio, WifiOff } from "lucide-react";
import mapboxgl from "mapbox-gl";
import { useEffect, useRef, useState } from "react";

function createRiderMarker() {
  const el = document.createElement("div");
  el.style.width = "28px";
  el.style.height = "28px";
  el.style.borderRadius = "9999px";
  el.style.background = "#fff";
  el.style.border = "4px solid #000";
  el.style.boxShadow = "0 5px 18px rgba(0,0,0,.35)";
  const dot = document.createElement("div");
  dot.style.width = "8px";
  dot.style.height = "8px";
  dot.style.borderRadius = "9999px";
  dot.style.background = "#000";
  dot.style.margin = "6px";
  el.appendChild(dot);
  return el;
}

function createDestinationMarker() {
  const el = document.createElement("div");
  el.style.width = "30px";
  el.style.height = "30px";
  el.style.borderRadius = "8px";
  el.style.background = "#000";
  el.style.border = "3px solid #fff";
  el.style.boxShadow = "0 5px 18px rgba(0,0,0,.35)";
  return el;
}

export function RiderLocationTracker({
  deliveryId,
  destinationLatitude,
  destinationLongitude,
  customerName,
  customerPhone,
  customerImageUrl,
}: {
  deliveryId: string | null;
  destinationLatitude?: number | null;
  destinationLongitude?: number | null;
  customerName?: string | null;
  customerPhone?: string | null;
  customerImageUrl?: string | null;
}) {
  const [state, setState] = useState<"starting" | "live" | "error" | "stopped">("starting");
  const [, setMessage] = useState("Requesting your location…");
  const [position, setPosition] = useState<[number, number] | null>(null);
  const lastSentAt = useRef(0);
  const watchId = useRef<number | null>(null);
  const mapEl = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const riderMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const destinationMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const fittedRef = useRef(false);
  const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN?.trim() || "";

  async function send(latitude: number, longitude: number) {
    if (!deliveryId) {
      setState("live");
      setMessage("Your current location is ready.");
      return;
    }

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
    setMessage("Live with restaurant and customer.");
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
      (nextPosition) => {
        const latitude = nextPosition.coords.latitude;
        const longitude = nextPosition.coords.longitude;
        setPosition([longitude, latitude]);
        void send(latitude, longitude).catch((error) => {
          setState("error");
          setMessage(
            error instanceof Error ? error.message : "Could not share your location."
          );
        });
      },
      (error) => {
        setState("error");
        setMessage(
          error.code === error.PERMISSION_DENIED
            ? "Location permission is off. Allow location access to continue."
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

  useEffect(() => {
    start();
    return () => {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deliveryId]);

  useEffect(() => {
    if (!token || !mapEl.current || mapRef.current) return;

    const initialCenter: [number, number] =
      position ??
      (typeof destinationLongitude === "number" && typeof destinationLatitude === "number"
        ? [destinationLongitude, destinationLatitude]
        : [7.3986, 9.0765]);

    const map = new mapboxgl.Map({
      accessToken: token,
      container: mapEl.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: initialCenter,
      zoom: 14.5,
      attributionControl: false,
    });

    map.addControl(new mapboxgl.AttributionControl({ compact: true }), "bottom-right");
    mapRef.current = map;

    return () => {
      riderMarkerRef.current?.remove();
      destinationMarkerRef.current?.remove();
      riderMarkerRef.current = null;
      destinationMarkerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, [token]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !position) return;

    if (!riderMarkerRef.current) {
      riderMarkerRef.current = new mapboxgl.Marker({
        element: createRiderMarker(),
        anchor: "center",
      })
        .setLngLat(position)
        .addTo(map);
    } else {
      riderMarkerRef.current.setLngLat(position);
    }

    const hasDestination =
      typeof destinationLongitude === "number" &&
      typeof destinationLatitude === "number";

    if (hasDestination && !fittedRef.current) {
      const bounds = new mapboxgl.LngLatBounds();
      bounds.extend(position);
      bounds.extend([destinationLongitude, destinationLatitude]);
      map.fitBounds(bounds, {
        padding: 70,
        maxZoom: 15,
        duration: 700,
      });
      fittedRef.current = true;
    } else if (!hasDestination) {
      map.easeTo({ center: position, duration: 650 });
    }
  }, [position, destinationLatitude, destinationLongitude]);

  useEffect(() => {
    const map = mapRef.current;
    if (
      !map ||
      typeof destinationLongitude !== "number" ||
      typeof destinationLatitude !== "number"
    ) {
      destinationMarkerRef.current?.remove();
      destinationMarkerRef.current = null;
      return;
    }

    const destination: [number, number] = [destinationLongitude, destinationLatitude];
    if (!destinationMarkerRef.current) {
      destinationMarkerRef.current = new mapboxgl.Marker({
        element: createDestinationMarker(),
        anchor: "center",
      })
        .setLngLat(destination)
        .addTo(map);
    } else {
      destinationMarkerRef.current.setLngLat(destination);
    }
  }, [destinationLatitude, destinationLongitude]);

  const Icon = state === "live" ? Radio : state === "error" ? WifiOff : LocateFixed;

  return (
    <div className="relative aspect-square w-full overflow-hidden rounded-[14px] border border-white/10 bg-[#0C0C0C]">
      {token ? (
        <div ref={mapEl} className="absolute inset-0" />
      ) : (
        <div className="absolute inset-0 grid place-items-center text-[14px] text-white/45">
          Map unavailable
        </div>
      )}

      <div className="absolute left-3 top-3 z-10 inline-flex items-center gap-2 rounded-full bg-black/85 px-3 py-2 text-[11px] font-semibold text-white shadow-lg backdrop-blur">
        <Icon className="h-3.5 w-3.5" strokeWidth={2.3} />
        {state === "live"
          ? deliveryId
            ? "LIVE"
            : "YOU"
          : state === "error"
            ? "LOCATION OFF"
            : "LOCATING"}
      </div>

      {customerName ? (
        <div className="absolute inset-x-3 bottom-3 z-10 flex items-center gap-3 rounded-[10px] bg-black px-3 py-3 text-white shadow-lg">
          {customerImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={customerImageUrl}
              alt=""
              className="h-10 w-10 shrink-0 rounded-full object-cover"
            />
          ) : (
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/10 text-[13px] font-semibold">
              {customerName
                .split(" ")
                .filter(Boolean)
                .slice(0, 2)
                .map((part) => part[0]?.toUpperCase())
                .join("")}
            </span>
          )}

          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold">{customerName}</p>
            <p className="mt-1 text-[11px] text-white/45">Customer</p>
          </div>

          {customerPhone ? (
            <a
              href={"tel:" + customerPhone}
              className="inline-flex h-10 shrink-0 items-center gap-2 rounded-[8px] bg-white px-4 text-[12px] font-semibold text-black"
            >
              <Phone className="h-4 w-4" strokeWidth={2.3} />
              Call
            </a>
          ) : (
            <span className="inline-flex h-10 shrink-0 items-center rounded-[8px] bg-white/10 px-4 text-[11px] font-semibold text-white/45">
              No phone
            </span>
          )}
        </div>
      ) : null}

      {state === "error" || state === "stopped" ? (
        <button
          type="button"
          onClick={start}
          className="absolute bottom-3 right-3 z-10 rounded-full bg-white px-4 py-2 text-[11px] font-semibold text-black shadow-lg"
        >
          Retry location
        </button>
      ) : null}
    </div>
  );
}
