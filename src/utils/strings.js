import crypto from 'node:crypto';

export function sample(array) {
  return array[Math.floor(Math.random() * array.length)];
}

export function shuffle(input) {
  const array = [...input];
  for (let index = array.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [array[index], array[swapIndex]] = [array[swapIndex], array[index]];
  }
  return array;
}

export function randomId(prefix = 'id') {
  return `${prefix}_${crypto.randomBytes(4).toString('hex')}`;
}

export function joinLines(lines) {
  return lines.filter(Boolean).join('\n');
}

export function titleCase(value) {
  return value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

export function truncate(value, maxLength = 96) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, Math.max(0, maxLength - 3))}...`;
}

export function maskCode(value) {
  return value
    .split('')
    .map((character) => `\`${character}\``)
    .join(' ');
}

export function formatList(values) {
  return values.filter(Boolean).join(' | ');
}

export function mentionRole(roleId) {
  return roleId ? `<@&${roleId}>` : 'Not set';
}

export function mentionChannel(channelId) {
  return channelId ? `<#${channelId}>` : 'Not set';
}

export function clamp(min, value, max) {
  return Math.min(max, Math.max(min, value));
}
