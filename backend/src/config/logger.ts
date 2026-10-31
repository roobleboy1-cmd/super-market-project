import winston from 'winston';

const SENSITIVE_KEYS = [
  'password',
  'passwordHash',
  'token',
  'refreshToken',
  'accessToken',
  'secret',
  'authorization',
  'cookie',
  'cardNumber',
  'cvv',
  'pin'
];

function redactSensitiveData(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(redactSensitiveData);

  const redacted: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (SENSITIVE_KEYS.some((sensitive) => key.toLowerCase().includes(sensitive.toLowerCase()))) {
      redacted[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      redacted[key] = redactSensitiveData(value);
    } else {
      redacted[key] = value;
    }
  }
  return redacted;
}

const redactFormat = winston.format((info) => {
  // Keep Winston's internal symbol properties intact while redacting values.
  Object.assign(info, redactSensitiveData(info));
  return info;
});

export const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    redactFormat(),
    winston.format.errors({ stack: true }),
    process.env.NODE_ENV === 'production'
      ? winston.format.json()
      : winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
          const metaString = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
          return `[${timestamp}] [${level.toUpperCase()}]: ${message}${metaString}${stack ? `\n${stack}` : ''}`;
        })
  ),
  transports: [
    new winston.transports.Console({
      silent: process.env.NODE_ENV === 'test'
    })
  ]
});
