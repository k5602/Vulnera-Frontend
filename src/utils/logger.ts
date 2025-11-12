/**
 * Safe logging utility that redacts sensitive information
 * Use this instead of console.* to prevent accidental exposure
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class Logger {
  private isDev = import.meta.env.DEV;

  /**
   * Redact sensitive fields from objects
   */
  private sanitize(data: any): any {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const sensitiveFields = [
      'token',
      'password',
      'secret',
      'key',
      'auth',
      'apiKey',
      'api_key',
      'access_token',
      'refresh_token',
      'authorization',
      'cookie',
    ];

    if (Array.isArray(data)) {
      return data.map(item => this.sanitize(item));
    }

    return Object.entries(data).reduce((acc, [key, value]) => {
      const isSensitive = sensitiveFields.some(field =>
        key.toLowerCase().includes(field.toLowerCase())
      );

      if (isSensitive) {
        acc[key] = '***REDACTED***';
      } else if (typeof value === 'object' && value !== null) {
        acc[key] = this.sanitize(value);
      } else {
        acc[key] = value;
      }

      return acc;
    }, {} as any);
  }

  /**
   * Log a message with optional data
   */
  private log(level: LogLevel, message: string, data?: any): void {
    // Only log in development
    if (!this.isDev) return;

    const sanitizedData = this.sanitize(data);
    const fn = console[level] || console.log;
    const timestamp = new Date().toISOString();

    if (sanitizedData !== undefined) {
      fn(`[${timestamp}] [${level.toUpperCase()}] ${message}`, sanitizedData);
    } else {
      fn(`[${timestamp}] [${level.toUpperCase()}] ${message}`);
    }
  }

  debug(message: string, data?: any): void {
    this.log('debug', message, data);
  }

  info(message: string, data?: any): void {
    this.log('info', message, data);
  }

  warn(message: string, data?: any): void {
    this.log('warn', message, data);
  }

  error(message: string, data?: any): void {
    this.log('error', message, data);
  }
}

export const logger = new Logger();

