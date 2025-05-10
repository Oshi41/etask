import './proxy.mjs';
import './object.mjs';

const wrapSymbol = Symbol('function wrapper');
const Generator = Object.getPrototypeOf(function* () {
});
const AsyncGenerator = Object.getPrototypeOf(async function* () {
});
const AsyncFunction = Object.getPrototypeOf(async function () {
});

Object.defineProperties(Function.prototype, {
    isWrapped: {get: () => !!this?.[wrapSymbol],},
    isGen: {get: () => Object.getPrototypeOf(this) === Generator,},
    isAsyncGen: {get: () => Object.getPrototypeOf(this) === AsyncGenerator,},
    isAsync: {get: () => Object.getPrototypeOf(this) === AsyncFunction,},
});

/**
 *
 * @returns {() => Promise<*>}
 */
Function.prototype.promisifyGen = function () {
    const orig = this;
    const gen = this.isGen || this.isAsyncGen
        ? this
        : async function* _genWrapper(...args) {
            let res = yield orig.apply(this, args);
            res = yield await res;
            return res;
        };

    return async function promiseGen(...args) {
        let prev = undefined;
        for await (const step of gen.apply(this, args)) {
            prev = step;
        }
        return prev;
    };
};


/**
 *
 * @param fn {Function}
 * @returns {Function}
 */
function wrap(fn) {
    const state = {
        before: [],
        after: [],
        catch: [],
        finally: [],
        running: false,
    };
    const api = {
        before(callback) {
            isFunc(callback) && state.before.push(callback);
            return this;
        },
        then(resolve, reject) {
            isFunc(resolve) && state.after.push(resolve);
            isFunc(reject) && state.catch.push(reject);
            return this;
        },
        catch(callback) {
            return this.then(null, callback);
        },
        finally(callback) {
            isFunc(callback) && state.finally.push(callback);
            return this;
        },

        async sleep(mls = 200) {
            const pwr = Promise.withResolvers();
            // Set up a timer to resolve the promise after the specified delay
            const timer = setTimeout(pwr.resolve, mls);
            // Ensure the timer is cleared when the promise is settled to prevent memory leaks
            return await pwr.promise.finally(() => clearTimeout(timer));
        },
    };

    const createGenerator = async function* call(thisArg, args) {
        thisArg = Proxy.this(thisArg, api);

        try {
            state.before
                .map(x => x.asGen())
                .map(x => x.apply(thisArg, args));

            for (const fn of state.before)
                yield* fn.asGen().apply(thisArg, args);

            const res = yield* fn.asGen().apply(thisArg, args);

            for (const fn of state.after)
                yield* fn.asGen().call(thisArg, res);

            return res;
        } catch (e) {
            if (!state.catch.length) throw e;

            for (const fn of state.catch)
                yield* fn.asGen().apply(thisArg, [e]);

        } finally {
            for (const fn of state.finally)
                yield* fn.asGen().call(thisArg);
        }
    };


    const asyncCall = async function (...args) {
        state.running = true;
        const thisArg = Proxy.this(this, api);

        try {
            for (let fn of state.before) {
                for await (const step of fn.asGen().apply(thisArg, args)) {
                    // ignore result
                }
            }


            for (let fn of state.after) {
                for await (const step of fn.asGen().apply(thisArg, [])) {
                    // ignore result
                }
            }

        } catch (e) {

        } finally {

        }
    };

    Object.defineProperties(asyncCall, {
        name: {get: () => fn?.name || 'anonymous',},
        length: {get: () => fn?.length || 0,},
        [wrapSymbol]: {get: () => true,},
        isRunning: {get: () => state.running,},
    });

    return Object.assign(asyncCall, api);
}

Function.prototype.wrap = function () {
    return this?.isWrapped ? this : wrap(this);
}

const w = Function.wrap.call(async function* (num) {
    this.finally(() => console.log('finally'));
    this.then((ret) => console.log('then', ret));
    this.catch((err) => console.log('catch', err));

    console.log('here', ...arguments);

    yield 'hello';
    yield 12;
    yield this.sleep(300);

    throw new Error('error');

    return 12 + num;
});
w.before(() => console.log('before'));

w(2);

