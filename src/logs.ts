import winston from "winston";
import DailyRotateFile from 'winston-daily-rotate-file';
const path = require('path');
const env = process.env.NODE_ENV || 'development';
const logDir = 'logs';

export default class Logs {
  private dailyRotateFileTransport = new DailyRotateFile({
    filename: `${logDir}/%DATE%-results.log`,
    datePattern: 'YYYY-MM-DD',
    maxFiles: '14d'                         // เก็บไฟล์ล็อกสูงสุด 14 วัน
  });

  private logger = winston.createLogger({
    // change level if in dev environment versus production
    level: env === 'development' ? 'debug' : 'info',
    format: winston.format.combine(
      winston.format.label({ label: path.basename(process.mainModule?.filename || 'Main Module') }),
      winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss'
      }),
      winston.format.json(),
      // winston.format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`)
    ),
    transports: [
      new winston.transports.Console({
        level: 'info',
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.printf(
            info => `${info.timestamp} ${info.level} [${info.label}]: ${info.message}`
          )
        )
      }),
      this.dailyRotateFileTransport,
    ]
  });

  constructor () {

  }

  public info(message : string,body ?: any): void {
    this.logger.info(message || "INFO",{
      timestamp: new Date().toISOString(),
      ...body
    });
  }

  public error(message : string,body ?: any): void {
    this.logger.error(message || "ERROR",{
      timestamp: new Date().toISOString(),
      ...body
    });
  }

  public debug(message : string,body ?: any): void {
    this.logger.debug(message || "DEBUG",{
      timestamp: new Date().toISOString(),
      ...body
    });
  }

  public warn(message : string,body ?: any): void {
    this.logger.warn(message || "WARN",{
      timestamp: new Date().toISOString(),
      ...body
    });
  }

  public verbose(message : string,body ?: any): void {
    this.logger.verbose(message || "VERBOSE",{
      timestamp: new Date().toISOString(),
      ...body
    });
  }

  public silly(message : string,body ?: any): void {
    this.logger.silly(message || "SILLY",{
      timestamp: new Date().toISOString(),
      ...body
    });
  }

}