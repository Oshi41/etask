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
global.isObject = o => typeof o === 'object' && o != null && !isFunc(o) && !isArray(o);

global.isRefType = o => typeof o === 'object';
global.isPrimitive = o => !isRefType(o);

/**
 * Checks if an object implements the Symbol.dispose method (disposable pattern).
 *
 * This checks for compatibility with the ECMAScript Explicit Resource Management proposal,
 * which allows for deterministic cleanup of resources.
 *
 * @param {*} o - The object to check
 * @returns {boolean} - True if the object implements the dispose method, false otherwise
 */
global.isDisposable = o => isFunc(o?.[Symbol.dispose]);
