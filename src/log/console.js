import {isBrowser} from "../utils/env.mjs";
import {format} from "../utils/date.mjs";

/**
 * Handles the rendering of a message to the console with specific formatting.
 * Converts and formats message properties into a structured output based on the environment.
 *
 * @param {object} e - The event object containing the message and associated metadata to be processed and rendered.
 *                      This object includes properties like `payload`, which contains message details such as
 *                      `timestamp`, `level`, `thread`, and `location`.
 *
 * @return {void} This function does not return a value.
 */
export function defaultConsoleRender(e) {
    e.handle();

    if (!isBrowser()) {
        e.payload.rendered.push(
            format(e.payload.message.timestamp, 'yyyy-MMM-dd HH:mm:ss.fff'),
            '|',
            e.payload.message.level.toUpperCase().padEnd(5, ' '),
            '|',
        );
    }

    e.payload.rendered.push(
        e.payload.message.thread,
        '|',
        `${e.payload.message.location.line}:${e.payload.message.location.column}`,
        '|',
        `${e.payload.message.location.function}():`
    );
}

/**
 * Handles the default flushing of a given event by logging its payload and executing its handler.
 *
 * @param {Object} e - The event object to be flushed.
 * @param {Object} e.payload - The payload of the event object.
 * @param {string} e.payload.level - The log level (e.g., "log", "error", "warn").
 * @param {Array} e.payload.rendered - The rendered output to be logged.
 * @param {Array} e.payload.args - Additional arguments for logging.
 * @param {Function} e.handle - The handler function to be executed.
 * @return {void} This function does not return a value.
 */
export function defaultConsoleFlusher(e) {
    console[e.payload.level](...e.payload.rendered, ...e.payload.args);
    e.handle();
}