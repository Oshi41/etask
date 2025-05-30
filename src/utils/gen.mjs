import {isAsyncIterable, isAsyncIterator, isFunc, isIterable, isIterator, isPromiseLike} from "./types.mjs";

/**
 * Convert various input types to generators
 * @param obj
 * @returns {AsyncGenerator}
 */
export const any2asyncGen = function (obj) {
    if (isAsyncIterator(obj)) return obj[Symbol.asyncIterator]();

    if (isIterator(obj)) return obj[Symbol.iterator]();

    if (isAsyncIterable(obj)) return async function* asyncIterable2gen() {
        let result;

        for await (let step of obj) {
            yield step;
            result = step;
        }

        return result;
    }();

    if (isIterable(obj)) return async function* iterable2gen() {
        let result;

        for (let step of obj) {
            yield step;
            result = step;
        }

        return result;
    }();

    if (isPromiseLike(obj)) return async function* promise2gen() {
        return yield obj;
    }();

    if (isFunc(obj)) return async function* func2Gen() {
        return yield obj();
    }();
}

/**
 *
 * @param gen {AsyncGenerator}
 * @yield {{done, value, error}}
 */
export async function* safe(gen) {
    let step;

    while (!step?.done) {
        try {
            step = await gen.next(step?.value);
        } catch (e) {
            step = {done: true, error: e};
        }

        if (step?.error || !step?.done)
            yield step;
    }
}

/**
 *
 * @param gen {AsyncGenerator}
 * @yield {{done, value, error}}
 */
export async function* recursive(gen) {
    let step;

    for await (step of gen) {
        if (step.error) {
            return step;
        }

        const inner = any2asyncGen(step?.value);
        if (inner) {
            yield* recursive(safe(inner));
            continue;
        }

        if (!step?.done)
            yield step;
    }

    return step;
}

/**
 *
 * @param gen {AsyncGenerator}
 * @returns {Promise<*|{done}>}
 */
export async function promisify(gen) {
    let step;

    for await (step of gen) {
        if (step?.done)
            return step;
    }

    return step;
}