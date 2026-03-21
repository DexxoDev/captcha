const DELIMITER = ':';

export function customId(...parts) {
  return parts.join(DELIMITER);
}

export function parseCustomId(value) {
  return value.split(DELIMITER);
}
