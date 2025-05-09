/**
 * Logging System Module
 *
 * This module implements an event-based logging system with customizable appenders.
 * It extends the functionality of the standard console with more structured logging
 * capabilities, thread tracking, timestamps, and custom formatting.
 */
import './global.mjs'; // Import global extensions
import './date.mjs'; // Import date formatting extensions
import {AsyncEventTarget} from './events.js'; // Import event handling functionality
import {getThread, isBrowser, isNode} from './env.mjs'; // Import environment utilities

// Save original console methods to preserve them
const _console = {...console};

/**
 * Creates a standardized log event object
 *
 * @param {string} level - The logging level (debug, info, log, warn, error)
 * @param {Object} location - Location information about where the log was triggered
 * @param {Array} messages - Array of messages or objects to log
 * @returns {Object} A structured log event object with metadata
 */
function LogEvent(level, location, messages) {
    return {
        timestamp: new Date(),          // When the event occurred
        thread: getThread(),            // Which thread generated the event
        location,                       // Where in the code the event was triggered
        messages,                       // The actual log message content
        level,                          // The severity level of the log
    }
}

/**
 * Creates a log appender function that processes log events
 *
 * An appender is responsible for formatting and outputting log events to a destination
 * (console, file, network, etc.). It can filter events by log level and customize
 * the rendering of the log message.
 *
 * @param {string} name - Unique identifier for the appender
 * @param {string[]} levels - Array of log levels this appender should handle
 * @param {Function} render - Function that formats the log event into an array for output
 * @param {Function} flush - Function that sends the formatted log data to its destination
 * @returns {Function} An event handler function with appender properties
 */
function Appender(name, levels = null, render = null, flush = null) {

    // Default to all standard log levels if none provided
    levels ??= ['debug', 'info', 'log', 'warn', 'error'];

    // Default render function formats the log with timestamp, level, thread, and location
    render ??= function render(evt) {
        const result = [];

        // In non-browser environments, include timestamp and log level
        if (!isBrowser()) {
            result.push(
                evt.timestamp.format('yyyy-MMM-dd HH:mm:ss.fff'),
                evt.level.toUpperCase().padEnd(5, ' '),
            );
        }

        // Add context information to all environments
        result.push(
            evt.thread,
            `${evt.location.line}:${evt.location.column}`,
            `${evt.location.function}():`
        );

        // Return formatted prefix followed by the original messages
        return [result.join(' | '), ...evt.messages];
    };

    // Default flush function doesn't do anything - implementers should override this
    flush ??= function flush(arr) {
        // ignored
    };

    /**
     * Event handler function that processes log events
     * @param {CustomEvent} evt - The log event to process
     */
    const handle = async function handle(evt) {
        // Skip events that don't match this appender's configured levels
        if (typeof evt?.detail?.level != 'string' || !levels.includes(evt.detail.level)) return;

        // Render the event into a formatted array
        const arr = await render(evt.detail);
        // Send the formatted output to the destination
        await flush(evt.detail, arr);
    };

    // Add properties to the handler function for configuration access
    Object.assign(handle, {
        // Getter for the appender name
        get appenderName() {
            return name;
        },
        // Iterator for the supported log levels
        get levels() {
            return levels[Symbol.iterator]();
        },
        // Setter to update supported log levels
        set levels(val) {
            console.assert(Array.isArray(val));
            levels = [...val];
        },
    });

    return handle;
}

/**
 * Main logging class that manages appenders and dispatches log events
 *
 * This class provides methods for the different log levels and manages
 * the collection of appenders that handle the actual logging output.
 */
export class EventLog {
    // Store appenders in a private map by name
    #appenders = new Map();
    // Event target for dispatching log events
    #events = new AsyncEventTarget();

    /**
     * Adds a new appender to the logging system
     *
     * @param {string} name - Unique identifier for the appender
     * @param {string[]} levels - Array of log levels this appender should handle
     * @param {Function} render - Function that formats the log event
     * @param {Function} flush - Function that outputs the formatted log data
     */
    addAppender(name, levels, render, flush) {
        // Remove any existing appender with the same name
        this.removeAppender(name);

        // Create and register the new appender
        const appender = new Appender(name, levels, render, flush);
        this.#events.addEventListener('log', appender);
        this.#appenders.set(name, appender);
    }

    /**
     * Removes an appender by name
     *
     * @param {string} name - The name of the appender to remove
     */
    removeAppender(name) {
        const appender = this.#appenders.get(name);
        this.#appenders.delete(name);
        if (appender) {
            this.#events.removeEventListener('log', appender);
        }
    }

    /**
     * Internal method to create and dispatch a log event
     *
     * @param {string} level - The log level
     * @param {Array} args - The log message arguments
     * @private
     */
    #rise_event(level, args) {
        const _ = this.#events.dispatchEvent(new CustomEvent('log', {
            cancelable: true,
            bubbles: true,
            detail: LogEvent(level, stackLocation(2), args),
        }));
    }

    /**
     * Logs a debug message
     *
     * @param {...any} args - Items to log
     */
    debug(...args) {
        this.#rise_event('debug', args);
    }

    /**
     * Logs an informational message
     *
     * @param {...any} args - Items to log
     */
    info(...args) {
        this.#rise_event('info', args);
    }

    /**
     * Logs a standard message
     *
     * @param {...any} args - Items to log
     */
    log(...args) {
        this.#rise_event('log', args);
    }

    /**
     * Logs a warning message
     *
     * @param {...any} args - Items to log
     */
    warn(...args) {
        this.#rise_event('warn', args);
    }

    /**
     * Logs an error message
     *
     * @param {...any} args - Items to log
     */
    error(...args) {
        this.#rise_event('error', args);
    }
}


export const flushers = {
    /**
     *
     * @returns {(e: LogEvent, rendered: []) => void}
     */
    create4console: () => function flush(evt, rendered) {
        _console[evt.level]?.(...rendered);
    },
}

if (isNode()) {
    const fs = await import('fs/promises');

    flushers.create4file = function (fileNamePattern) {
        return async function flush(evt, rendered) {
            const actualFile = evt.timestamp.format(fileNamePattern);
            try {
                await fs.appendFile(actualFile, rendered.join('\n'), 'utf8');
            } catch (e) {
                console.error(e);
            }
        };
    };
}

const log = new EventLog();
log.addAppender('console', null, null, flushers.create4console());
export default log;