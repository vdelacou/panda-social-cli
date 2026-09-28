import type { Writable } from 'node:stream';
import { createLogger, format, transports } from 'winston';
import type { Logger, LogMeta } from '../use-cases/ports/logger.ts';

// Secrets plus natural identifiers (rule 27), all lowercase: the lookup lowercases the key.
const REDACTED_KEYS = new Set(['password', 'token', 'access_token', 'accesstoken', 'authorization', 'apikey', 'secret', 'email', 'phone']);

const redactFormat = format((info) => {
  for (const key of Object.keys(info)) {
    if (REDACTED_KEYS.has(key.toLowerCase())) info[key] = '[REDACTED]';
  }
  return info;
});

// stdout carries the command's JSON answer, so the composition root hands this
// adapter stderr: a log line must never corrupt what an agent parses.
export const createWinstonLogger = (level: string, stream: Writable): Logger => {
  const winston = createLogger({
    level,
    format: format.combine(redactFormat(), format.json()),
    transports: [new transports.Stream({ stream })],
  });
  const createMethod =
    (methodLevel: 'info' | 'warn' | 'error') =>
    (event: string, meta?: LogMeta): void => {
      winston.log(methodLevel, event, meta);
    };
  return { info: createMethod('info'), warn: createMethod('warn'), error: createMethod('error') };
};
