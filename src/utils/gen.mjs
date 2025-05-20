import {assert, isAsyncIterator, isFunc, isIterator} from './global.mjs'

const functions = {
    async: async function () {
    },
    gen: function* () {
    },
    asyncGen: async function* () {
    },
};

for (let [key, value] of Object.entries(functions)) {
    functions[key] = {
        constructor: value.constructor,
        prototype: Object.getPrototypeOf(value),
    };
}

/**
 * Checks if the given function is an asynchronous function or an asynchronous generator function.
 *
 * @param {Function} fn - The function to be checked.
 * @return {boolean} Returns true if the function is an asynchronous function or an asynchronous generator function, otherwise false.
 */
export function isAsyncFunction(fn) {
    return isFunc(fn) && fn?.constructor === functions.async.constructor || fn?.constructor === functions.asyncGen.constructor;
}

/**
 * Determines if the provided function is a generator function or an async generator function.
 *
 * @param {Function} fn - The function to check.
 * @return {boolean} Returns true if the provided function is a generator function or an async generator function, otherwise false.
 */
export function IsGenFunction(fn) {
    return isFunc(fn) && fn?.constructor === functions.gen.constructor || fn?.constructor === functions.asyncGen.constructor;
}

/**
 *
 * @param fn {Function}
 * @returns {AsyncGeneratorFunction}
 */
export function toAsyncGen(fn) {
    assert(isFunc(fn), 'fn must be a function')

    // already async generator
    if (IsGenFunction(fn) && isAsyncFunction(fn)) return fn;

    if (IsGenFunction(fn)) return async function* asyncGen(...args) {
        return yield* fn.apply(this, args);
    };

    return async function* asyncGen(...args) {
        const res = fn.apply(this, args);
        yield res;
        return res;
    };
}

/**
 * Wraps an iterator or async iterator, safely advancing it and yielding each step,
 * ensuring any encountered errors are handled and yielded as part of the output.
 *
 * @param {Iterator|AsyncIterator} gen - The generator, iterator, or async iterator to yield from.
 *                                       It must implement the appropriate `next` method or iterator interface.
 * @return {AsyncGenerator<{done?: boolean, error?: Error}, {value?: any, done?: boolean, error?: Error}>}
 *         An async generator that yields each step of the input iterator or async iterator,
 *         and properly includes any errors encountered during the iteration process.
 */
export async function* safeYield(gen) {
    const iter = isIterator(gen) && gen[Symbol.iterator]?.()
        || isAsyncIterator(gen) && gen[Symbol.asyncIterator]?.();

    let step = {};

    if (!iter) {
        step = {error: new Error('gen should implement iterator interface'), done: true};
    }

    while (!step.done) {
        try {
            step = yield gen.next(step.value);
        } catch (e) {
            step = {error: e, done: true};
        }
        yield step;
    }

    return step;
}