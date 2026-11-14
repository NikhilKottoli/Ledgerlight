"use client";
import { useEffect, useState } from "react";
import { XAxisProps } from "recharts";

interface Event {
  date: string;
  label: string;
  kind: string;
  source_url: string;
}

interface EventMarkerProps {
  eventsPath?: string;
  xAxis?: XAxisProps;
}

export function EventMarker({ eventsPath = "/data/events.json" }: EventMarkerProps) {
  const [events, setEvents] = useState<Event[]>([]);

  useEffect(() => {
    fetch(eventsPath).then(r => r.ok && r.json()).then(setEvents).catch(() => {});
  }, [eventsPath]);

  if (!events.length) return null;

  return (
    <>
      {events.map((e, i) => (
        <CustomEventMarker key={i} event={e} />
      ))}
    </>
  );
}

function CustomEventMarker({ event }: { event: Event }) {
  const colors: Record<string, string> = {
    protocol_change: "#3b82f6",
    exploit: "#ef4444",
    upgrade: "#10b981",
    other: "#f59e0b",
  };
  const color = colors[event.kind] || colors.other;

  return null; // Actual implementation would hook into Recharts
}
