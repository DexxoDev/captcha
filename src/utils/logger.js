import pino from 'pino';
import pinoPretty from 'pino-pretty';
import { settings } from '../config/settings.js';

function pushDetail(details, label, value) {
  if (value === null || value === undefined || value === '') {
    return;
  }

  details.push(`${label}=${value}`);
}

function summarizeError(error) {
  if (!error || typeof error !== 'object') {
    return [];
  }

  const details = [];
  pushDetail(details, 'service', error.service);
  pushDetail(details, 'code', error.code);
  pushDetail(details, 'at', error.location);
  pushDetail(details, 'reason', error.message);
  return details;
}

function summarizeLog(log = {}) {
  const details = [];

  pushDetail(details, 'user', log.user);
  pushDetail(details, 'guild', log.guildId);
  pushDetail(details, 'userId', log.userId);
  pushDetail(details, 'channel', log.channelId);
  pushDetail(details, 'signal', log.signal);
  pushDetail(details, 'file', log.file);
  pushDetail(details, 'interaction', log.interactionId);
  pushDetail(details, 'customId', log.customId);

  if (log.patch) {
    pushDetail(details, 'patch', JSON.stringify(log.patch));
  }

  if (log.error) {
    details.push(...summarizeError(log.error));
  }

  return details;
}

const isDevelopment = settings.env === 'development';

const stream = isDevelopment
  ? pinoPretty({
      colorize: true,
      translateTime: 'HH:MM:ss',
      ignore: 'pid,hostname',
      hideObject: true,
      sync: true,
      messageFormat(log, messageKey) {
        const message = log[messageKey];
        const details = summarizeLog(log);
        return details.length ? `${message} | ${details.join(' | ')}` : message;
      },
    })
  : undefined;

export const logger = pino(
  {
    level: settings.logging.level,
    base: undefined,
  },
  stream,
);
