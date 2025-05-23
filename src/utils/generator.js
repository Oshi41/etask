import {isFunc} from "./global.mjs";
import {once} from "./func.mjs";
import {proxyThis} from "./proxy.mjs";
import {sleep} from "./promise.mjs";

class SafeGenerator {
    #inner;

    //#region Private
    #pwr;
    #children = [];
    #timeline = {start: null, end: null};
    #run;

    constructor(generator) {
        this.#inner = generator;
        this.#children = [];
        this.#pwr = Promise.withResolvers();
        this.#timeline = {start: null, end: null};

        this.#run = once(async () => {
            let step;

            while (!this.isFinished) {
                step = await this.next(step?.value)
            }

            return step;
        });
    }

    get isFinished() {
        return !this.#inner && !this.#children.length;
    }

    async #onFinish({error, value} = {}) {
        // wash finisehd already
        if (this.#timeline.end) return {done: true};

        this.#timeline.end = Date.now();
        this.#inner = this.#children.length = 0;

        sleep(1).then(() => {
            if (error)
                return this.#pwr.reject(error);

            return this.#pwr.resolve(value);
        });

        return {done: true, error, value};
    }

    async #nextChild(child, ...args) {
        let step;

        try {
            step = await child.next(...args);
        } catch (e) {
            step = {done: true, error: e};
        } finally {
            if (step.done) {
                const i = this.#children.indexOf(child);
                if (i !== -1)
                    this.#children.splice(i, 1);
            }
        }

        // failed
        if (step.done && step.error)
            return await this.throw(step.error, true);

        // finished as last gen instruction
        if (step.done && !step.error && !this.#children.length && !this.#inner) {
            return this.#onFinish(step);
        }

        // returning child result
        return {...step, done: false};
    }

    //#endregion

    //#region Iterator

    async #it(name, ...args) {
        if (this.isFinished)
            return {done: true};

        let step;

        try {
            step = await this.#inner[name](...args);
        } catch (e) {
            step = {done: true, error: e};
        } finally {
            if (step?.done || step?.error) {
                this.#inner = null;
            }

            if (step?.error) {
                this.#children.length = 0;
            }
        }

        return step;
    }

    async next(...args) {
        if (!this.#timeline.start) this.#timeline.start = Date.now();

        if (this.#children.length) {
            return await this.#nextChild(this.#children[0], ...args);
        }

        if (this.#inner) {
            const step = await this.#it('next', ...args);
            if (step?.error)
                return this.#onFinish(step);

            const child = this.addChild(step?.value);
            if (!!child)
                return {done: false, value: child};

            // last instruction
            if (step.done && !this.#children.length && !this.#inner)
                return this.#onFinish(step);

            return {...step, done: false};
        }

        return {done: true};
    }

    async throw(error) {
        const step = this.#inner
            ? await this.#it('throw', error)
            : {done: true, error};

        return step?.done ? this.#onFinish(step) : step;
    }

    //#endregion

    //#region Promise

    async return(value) {
        const step = await this.#it('return', value);
        return step?.done
            ? this.#onFinish(step)
            : step;
    }

    then(resolve, reject) {
        this.#run();
        return this.#pwr.promise.then(resolve, reject);
    }

    catch(cb) {
        return this.then(null, cb);
    }

    finally(cb) {
        this.#run();
        return this.#pwr.promise.finally(cb);
    }

    before(gen) {
        const promise = this.addChild(gen);
        if (promise) {
            this.#run();
        }
        return promise;
    }

    //#endregion

    /**
     * Try to add task into working generator
     * .
     * @param value {SafeGenerator | Promise | Generator | AsyncGenerator | Iterable | AsyncIterable | Function | PromiseLike}
     * @returns {SafeGenerator|*}
     */
    addChild(value) {
        if (value instanceof SafeGenerator) {
            this.#children.unshift(value);
            return value;
        }

        if (isFunc(value?.[Symbol.asyncIterator])) {
            const gen = value[Symbol.asyncIterator]();
            return this.addChild(new SafeGenerator(gen));
        }

        if (isFunc(value?.[Symbol.iterator])) {
            const gen = value[Symbol.iterator]();
            return this.addChild(new SafeGenerator(gen));
        }

        if (isFunc(value?.then)) {
            const p = value;
            const gen = async function* promise2gen() {
                return yield p;
            }();
            return this.addChild(new SafeGenerator(gen));
        }
    }
}

/**
 *
 * @param func {Function | AsyncFunction | GeneratorFunction | AsyncGeneratorFunction}
 * @param opts {}
 * @returns {function(...[*]): SafeGenerator}
 */
export function e_gen(func, opts = {}) {
    if (!(this instanceof e_gen)) return new e_gen(func, opts);

    this.state = {
        callbacks: {before: [], after: [], catch: [], finally: []},
        calls: []
    };

    const _this = this;

    return function e_gen(...args) {
        const result = new SafeGenerator(null);
        const api = {
            before(cb) {
                return result.addChild(cb)
            },
            finally(cb) {
                return result.finally(cb);
            },
            then(resolve, reject) {
                return result.then(resolve, reject);
            },
            catch(cb) {
                return this.then(null, cb);
            },

            throw(e) {
                return result.throw(e);
            },
            return(value) {
                return result.return(value);
            },
        };
        const thisArg = proxyThis(this, api);

        for (let cb of _this.state.callbacks.before) {
            api.before(cb.apply(thisArg, args));
        }

        _this.state.callbacks.after.forEach(x => api.then(x));
        _this.state.callbacks.catch.forEach(x => api.catch(x));
        _this.state.callbacks.finally.forEach(x => api.finally(x));

        result.addChild(func.apply(thisArg, args));
        return result;
    };
}

e_gen.prototype.then = function (resolve, reject) {
    isFunc(resolve) && (this.state.callbacks.after ||= []) && this.state.callbacks.after.push(resolve);
    isFunc(reject) && (this.state.callbacks.catch ||= []) && this.state.callbacks.catch.push(reject);
    return this;
};
e_gen.prototype.catch = function (cb) {
    return this.then(null, cb);
};
e_gen.prototype.finally = function (cb) {
    isFunc(cb) && (this.state.callbacks.finally ||= []) && this.state.callbacks.finally.push(cb);
    return this;
}
e_gen.prototype.before = function (cb) {
    isFunc(cb) && (this.state.callbacks.before ||= []) && this.state.callbacks.before.push(cb);
    return this;
}


const run = e_gen(async function* () {
    this.finally(() => {
        console.log('finally');
    });

    this.catch(e => {
        console.log('catch', e);
    })

    console.log('here');

    throw new Error('error');

    return 54
});

run().then(console.log);