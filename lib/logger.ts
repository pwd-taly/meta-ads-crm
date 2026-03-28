import * as winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import * as path from 'path';
import * as fs from 'fs';

// Ensure log directory exists
const logDir = '/var/log/meta-ads-crm';
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Custom JSON format for structured logging
const jsonFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
  winston.format.json(),
  winston.format.printf((info) => {
    const base: Record<string, any> = {
      timestamp: info.timestamp,
      level: info.level,
      message: info.message,
    };
    // Include all additional metadata
    Object.keys(info).forEach((key) => {
      if (!['timestamp', 'level', 'message', 'splat', 'symbol'].includes(key)) {
        base[key] = info[key];
      }
    });
    return JSON.stringify(base);
  })
);

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: jsonFormat,
  transports: [
    // App logs (info and above)
    new DailyRotateFile({
      filename: path.join(logDir, 'app-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '100m',
      maxFiles: '30d',
      level: 'info',
    }),
    // Job-specific logs
    new DailyRotateFile({
      filename: path.join(logDir, 'jobs-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '100m',
      maxFiles: '30d',
      level: 'info',
    }),
    // Error logs (errors only)
    new DailyRotateFile({
      filename: path.join(logDir, 'errors-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '100m',
      maxFiles: '30d',
      level: 'error',
    }),
  ],
});

// Also log to console in development
if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(
          ({ level, message, timestamp }) =>
            `[${timestamp}] ${level}: ${message}`
        )
      ),
    })
  );
}

export default logger;
