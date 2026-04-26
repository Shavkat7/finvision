// Time / locale / geo context snapshot.
// Used in two places:
//   1) injected into the system prompt at session start
//   2) returned by the get_current_context tool for fresh values mid-session

import type { GeoCoords } from "./types";

export type HourBucket =
  | "late_night"   // 00:00–05:59
  | "early_morning"  // 06:00–08:59
  | "morning"      // 09:00–11:59
  | "afternoon"    // 12:00–16:59
  | "evening"      // 17:00–20:59
  | "night";       // 21:00–23:59

export interface AppContext {
  iso_timestamp: string;
  local_time_tashkent: string;     // HH:MM in GMT+5
  day_of_week: string;             // Mon ... Sun
  is_weekend: boolean;
  is_business_hours_uz: boolean;   // Mon-Fri 09-18 (Tashkent)
  hour_bucket: HourBucket;
  user_locale: string;
  has_geolocation: boolean;
  geo?: GeoCoords;
  channel: string;
}

// Tashkent is GMT+5, no DST. We compute by shifting the UTC instant by
// +5h and reading UTC fields — this is correct regardless of the
// browser's own timezone.
function tashkentNow(): Date {
  return new Date(Date.now() + 5 * 60 * 60 * 1000);
}

export function getAppContext(geo?: GeoCoords | null): AppContext {
  const tash = tashkentNow();
  const hour = tash.getUTCHours();
  const minute = tash.getUTCMinutes();
  const dayIdx = tash.getUTCDay();
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const bucket: HourBucket =
    hour < 6 ? "late_night" :
    hour < 9 ? "early_morning" :
    hour < 12 ? "morning" :
    hour < 17 ? "afternoon" :
    hour < 21 ? "evening" : "night";

  const isWeekend = dayIdx === 0 || dayIdx === 6;
  const isBusinessHours = !isWeekend && hour >= 9 && hour < 18;

  return {
    iso_timestamp: new Date().toISOString(),
    local_time_tashkent: `${pad(hour)}:${pad(minute)}`,
    day_of_week: dayNames[dayIdx],
    is_weekend: isWeekend,
    is_business_hours_uz: isBusinessHours,
    hour_bucket: bucket,
    user_locale:
      typeof navigator !== "undefined" && navigator.language
        ? navigator.language
        : "uz-UZ",
    has_geolocation: Boolean(geo),
    geo: geo ?? undefined,
    channel: "web",
  };
}

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

export function renderContextForPrompt(c: AppContext): string {
  return [
    `Tashkent time (GMT+5): ${c.local_time_tashkent} (${c.day_of_week})`,
    `Hour bucket: ${c.hour_bucket}`,
    `Business hours now: ${c.is_business_hours_uz ? "yes (Mon-Fri 09-18)" : "no — call center is 24/7"}`,
    `Channel: ${c.channel}`,
    `User geolocation: ${c.has_geolocation ? `granted (${c.geo?.lat.toFixed(3)}, ${c.geo?.lng.toFixed(3)})` : "not granted"}`,
  ].join("\n");
}
