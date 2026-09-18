"use client";

import { useEffect, useMemo, useState } from "react";

const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function timeParts(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return { hours, minutes };
}

function getZonedParts(timeZone: string, date = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const parts = Object.fromEntries(formatter.formatToParts(date).map((part) => [part.type, part.value]));
  return {
    day: dayLabels.indexOf(parts.weekday),
    hours: Number(parts.hour),
    minutes: Number(parts.minute),
    seconds: Number(parts.second),
  };
}

function formatClock(time: string) {
  const { hours, minutes } = timeParts(time);
  const suffix = hours >= 12 ? "PM" : "AM";
  const displayHour = hours % 12 || 12;
  return `${displayHour}${minutes ? `:${String(minutes).padStart(2, "0")}` : ""}${suffix}`;
}

function formatDays(days: number[]) {
  const sorted = [...days].sort((a, b) => a - b);
  if (sorted.length === 5 && sorted.every((day, index) => day === index + 1)) return "Mon - Fri";
  if (sorted.length === 7) return "Daily";
  return sorted.map((day) => dayLabels[day]).join(", ");
}

export function RestaurantHoursStatus({
  openingTime,
  closingTime,
  operatingDays,
  timezone,
}: {
  openingTime: string;
  closingTime: string;
  operatingDays: number[];
  timezone: string;
}) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const status = useMemo(() => {
    const zoned = getZonedParts(timezone, now);
    const opening = timeParts(openingTime);
    const closing = timeParts(closingTime);
    const currentSeconds = zoned.hours * 3600 + zoned.minutes * 60 + zoned.seconds;
    const openingSeconds = opening.hours * 3600 + opening.minutes * 60;
    const closingSeconds = closing.hours * 3600 + closing.minutes * 60;
    const scheduledToday = operatingDays.includes(zoned.day);
    const openNow = scheduledToday && currentSeconds >= openingSeconds && currentSeconds < closingSeconds;

    if (!openNow) return "Closed";

    const remaining = Math.max(0, closingSeconds - currentSeconds);
    const hours = Math.floor(remaining / 3600);
    const minutes = Math.floor((remaining % 3600) / 60);
    const seconds = remaining % 60;
    return `Closing in ${hours}h:${String(minutes).padStart(2, "0")}m:${String(seconds).padStart(2, "0")}s`;
  }, [closingTime, now, openingTime, operatingDays, timezone]);

  return (
    <>
      <p className="shrink-0 text-[12px] font-medium leading-[0.8] tracking-[-0.02em] text-[#808080]">
        {formatClock(openingTime)} - {formatClock(closingTime)}, {formatDays(operatingDays)}
      </p>
      <p className="shrink-0 text-[12px] font-medium leading-[0.8] tracking-[-0.02em] text-[#808080]">
        {status}
      </p>
    </>
  );
}
