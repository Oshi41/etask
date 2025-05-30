import {isFunc} from "./types.mjs";

export function tryDispose(obj) {
    const func = obj?.[Symbol.dispose] || obj?.[Symbol.disposeAsync];
    if (isFunc(func)) {
        func.call(obj);
        return true;
    }
}

/**
 * Extracts and returns the location of a specific call in the call stack.
 * This includes details such as file, class, function, line, and column.
 *
 * @param {number} [skip=0] - The number of stack frames to skip. Defaults to 0, meaning it provides the current frame location.
 * @return {Object} An object containing details about the stack location, including:
 * - `file` (string): The file name or function origin.
 * - `class` (string): The type name of the object.
 * - `function` (string): The function or method name.
 * - `line` (number): The line number in the file.
 * - `column` (number): The column number in the line.
 */
export function stackLocation(skip = 0) {
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
}

/**
 * Assigns properties from one or more source objects to a target object.
 * Properties in later objects will overwrite properties in earlier objects with the same key.
 *
 * @param {Object} o - The target object that will receive the properties.
 * @param {...Object} others - One or more source objects whose properties will be assigned to the target object.
 * @return {Object} The updated target object with combined properties.
 */
export function assign(o, ...others) {
    return Object.assign(o, ...others);
}

/**
 * Asserts that a given condition is true, throwing an error message to the console if the assertion fails.
 *
 * @param {boolean} condition - The condition to evaluate. If false, the assertion fails.
 * @param {string} errString - The error message to display in the console when the assertion fails.
 * @return {void} This function does not return a value.
 */
export function assert(condition, errString) {
    if (!condition) throw new Error(errString || 'error during assertion');
}

/**
 * Installs a globally accessible property with a dynamic getter on the global object.
 * The property is defined so that its value is determined by the provided getter function.
 *
 * @param {string} name - The name of the global property to define.
 * @param {Function} valueGetter - A function that returns the value of the global property when accessed.
 * @return {void} No return value.
 * @throws {Error} If the global object cannot be determined.
 */
export function installGlobal(name, valueGetter) {
    const _this = typeof global != 'undefined' && global
        || typeof self != 'undefined' && self
        || typeof globalThis != 'undefined' && globalThis
        || typeof window != 'undefined' && window;

    if (!_this) throw new Error('Global object not found');

    Object.defineProperty(_this, name, {
        get() {
            return valueGetter();
        }
    });
}

