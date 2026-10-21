export const SRI_LANKA_TIMEZONE = 'Asia/Colombo';
export const BOOKING_CHANGE_CUTOFF_HOURS = 2;
export const RESCHEDULE_CUTOFF_HOURS = BOOKING_CHANGE_CUTOFF_HOURS;

export interface DisplaySlot {
  id: string;
  startTime: string; // Formatted 12h display e.g. "10:00 AM"
  endTime: string;   // Formatted 12h display e.g. "11:00 AM"
  rawStart: string;  // Raw string e.g. "10:00" or ISO instant
  rawEnd: string;    // Raw string e.g. "11:00" or ISO instant
  durationHours: number;
  isAvailable: boolean;
  isSelected: boolean;
  isCurrent?: boolean;
  disabledReason?: string;
}

/** Formats a Date object to YYYY-MM-DD */
export function formatDateToYMD(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Formats an ISO string, 24h time string ("14:00"), or 12h time string to "hh:mm A" */
export function formatTimeString(time: string): string {
  if (!time) return '';
  if (time.includes('AM') || time.includes('PM')) return time;
  if (time.includes('T') || time.endsWith('Z')) {
    const d = new Date(time);
    if (!isNaN(d.getTime())) {
      return d.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: SRI_LANKA_TIMEZONE
      });
    }
  }
  const [hStr, mStr] = time.split(':');
  let h = parseInt(hStr, 10);
  const m = mStr || '00';
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  h = h ? h : 12;
  return `${String(h).padStart(2, '0')}:${m} ${ampm}`;
}

/** Removes non-alphanumeric chars for use in HTML element IDs */
export function getCleanTimeId(time: string): string {
  return time.replace(/[^a-zA-Z0-9]/g, '');
}

/**
 * Converts a date string (YYYY-MM-DD) and a time string (HH:mm or ISO)
 * into a UTC ISO Instant string respecting Sri Lanka timezone (+05:30).
 */
export function convertToIsoInstant(dateStr: string, timeStr: string): string {
  if (!timeStr) return '';
  if (timeStr.includes('T') && timeStr.endsWith('Z')) {
    return new Date(timeStr).toISOString();
  }
  if (timeStr.includes('T')) {
    return new Date(timeStr).toISOString();
  }
  // format is HH:mm or HH:mm:ss
  const normalizedTime = timeStr.length === 5 ? `${timeStr}:00` : timeStr;
  return new Date(`${dateStr}T${normalizedTime}+05:30`).toISOString();
}

/**
 * Calculates start timestamp in milliseconds from dateStr and time string
 */
export function getSlotStartTimestamp(dateStr: string, rawStart: string): number {
  if (rawStart.includes('T')) {
    return new Date(rawStart).getTime();
  }
  return new Date(`${dateStr}T${rawStart.length === 5 ? rawStart + ':00' : rawStart}+05:30`).getTime();
}

/**
 * Calculates end timestamp in milliseconds from dateStr and time string
 */
export function getSlotEndTimestamp(dateStr: string, rawEnd: string): number {
  if (rawEnd.includes('T')) {
    return new Date(rawEnd).getTime();
  }
  return new Date(`${dateStr}T${rawEnd.length === 5 ? rawEnd + ':00' : rawEnd}+05:30`).getTime();
}

/**
 * Checks if a given timestamp or ISO time string is within cutoffHours from now
 */
export function isWithinCutoffHours(
  time: string | number | Date,
  cutoffHours = RESCHEDULE_CUTOFF_HOURS,
  now = new Date()
): boolean {
  let timeMs = 0;
  if (typeof time === 'number') {
    timeMs = time;
  } else if (time instanceof Date) {
    timeMs = time.getTime();
  } else if (typeof time === 'string') {
    timeMs = new Date(time).getTime();
  }
  if (!timeMs || isNaN(timeMs)) return false;
  const cutoffMs = cutoffHours * 60 * 60 * 1000;
  return timeMs - now.getTime() < cutoffMs;
}

/**
 * Calculates duration in hours between two time strings or ISO strings
 */
export function calculateDurationHours(
  startTime: string,
  endTime: string,
  dateStr = formatDateToYMD(new Date())
): number {
  const startMs = getSlotStartTimestamp(dateStr, startTime);
  const endMs = getSlotEndTimestamp(dateStr, endTime);
  const diffMs = endMs - startMs;
  if (diffMs <= 0 || isNaN(diffMs)) return 1;
  return Math.max(1, Math.round(diffMs / (60 * 60 * 1000)));
}

/**
 * Calculates start timestamp in milliseconds from startTime and optional bookingDate
 */
export function getBookingStartTimestamp(startTime: string, bookingDate?: string): number {
  if (!startTime) return 0;
  if (startTime.includes('T')) {
    const ms = new Date(startTime).getTime();
    return isNaN(ms) ? 0 : ms;
  }
  if (bookingDate) {
    const normalizedTime = startTime.length === 5 ? `${startTime}:00` : startTime;
    const ms = new Date(`${bookingDate}T${normalizedTime}+05:30`).getTime();
    return isNaN(ms) ? 0 : ms;
  }
  const ms = new Date(startTime).getTime();
  return isNaN(ms) ? 0 : ms;
}

/**
 * Pure helper to determine if a booking can be cancelled:
 * status is PENDING or CONFIRMED and now + cutoff <= startTime
 */
export function canCancel(
  booking: { status: string; startTime: string; bookingDate?: string },
  now: number | Date = Date.now(),
  cutoffHours = BOOKING_CHANGE_CUTOFF_HOURS
): boolean {
  if (!booking) return false;
  if (booking.status !== 'PENDING' && booking.status !== 'CONFIRMED') {
    return false;
  }

  const nowMs = typeof now === 'number' ? now : now.getTime();
  const startMs = getBookingStartTimestamp(booking.startTime, booking.bookingDate);
  if (!startMs) return false;

  const cutoffMs = cutoffHours * 60 * 60 * 1000;
  return nowMs + cutoffMs <= startMs;
}


