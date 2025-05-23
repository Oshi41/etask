const refTypes = new Set(['function', 'object']);

/**
 * Determines whether the provided object is a function.
 *
 * @param {any} obj - The object to check.
 * @return {boolean} Returns true if the object is a function, otherwise false.
 */
export function isFunc(obj) {
    if (!obj) return false;

    return typeof obj === 'function'
        || obj instanceof Function
        || [obj?.apply, obj?.call].every(x => isFunc(x));
}

/**
 * Determines whether the provided value is a plain JavaScript object.
 *
 * A plain object is typically an object created using object literals
 * or the Object constructor, and not an instance of a custom class or derived objects.
 *
 * @param {any} o The value to be checked.
 * @return {boolean} Returns `true` if the value is a plain object; otherwise, returns `false`.
 */
export function isPlainObject(o) {
    return o != null && typeof o === 'object' && !isFunc(o) && !isArray(o);
}

/**
 * Determines if a given value is of a primitive data type.
 *
 * @param {any} o - The value to check.
 * @return {boolean} - Returns true if the value is a primitive type, false otherwise.
 */
export function isPrimitive(o) {
    return !o || !refTypes.has(typeof o);
}

export function tryDispose(obj) {
    const func = obj?.[Symbol.dispose] || obj?.[Symbol.disposeAsync];
    if (isFunc(func)) {
        func.call(obj);
        return true;
    }
}

/**
 * Checks if a given object is disposable.
 * An object is considered disposable if it is not a primitive,
 * contains a property with the symbol `Symbol.dispose`,
 * and the value of this property is a function.
 *
 * @param {any} o - The object to check for disposability.
 * @return {boolean} Returns true if the object is disposable, otherwise false.
 */
export function isDisposable(o) {
    const prop = Symbol.dispose;
    return !isPrimitive(o) && prop in o && isFunc(o[prop]);
}

/**
 * Determines if the given object is an iterator.
 *
 * @param {any} o The object to be checked.
 * @return {boolean} True if the object is an iterator; otherwise, false.
 */
export function isIterator(o) {
    const prop = Symbol.iterator;
    return !isPrimitive(o) && prop in o && isFunc(o[prop]);
}

/**
 * Checks if the provided object is an asynchronous iterator.
 *
 * @param {any} o The object to test if it is an asynchronous iterator.
 * @return {boolean} Returns true if the object is an asynchronous iterator, false otherwise.
 */
export function isAsyncIterator(o) {
    const prop = Symbol.asyncIterator;
    return !isPrimitive(o) && prop in o && isFunc(o[prop]);
}

/**
 * Determines whether the given function is a generator function.
 *
 * @param {Function} func - The function to be checked.
 * @return {boolean} Returns true if the provided function is a generator function, otherwise false.
 */
export function isGeneratorFunction(func) {
    return isFunc(func) && (function* () {
    }).constructor === func.constructor;
}

/**
 * Determines if the provided function is an async generator function.
 *
 * @param {Function} func The function to test.
 * @return {boolean} Returns `true` if the function is an async generator function, otherwise `false`.
 */
export function isAsyncGeneratorFunction(func) {
    return isFunc(func) && (async function* () {
    }).constructor === func.constructor;
}

/**
 * Determines whether a given function is an async function.
 *
 * @param {Function} func - The function to evaluate.
 * @return {boolean} Returns `true` if the input is an async function, otherwise `false`.
 */
export function isAsyncFunction(func) {
    return isFunc(func) && (async function () {
    }).constructor === func.constructor;
}

/**
 * Determines if the given object is an asynchronous disposable object.
 *
 * This method checks if the object is non-primitive, has a property
 * associated with the Symbol.dispose symbol, and that the property
 * is a function.
 *
 * @param {any} o - The object to be checked for asynchronous disposal capability.
 * @return {boolean} Returns true if the object satisfies the conditions for being asynchronously disposable, otherwise false.
 */
export function isAsyncDisposable(o) {
    const prop = Symbol.dispose;
    return !isPrimitive(o) && prop in o && isFunc(o[prop]);
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
 * Checks if the provided value is an array.
 *
 * @param {*} o - The value to check.
 * @return {boolean} True if the value is an array, otherwise false.
 */
export function isArray(o) {
    return Array.isArray(o);
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

