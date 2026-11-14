"use client";
import { useEffect, useState } from "react";
import { ReferenceLine } from "recharts";

interface Event {
  date: string;
  label: string;
  kind: string;
  source_url: string;
}

interface EventMarkerProps {
  eventsPath?: string;
  /** Restrict annotations to the chart's visible date span. */
  start?: string;
  end?: string;
}

const cache = new Map<string, Promise<Event[]>>();

function loadEvents(path: string): Promise<Event[]> {
  if (!cache.has(path)) {
    cache.set(
      path,
      fetch(path)
        .then((r) => (r.ok ? r.json() : []))
        .catch(() => [])
    );
  }
  return cache.get(path)!;
}

const EVENT_COLORS: Record<string, string> = {
  protocol_change: "#4d6b85",
  exploit: "#b24a3e",
  upgrade: "#557a60",
  other: "#a8742a",
};

const EVENT_LABELS: Record<string, string> = {
  "Buyback programme begins": "Buybacks begin",
  "Omni infrastructure exploit (~$3.8M)": "Exploit",
};

/**
 * Renders real events from public/data/events.json as reference lines.
 * Recharts ignores reference lines outside the categorical domain, but we
 * filter first so labels never appear for dates the chart does not cover.
 */
export function EventMarker({ eventsPath = "/data/events.json", start, end }: EventMarkerProps) {
  const [events, setEvents] = useState<Event[]>([]);

  useEffect(() => {
    let active = true;
    loadEvents(eventsPath).then((data) => {
      if (active) setEvents(data);
    });
    return () => {
      active = false;
    };
  }, [eventsPath]);

  const visible = events.filter((event) => (!start || event.date >= start) && (!end || event.date <= end));
  if (!visible.length) return null;

  return (
    <>
      {visible.map((event) => (
        <ReferenceLine
          key={`${event.date}-${event.kind}`}
          x={event.date}
          stroke={EVENT_COLORS[event.kind] || EVENT_COLORS.other}
          strokeOpacity={0.45}
          strokeDasharray="3 4"
          ifOverflow="hidden"
          label={{
            value: EVENT_LABELS[event.label] || event.label,
            position: "insideTopRight",
            fill: EVENT_COLORS[event.kind] || EVENT_COLORS.other,
            fontSize: 9,
            opacity: 0.9,
          }}
        />
      ))}
    </>
  );
}
