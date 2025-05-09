import './proxy.mjs';
import './object.mjs';

const wrapSymbol = Symbol('function wrapper');
const Generator = Object.getPrototypeOf(function* () {
});
const AsyncGenerator = Object.getPrototypeOf(async function* () {
});

class Wrapper {
    static asAsyncGen(fn) {
        const proto = Object.getPrototypeOf(fn);

        if (Generator === proto || AsyncGenerator === proto) {
            return fn;
        }


    }

    #fn;
    #callbacks = {
        before: [],
        after: [],
        catch: [],
        finally: [],
    };
    #running = false;
    #mainFunctionGenerator = null;

    /**
     *
     * @param fn {Function}
     */
    constructor(fn) {
        this.#fn = fn;
    }


    get [wrapSymbol]() {
        return true;
    }
    get name() {
        return this.#fn?.name || 'anonymous';
    }
    get isRunning() {
        return this.#running;
    }

    before(callback) {
        isFunc(callback) && this.#callbacks.before.push(callback);
        return this;
    }
    than(resolve, reject) {
        isFunc(resolve) && this.#callbacks.after.push(resolve);
        isFunc(reject) && this.#callbacks.catch.push(reject);
        return this;
    }
    catch(callback) {
        isFunc(callback) && this.#callbacks.catch.push(callback);
        return this.than(null, callback);
    }
    finally(callback) {
        isFunc(callback) && this.#callbacks.finally.push(callback);
        return this;
    }



    async * #apply(thisArg, args) {
        this.#running = true;

        thisArg = Proxy.this(thisArg, this);

        try {
            this.#callbacks.before.map(x => x.asAsyncGenerator())

            this.#fn.call(thisArg, ...args);
        } catch (e) {

        } finally {

        }
    }

    async sleep(mls = 200) {
        const pwr = Promise.withResolvers();
        // Set up a timer to resolve the promise after the specified delay
        const timer = setTimeout(pwr.resolve, mls);
        // Ensure the timer is cleared when the promise is settled to prevent memory leaks
        return await pwr.promise.finally(() => clearTimeout(timer));
    }
}

Function.prototype.asAsyncGenerator = function asAsyncGenerator() {
    const orig = this;
    const proto = Object.getPrototypeOf(orig);
    if (Generator === proto || AsyncGenerator === proto) {
        return orig;
    }

    return async function* promiseWrapper(...args) {
        let res = yield orig.call(this, args);
        res = yield await res;
        return res;
    }
}

Function.wrap = function wrap(fn) {
    const state = {
        before: [],
        after: [],
        catch: [],
        finally: [],

        running: false,
    };

    const api = {
        get [wrapSymbol](){
            return true;
        },
        get name(){
            return fn?.name || 'anonymous';
        },
        get isRunning(){
            return !!state.running;
        },

        then(resolve, reject){
            if (typeof resolve == 'function')
                state.after.push(resolve);

            if (typeof reject == 'function')
                state.catch.push(resolve);

            return this;
        },
        catch(reject){
            return this.then(null, reject)
        },
        finally(callback){
            if (typeof callback == 'function')
                state.finally.push(callback);

            return this;
        },

        async sleep(mls){
            const pwr = Promise.withResolvers();
            // Set up a timer to resolve the promise after the specified delay
            const timer = setTimeout(pwr.resolve, mls);
            // Ensure the timer is cleared when the promise is settled to prevent memory leaks
            return await pwr.promise.finally(() => clearTimeout(timer));
        },
    };

    const result = async function * (...args) {
        state.running = true;

        try {
            for (let fn of state.before) {
                yield * fn.asAsyncGenerator().call(thisArg, args);
            }

            const res = yield * fn.asAsyncGenerator().call(thisArg, args);

            for (let fn of state.after) {
                yield * fn.asAsyncGenerator().call(thisArg, [res]);
            }

            return res;
        } catch (e) {
            if (!state.catch.length) throw e;

            for (let fn of state.catch) {
                yield * fn.asAsyncGenerator().call(thisArg, [e]);
            }
        } finally {
            for (let fn of state.finally) {
                yield * fn.asAsyncGenerator().call(thisArg, []);
            }
        }

        state.running = false;
    };

    Object.assign(result, api);

    return result;
}

/**
 *
 * @param fn {Function & Generator}
 * @this {Function & Generator}
 * @returns {Generator|AsyncGenerator}
 */
function generatorWrapper(fn) {
    const orig = this;
    const state = {before: [], after: [], catch: [], finally: []};

    const result = function* wrap(...args) {
        try {

        } catch (e) {

        } finally {

        }
    };
    return result;
}

/**
 * Creates a debounced version of the provided function that returns a Promise.
 * The debounced function will delay invoking the original function
 * until after the specified wait time has elapsed since the last invocation.
 *
 * @param {number} wait - The wait time in milliseconds
 * @returns {typeof this} - The debounced function that returns a Promise with the result
 */
Function.prototype.debounce = function debounce(wait = 250) {
    const func = this;
    let timer;
    return (...args) => {
        if (!timer) {
            func.apply(this, args);
        }

        clearTimeout(timer);
        timer = setTimeout(() => {
            timer = undefined;
        }, wait);
    };
};

/**
 * Creates wrapper from called function
 *
 * @returns {Function & {
 * before: (cb: Function) => this,
 * after: (cb: Function) => this,
 * catch: (cb: Function) => this,
 * finally: (cb: Function) => this,
 * }} */
Function.prototype.wrap = function wrap() {
    if (this.isWrapped()) return this;

    const orig = this;
    const state = {before: [], after: [], catch: [], finally: []};
    const create_fn = name => function (cb) {
        if (typeof cb === 'function')
            state[name].push(cb);

        return this;
    };
    const api = {
        after: create_fn('after'),
        catch: create_fn('catch'),
        finally: create_fn('finally')
    };

    const result = function (...args) {
        const thisArg = Proxy.this(this, api);

        try {
            state.before.forEach(fn => fn.apply(thisArg, args));
            const res = orig.apply(thisArg, args);
            state.after.forEach(fn => fn.apply(thisArg, [res]));
            return res;
        } catch (e) {
            if (state.catch.length == 0) throw e;

            state.catch.forEach(fn => fn.apply(thisArg, [e]));
        } finally {
            state.finally.forEach(fn => fn.apply(thisArg, []));
        }
    };

    Object.assign(result, api, {
        get [wrapSymbol]() {
            return true;
        },
        before: create_fn('before'),
    });

    return result;
}

/**
 * Creates wrapped function from provided once
 * @param fn
 * @returns {Function&{before: (function(Function): this), after: (function(Function): this), catch: (function(Function): this), finally: (function(Function): this)}}
 */
Function.wrap = fn => Function.prototype.wrap.apply(fn);

/**
 * Is current function was wrapped
 * @returns {boolean}
 */
Function.prototype.isWrapped = function isWrapped() {
    return this[wrapSymbol] === true;
}

/**
 * Creates a wrapped function that executes a provided callback before the original function.
 * This allows for pre-processing or side effects before the main function runs.
 *
 * @param {Function} fn - The function to execute before the original function
 * @returns {Function} - A new function that calls fn first, then the original function
 */
Function.prototype.before = function before(fn) {
    return this.wrap().before(fn);
}

/**
 * Creates a wrapped function that executes a provided callback after the original function.
 * This allows for post-processing or side effects after the main function runs.
 *
 * @param {Function} fn - The function to execute after the original function
 * @returns {Function} - A new function that calls the original function first, then fn
 */
Function.prototype.after = function before(fn) {
    return this.wrap().after(fn);
}

/**
 * Creates a wrapped function that catches any exceptions thrown by the original function
 * and passes them to a provided error handling callback.
 *
 * @param {Function} fn - The error handling function to call if an exception occurs
 * @returns {Function} - A new function that executes the original function inside a try-catch block
 */
Function.prototype.catch = function onCatch(fn) {
    return this.wrap().catch(fn);
}

/**
 * Creates a wrapped function that guarantees a callback is executed after the original function,
 * whether it succeeds or throws an exception, similar to a try-finally block.
 *
 * @param {Function} fn - The function to execute in the finally block
 * @returns {Function} - A new function that executes the original function inside a try-finally block
 */
Function.prototype.finally = function onFinally(fn) {
    return this.wrap().finally(fn);
}

/**
 * Creates a wrapped function that executes only once, regardless of how many times it is called.
 * Subsequent calls after the first one will have no effect and return undefined.
 *
 * @returns {Function} - A new function that executes the original function at most once
 */
Function.prototype.once = function once() {
    const orig = this;
    let called = false;
    return function (...args) {
        if (called) return;
        called = true;
        return orig.apply(this, args);
    };
}


