import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'pulse-backend' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, ...metadata }) => {
          let metaStr = '';
          if (Object.keys(metadata).length && metadata.service) {
            delete metadata.service;
          }
          if (Object.keys(metadata).length) {
            metaStr = ` ${JSON.stringify(metadata)}`;
          }
          return `[${timestamp || new Date().toISOString()}] ${level}: ${message}${metaStr}`;
        })
      )
    })
  ]
});

// Middleware for logging HTTP requests
export const requestLogger = (req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`HTTP ${req.method} ${req.originalUrl}`, {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      durationMs: duration,
      ip: req.ip
    });
  });
  next();
};

export default logger;
