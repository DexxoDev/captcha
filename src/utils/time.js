export function now() {
  return Date.now();
}

export function secondsFromNow(seconds) {
  return now() + seconds * 1000;
}

export function minutesToMilliseconds(minutes) {
  return minutes * 60 * 1000;
}

export function formatDuration(seconds) {
  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;

  if (minutes < 60) {
    return remainder ? `${minutes}m ${remainder}s` : `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  const minuteRemainder = minutes % 60;
  return minuteRemainder ? `${hours}h ${minuteRemainder}m` : `${hours}h`;
}

export function discordRelativeTimestamp(timestampMs) {
  return `<t:${Math.floor(timestampMs / 1000)}:R>`;
}

export function ageInHours(date) {
  return Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60));
}
