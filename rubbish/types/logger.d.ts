/**
 * Logger level types
 */
export type LogLevel = 'trace' | 'debug' | 'info' | 'log' | 'warn' | 'error';

/**
 * Provider options for the logger
 */
export interface LoggerProviders {
    /**
     * Enable console logging
     */
    console?: boolean;
}

/**
 * Enrichment options for log messages
 */
export interface LoggerEnrichOptions {
    /**
     * Date format string to include timestamp in logs
     * Set to false or empty string to disable
     */
    date?: string | false;

    /**
     * Include location information in logs
     * Set to false or empty string to disable
     */
    location?: 'stack' | false;
}

/**
 * Configuration options for the Logger
 */
export interface LoggerOptions {
    /**
     * Log levels to include
     * - 'any': Include all log levels
     * - 'none': Disable all logging
     * - Array of specific levels to include
     */
    levels?: 'any' | 'none' | LogLevel[];

    /**
     * Output providers configuration
     */
    providers?: LoggerProviders;

    /**
     * Enrichment options for log messages
     */
    enrich?: LoggerEnrichOptions;
}

/**
 * Logger class for structured logging with enrichment and multiple providers
 */
export class Logger {
    /**
     * Create a new logger instance
     * @param opts - Configuration options
     */
    constructor(opts?: Partial<LoggerOptions>);

    /**
     * Log trace level messages (lowest level).
     * @param messages - Any values to be logged
     * @returns The current instance for chaining
     */
    trace(...messages: any[]): this;

    /**
     * Log debug level messages.
     * @param messages - Any values to be logged
     * @returns The current instance for chaining
     */
    debug(...messages: any[]): this;

    /**
     * Log info level messages.
     * @param messages - Any values to be logged
     * @returns The current instance for chaining
     */
    info(...messages: any[]): this;

    /**
     * Log standard messages (equivalent to info in many systems).
     * @param messages - Any values to be logged
     * @returns The current instance for chaining
     */
    log(...messages: any[]): this;

    /**
     * Log warning messages.
     * @param messages - Any values to be logged
     * @returns The current instance for chaining
     */
    warn(...messages: any[]): this;

    /**
     * Log error messages (highest level).
     * @param messages - Any values to be logged
     * @returns The current instance for chaining
     */
    error(...messages: any[]): this;
}