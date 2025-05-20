/**
 * Checks if the runtime environment is Node.js\Deno\Bun by verifying the presence of the `process` object.
 *
 * @return {boolean} Returns true if the environment is Node.js, otherwise false.
 */
export function isNode() {
    return typeof process !== 'undefined';
}

/**
 * Determines if the current execution environment is a web browser (has access to DOM).
 *
 * @return {boolean} True if the code is running in a browser environment, false otherwise.
 */
export function isBrowser() {
    return typeof window !== 'undefined' && typeof document !== 'undefined';
}

/**
 * Detects whether the current device is likely a mobile device based on screen orientation
 * and touch points available in the navigator object.
 *
 * @return {boolean} Returns `true` if the device is identified as a mobile device, otherwise `false`.
 */
export function isMobileDevice() {
    if (typeof screen != 'undefined' && screen.orientation) return true;

    if (typeof navigator != 'undefined' && navigator.maxTouchPoints > 1) return true;
}

/**
 * Determines if the current environment is a testing environment.
 * This is inferred by checking the existence of commonly used
 * testing interface functions such as `before`, `it`, and `after`.
 *
 * @return {boolean} Returns `true` if the environment is identified
 *                   as a testing environment; otherwise, `false`.
 */
export function isInTests() {
    // mocha interface
    if (typeof before == 'function' && typeof it == 'function' && typeof after == 'function') return true;
}

let thread = 'main';

/**
 * Retrieves the current thread instance.
 *
 * @return {Object} The thread object representing the current thread.
 */
export function getThread() {
    return thread;
}

if (isNode()) {
    const {isMainThread, threadId} = await import('worker_threads').catch(e => ({isMainThread: true}));
    thread = isMainThread
        ? 'main'
        : threadId;
} else if (!isBrowser()) {
    thread = 'worker';
}