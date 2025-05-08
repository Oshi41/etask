export function isNode() {
    return typeof process !== 'undefined';
}

export function isBrowser() {
    return typeof window !== 'undefined' && typeof document !== 'undefined';
}

export function isMobileDevice() {
    if (typeof screen != 'undefined' && screen.orientation) return true;

    if (typeof navigator != 'undefined' && navigator.maxTouchPoints > 1) return true;
}

export function isInTests() {
    // mocha interface
    if (typeof before == 'function' && typeof it == 'function' && typeof after == 'function') return true;
}

let thread = 'main';

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