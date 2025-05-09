if (typeof global != 'object') {
    if (typeof window != 'undefined') {
        window.global = window;
    } else if (typeof globalThis != 'undefined') {
        globalThis.global = globalThis;
    } else if (typeof self != 'undefined') {
        self.global = self;
    }
}

/**
 * Determines if the provided object is a function.
 *
 * This utility checks using three different methods:
 * 1. typeof operator checking for 'function'
 * 2. instanceof Function check
 * 3. Existence of apply and call methods (function characteristics)
 *
 * @param {*} obj - The object to test
 * @returns {boolean} - True if the object is a function, false otherwise
 */
global.isFunc = function (obj) {
    if (!obj) return false;

    return typeof obj === 'function'
        || obj instanceof Function
        || [obj?.apply, obj?.call].every(x => isFunc(x));
};

/**
 * A shorthand for Array.isArray
 *
 * @param {*} arr - The value to check
 * @returns {boolean} - True if the value is an array, false otherwise
 */
global.isArray = Array.isArray;
global.assign = Object.assign;

/**
 * Determines if the provided value is a plain object.
 *
 * An object is considered "plain" when:
 * - It's typeof 'object'
 * - It's not null
 * - It's not a function
 * - It's not an array
 *
 * @param {*} o - The value to check
 * @returns {boolean} - True if the value is a plain object, false otherwise
 */
global.isPlainObject = function (o) {
    return o != null && typeof o === 'object' && !isFunc(o) && !isArray(o);
}

global.isPrimitive = function (o) {
    switch (typeof o) {
        case "function":
        case "object":
            return false;

        default:
            return true;
    }
}

/**
 * Checks if an object implements the Symbol.dispose method (disposable pattern).
 *
 * This checks for compatibility with the ECMAScript Explicit Resource Management proposal,
 * which allows for deterministic cleanup of resources.
 *
 * @param {*} o - The object to check
 * @returns {boolean} - True if the object implements the dispose method, false otherwise
 */
global.isDisposable = function (o) {
    const prop = Symbol.dispose;
    return !isPrimitive(o) && prop in o && isFunc(o[prop]);
}

global.isAsyncDisposable = function (o) {
    const prop = Symbol.asyncDispose;
    return !isPrimitive(o) && prop in o && isFunc(o[prop]);
}

/**
 * Returns current call location.
 * @param skip {number}
 * @returns {{
 *     file: string,
 *     class: string,
 *     function: string,
 *     file: string,
 *     line: number,
 *     column: number,
 * }}
 */
global.stackLocation = function stackLocation(skip = 0) {
    const prepare = Error.prepareStackTrace;
    const limit = Error.stackTraceLimit;

    Error.stackTraceLimit = 2 + skip;

    Error.prepareStackTrace = (_, stack) => {
        return stack.map(x => ({
            file: x.getEvalOrigin() || x.getFileName() || x.getFunctionName(),
            class: x.getTypeName(),
            function: x.getFunctionName() || x.getMethodName() || (x.isToplevel() && '<top_level>'),
            line: x.getLineNumber(),
            column: x.getColumnNumber(),
        }));
    }

    try {
        return new Error().stack.at(-1);
    } finally {
        Error.prepareStackTrace = prepare;
        Error.stackTraceLimit = limit;
    }
};

import log from "./log.mjs";
global.log = log

