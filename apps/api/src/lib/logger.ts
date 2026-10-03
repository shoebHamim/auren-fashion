import { pino, type Logger, type LoggerOptions } from 'pino';

export type { Logger };

/**
 * Structured JSON logs to stdout (PLAN §24.1). Secrets and contact details are redacted
 * wherever they appear in logged objects.
 */
export function createLogger(options: { level: string; pretty?: boolean; name?: string }): Logger {
  const config: LoggerOptions = {
    name: options.name ?? 'auren-api',
    level: options.level,
    base: undefined,
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: { level: (label) => ({ level: label }) },
    redact: {
      paths: [
        'headers.authorization',
        'headers.cookie',
        'headers["set-cookie"]',
        '*.password',
        '*.token',
        '*.secret',
        '*.email',
        '*.phone',
      ],
      censor: '[redacted]',
    },
  };
  if (options.pretty) {
    config.transport = { target: 'pino-pretty', options: { colorize: true, singleLine: true } };
  }
  return pino(config);
}
