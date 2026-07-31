/**
 * A device can only ever report "I'm online" (via its periodic heartbeat) -
 * it has no way to report "I just lost power/WiFi". So is_online/last_seen
 * in the database are just the last value a device successfully wrote, and
 * go stale forever once it actually goes offline. Anywhere "online" is
 * derived from these columns, treat them as valid only within this window -
 * 3x the firmware's 30s heartbeat interval, tolerating one or two missed
 * beats before flipping to offline.
 */
export const STALE_THRESHOLD_MS = 90_000;
