import * as winston from 'winston';
import * as path from 'path';
import * as fs from 'fs';

const logDir = path.resolve(__dirname, '../../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const logFormat = winston.format.printf(({ level, message, timestamp }) => {
  const envTag = process.env.ENV ? `[${process.env.ENV.toUpperCase()}]` : '[QA]';
  return `${timestamp} ${envTag} [${level.toUpperCase()}]: ${message}`;
});

export const Logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    logFormat
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({ format: 'HH:mm:ss' }),
        logFormat
      )
    }),
    new winston.transports.File({
      filename: path.join(logDir, 'execution.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ]
});
