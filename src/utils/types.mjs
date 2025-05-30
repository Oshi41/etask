const refTypes = new Set(['function', 'object']);
const _isFuncProperty = (o, prop) => !isPrimitive(o) && isFunc(o[prop]);
const _fullIteratorApi = (o, prop) => {

    if (isPrimitive(o)) return {};

    if (!isFunc(o[prop])) return {};

    const iter = o[prop]();

    return {
        iterable: isFunc(iter?.next),
        iterator: isFunc(iter?.throw) && isFunc(iter?.return),
    };
};
const functions = {
    async: async function () {
    },
    gen: function* () {
    },
    asyncGen: async function* () {
    },
};

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
 * Determines if a given value is of a primitive data type.
 *
 * @param {any} o - The value to check.
 * @return {boolean} - Returns true if the value is a primitive type, false otherwise.
 */
export function isPrimitive(o) {
    return !o || !refTypes.has(typeof o);
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
    return _isFuncProperty(o, Symbol.dispose);
}

/**
 * Checks if the given object has an asynchronous dispose method.
 *
 * @param {object} o - The object to check for asynchronous disposal capability.
 * @return {boolean} Returns true if the object has an async dispose property, otherwise false.
 */
export function isAsyncDisposable(o) {
    return _isFuncProperty(o, Symbol.asyncDispose);
}

/**
 * Checks whether the given object is iterable.
 *
 * @param {any} obj - The object to check for iterability.
 * @return {boolean} Returns true if the object is iterable, false otherwise.
 */
export function isIterable(obj) {
    const {iterable, iterator} = _fullIteratorApi(obj, Symbol.iterator);
    return iterable && !iterator;
}

/**
 * Determines if the given object is an iterator.
 *
 * @param {any} obj The object to be checked.
 * @return {boolean} True if the object is an iterator; otherwise, false.
 */
export function isIterator(obj) {
    const {iterable, iterator} = _fullIteratorApi(obj, Symbol.iterator);
    return iterable && iterator;
}

/**
 * Checks if the provided object is an asynchronous iterator.
 *
 * @return {boolean} Returns true if the object is an asynchronous iterator, false otherwise.
 * @param obj
 */
export function isAsyncIterator(obj) {
    const {iterable, iterator} = _fullIteratorApi(obj, Symbol.asyncIterator);
    return iterable && iterator;
}

/**
 * Determines if the given object is an asynchronous iterable.
 *
 * @param {any} obj - The object to check.
 * @return {boolean} True if the object is an async iterable, otherwise false.
 */
export function isAsyncIterable(obj) {
    const {iterable, iterator} = _fullIteratorApi(obj, Symbol.asyncIterator);
    return iterable && !iterator;
}

/**
 * Determines whether the given function is a generator function.
 *
 * @param {Function} func - The function to be checked.
 * @return {boolean} Returns true if the provided function is a generator function, otherwise false.
 */
export function isGeneratorFunction(func) {
    return isFunc(func) && func.constructor === functions.gen.constructor;
}

/**
 * Determines if the provided function is an async generator function.
 *
 * @param {Function} func The function to test.
 * @return {boolean} Returns `true` if the function is an async generator function, otherwise `false`.
 */
export function isAsyncGeneratorFunction(func) {
    return isFunc(func) && func.constructor === functions.asyncGen.constructor;
}

/**
 * Determines whether a given function is an async function.
 *
 * @param {Iterator} func - The function to evaluate.
 * @return {boolean} Returns `true` if the input is an async function, otherwise `false`.
 */
export function isAsyncFunction(func) {
    return isFunc(func) && func.constructor === functions.async.constructor;
}

/**
 * Checks whether the provided object is "promise-like", meaning it has a `then` method.
 *
 * @param {any} obj - The object to check for promise-like characteristics.
 * @return {boolean} Returns `true` if the object is promise-like, otherwise `false`.
 */
export function isPromiseLike(obj) {
    return isFunc(obj?.then);
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