const SIEBEL_DATETIME =
  /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})\s*(AM|PM)$/i;

function pad(value) {
  return String(value).padStart(2, "0");
}

function daysInMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function invalid(value) {
  throw new Error(`Unrecognized Siebel datetime: ${value}`);
}

/**
 * Parse a Siebel clock time such as "11/5/2025 11:41:37 AM".
 * The string has no zone. The returned Date uses UTC fields so comparisons
 * stay stable, and the UI keeps showing the original text.
 * Empty values return null.
 */
export function parseSiebelDateTime(value) {
  if (value == null) {
    return null;
  }
  const text = String(value).trim();
  if (!text) {
    return null;
  }
  const match = text.match(SIEBEL_DATETIME);
  if (!match) {
    invalid(value);
  }
  const month = Number(match[1]);
  const day = Number(match[2]);
  const year = Number(match[3]);
  let hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);
  const ampm = match[7].toUpperCase();

  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) {
    invalid(value);
  }
  if (hour < 1 || hour > 12 || minute > 59 || second > 59) {
    invalid(value);
  }
  if (ampm === "AM") {
    if (hour === 12) {
      hour = 0;
    }
  } else if (hour !== 12) {
    hour += 12;
  }

  return new Date(Date.UTC(year, month - 1, day, hour, minute, second));
}

export function formatSiebelDateTime(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    throw new Error("Cannot format an invalid date");
  }
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  const year = date.getUTCFullYear();
  const minute = date.getUTCMinutes();
  const second = date.getUTCSeconds();
  const hour24 = date.getUTCHours();
  const ampm = hour24 >= 12 ? "PM" : "AM";
  let hour = hour24 % 12;
  if (hour === 0) {
    hour = 12;
  }
  return `${month}/${day}/${year} ${hour}:${pad(minute)}:${pad(second)} ${ampm}`;
}

/**
 * Stale means Siebel's last updated clock time is newer than the search
 * index last_updated by more than toleranceSeconds. Equal or older is not stale.
 */
export function isStale(siebelValue, esValue, toleranceSeconds) {
  const siebel = parseSiebelDateTime(siebelValue);
  const es = parseSiebelDateTime(esValue);
  if (!siebel || !es) {
    return false;
  }
  const tolerance = Number(toleranceSeconds);
  if (!Number.isFinite(tolerance) || tolerance < 0) {
    throw new Error("Tolerance must be a non-negative number of seconds");
  }
  return siebel.getTime() - es.getTime() > tolerance * 1000;
}
