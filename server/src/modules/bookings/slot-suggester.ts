export interface Slot {
  startAt: Date;
  endAt: Date;
}

const DAY_START_HOUR = 7; // 07:00 local
const DAY_END_HOUR = 21; // 21:00 local
const ALIGN_MINUTES = 30;

/** Round a date up to the next 30-minute boundary. */
function alignUp(date: Date): Date {
  const d = new Date(date);
  d.setSeconds(0, 0);
  const remainder = d.getMinutes() % ALIGN_MINUTES;
  if (remainder !== 0) {
    d.setMinutes(d.getMinutes() + (ALIGN_MINUTES - remainder));
  }
  return d;
}

/** Clamp a candidate start to the day's opening hour. */
function clampToDayStart(date: Date): Date {
  const d = new Date(date);
  if (d.getHours() < DAY_START_HOUR) {
    d.setHours(DAY_START_HOUR, 0, 0, 0);
  }
  return d;
}

/**
 * Given the confirmed bookings for a single asset and a requested duration,
 * walk the gaps within business hours and return the first `count` free slots
 * that fit, aligned to 30-minute boundaries. Pure and deterministic.
 */
export function suggestSlots(
  busy: Slot[],
  durationMs: number,
  from: Date,
  count = 3,
  horizonDays = 7,
): Slot[] {
  const suggestions: Slot[] = [];
  const sorted = [...busy].sort(
    (a, b) => a.startAt.getTime() - b.startAt.getTime(),
  );

  let cursor = alignUp(clampToDayStart(from));
  const horizon = new Date(from);
  horizon.setDate(horizon.getDate() + horizonDays);

  while (cursor < horizon && suggestions.length < count) {
    // Move the cursor inside business hours for its day.
    if (cursor.getHours() < DAY_START_HOUR) {
      cursor.setHours(DAY_START_HOUR, 0, 0, 0);
    }
    const candidateEnd = new Date(cursor.getTime() + durationMs);

    // If the slot would run past the day's close, jump to next day's open.
    const dayClose = new Date(cursor);
    dayClose.setHours(DAY_END_HOUR, 0, 0, 0);
    if (candidateEnd > dayClose) {
      cursor = new Date(cursor);
      cursor.setDate(cursor.getDate() + 1);
      cursor.setHours(DAY_START_HOUR, 0, 0, 0);
      continue;
    }

    // Does the candidate overlap any busy slot? (half-open [) semantics)
    const clash = sorted.find(
      (b) => cursor < b.endAt && candidateEnd > b.startAt,
    );
    if (clash) {
      cursor = alignUp(clash.endAt);
      continue;
    }

    suggestions.push({ startAt: new Date(cursor), endAt: candidateEnd });
    cursor = new Date(candidateEnd);
  }

  return suggestions;
}
