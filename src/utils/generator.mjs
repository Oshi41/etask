import {Timeline} from './timeline.mjs';
import {isAsyncIterable, isAsyncIterator, isFunc, isIterable, isIterator, isPromiseLike} from './types.mjs';

/**
 * Convert various input types to generators
 * @param obj
 * @returns {AsyncGenerator}
 */
const any2asyncGen = function (obj) {
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
 * Simple Safe Generator - never throws, returns errors in step objects
 * @yields {{done, value, error}}
 */
export class SafeGenerator {
    #state = {
        inner: null,
        retVal: {},
        timeline: new Timeline(),
        finished: false
    };

    constructor(obj) {
        this.#state.inner = any2asyncGen(obj);

        this.#state.timeline
            .mark('start')
            .mark('run')
            .mark('end');
    }

    get state() {
        if (!this.#state.timeline.mark('start').timestamp())
            return 'not_started';

        if (!this.#state.timeline.current)
            return 'stopped';

        switch (this.#state.timeline.current.name) {
            case 'start':
                return 'started';

            case 'run':
                return 'running';

            case 'end':
                return 'finished';
        }
    }

    get _retVal() {
        return this.#state.retVal;
    }

    get _gen() {
        return this.#state.inner;
    }

    _nextState() {
        this.#state.timeline.next();
    }

    async _run_fn(name, ...args) {
        switch (this.state) {
            case 'not_started':
            case 'started':
                this._nextState();
                return this._run_fn(name, ...args);

            case 'running':
                let step;
                try {
                    step = await this.#state.inner[name](...args);
                } catch (error) {
                    // Convert exception to error step
                    step = {done: true, error};
                }

                if (step?.done) {
                    this.#state.retVal = step;
                    this._nextState();
                }

                return step;

            case 'finished':
                this.#state.inner = null;
                this._nextState();
                return this._run_fn(name, ...args);

            case 'stopped':
                return this.#state.retVal || {done: true};
        }
    }

    /**
     * Safe next() - never throws, returns error in step
     */
    async next(...args) {
        return await this._run_fn('next', ...args);
    }

    /**
     * Safe throw() - never throws, returns error in step
     */
    async throw(error) {
        return await this._run_fn('throw', error);
    }

    /**
     * Safe return() - never throws, returns error in step
     */
    async return(value) {
        return await this._run_fn('return', value);
    }

    /**
     * Iterator protocol support
     */
    [Symbol.asyncIterator]() {
        return this;
    }

    async* map(fn) {
        let index = -1;
        let step;

        while (!step?.done) {

            if (!step?.done) {
                step = await this.next(step?.value);
                index++;
            }

            if (!step?.done) {
                const mapped = await fn(step, index);

                if (mapped?.error)
                    throw mapped.error;

                yield mapped?.value;
            }
        }
    }

    async* filter(fn) {
        const iterator = this[Symbol.asyncIterator]();
        let step;
        let i = -1;

        while (!step?.done) {
            step = await iterator.next(step?.value);
            i++;

            if (await fn(step, i)) {
                yield step.value;
            }
        }

        if (step?.error)
            throw step.error;
    }
}

/**
 * A class that extends SafeGenerator to provide functionality for resolving promises
 * based on the generator's execution flow. It supports chaining through `.then`, `.catch`,
 * and `.finally` like standard Promises.
 *
 * The `PromiseGenerator` class is designed to work with generator functions and ensures
 * that their execution can be awaited like a regular promise, providing seamless integration
 * for asynchronous workflows.
 *
 * Features:
 * - Automatically resolves or rejects the internal promise based on the generator's output.
 * - Supports chaining methods including `then`, `catch`, and `finally` to manage the promise state.
 * - Handles generator termination and resolves or rejects appropriately.
 *
 * Inherits:
 * - `SafeGenerator`: The parent class responsible for managing the generator's iteration state.
 *
 * Methods:
 * - `_run_fn`: Handles execution of generator methods such as `next`, `throw`, and `return`.
 *   This method ensures the internal promise is resolved or rejected based on generator execution.
 * - `then`: Allows chaining of actions after the promise resolves. Returns a new promise.
 * - `catch`: Handles errors by setting a rejection callback. Returns a new promise.
 * - `finally`: Adds a finalization callback that runs regardless of the resolution or rejection.
 */
export class PromiseGenerator extends SafeGenerator {
    #pwr = Promise.withResolvers();
    #running = false;

    constructor(gen) {
        super(gen);
    }

    async _run_fn(name, ...args) {
        if (this.state == 'finished') {
            return super._run_fn(name, ...args)
                .finally(() => {
                    if (this._retVal?.error)
                        this.#pwr.reject(this._retVal?.error);
                    else
                        this.#pwr.resolve(this._retVal?.value);
                });
        }

        return await super._run_fn(name, ...args);
    }

    #wait() {
        if (!this.#running) {
            this.#running = new Promise(async resolve => {
                try {
                    let step;
                    while (!step?.done) {
                        step = await this.next(step?.value);
                    }
                } finally {
                    resolve(this.state);
                }
            });
        }

        return this.#pwr.promise;
    }

    then(resolve, reject) {
        return this.#wait().then(resolve, reject);
    }

    catch(cb) {
        return this.then(null, cb);
    }

    finally(cb) {
        return this.#wait().finally(cb);
    }
}

export class RecursiveGenerator extends PromiseGenerator {
    /**
     * @type {RecursiveGenerator[]}
     */
    #children = [];

    constructor(gen) {
        super(gen);
    }

    get childrenCount() {
        return this.#children.length;
    }

    addChild(child) {
        child = any2asyncGen(child);
        if (!child) return;

        child = new RecursiveGenerator(child);
        child.finally(() => this.removeChild(child))

        this.#children.push(child);
        return child;
    }

    removeChild(child) {
        const index = this.#children.indexOf(child);
        if (index !== -1) {
            this.#children.splice(index, 1);
            return true;
        }
    }

    async _run_fn(name, ...args) {
        if (this.state == 'running' && this.#children.length) {
            const step = await this.#children[0][name](...args);

            if (step?.error)
                return this.throw(step.error);

            if (step?.done && !this.#children.length && !this._gen)
                return this.return(step.value);

            return {...step, done: false};
        }

        return await super._run_fn(name, ...args);
    }
}


//
// class SafeRunGenerator extends Iterator {
//     #state = {};
//
//     constructor(obj) {
//         super();
//
//         this.#state.inner = !isPrimitive(obj) && isFunc(obj?.[Symbol.iterator]) && obj[Symbol.iterator]()
//             || !isPrimitive(obj) && isFunc(obj?.[Symbol.asyncIterator]) && obj[Symbol.asyncIterator]()
//             || isFunc(obj?.then) && async function* promise2gen() {
//                 return yield obj;
//             }
//             || isFunc(obj) && async function* func2Gen() {
//                 return obj();
//             };
//
//         if (!this.#state.inner)
//             this.return(obj);
//     }
//
//     async return(value) {
//         const mark = this.timeline.current
//
//         switch (mark.name) {
//             case 'start':
//                 this.timeline.next()
//         }
//
//         switch (this.timeline.current) {
//             case 'start':
//                 this.timeline
//
//             case 'run':
//             case 'end':
//         }
//     }
//
//     next(...args) {
//         if (this.visit('start') || this.inRun('main')) {
//
//         }
//     }
// }

//
//
// /**
//  * Safely iterate through provided generator
//  */
// class SafeRunGenerator extends Iterator {
//     #state = {
//         timeline: {
//             start: null,
//             end: null,
//         },
//         retVal: {},
//         inner: null,
//     };
//
//     constructor(obj) {
//         super();
//
//         if (!isPrimitive(obj) && isFunc(obj?.[Symbol.iterator])) {
//             this.#state.inner = obj[Symbol.iterator]();
//         } else if (!isPrimitive(obj) && isFunc(obj?.[Symbol.asyncIterator])) {
//             this.#state.inner = obj[Symbol.asyncIterator]();
//         } else if (isFunc(obj?.then)) {
//             this.#state.inner = async function* promise2gen() {
//                 return yield obj;
//             };
//         } else if (isFunc(obj)) {
//             this.#state.inner = async function* func2Gen() {
//                 return obj();
//             };
//         } else {
//             this.return(obj);
//         }
//     }
//
//     get isStarted() {
//         return this.#state.timeline.start > 0;
//     }
//
//     get isFinished() {
//         return this.isStarted && this.#state.timeline.end > 0;
//     }
//
//     get isRunning() {
//         return this.isStarted && !this.isFinished;
//     }
//
//     async next(...args) {
//         if (this.isFinished) {
//             return {...this.#state.retVal, done: true};
//         }
//
//         let step;
//         if (!this.isStarted) {
//             this.#state.timeline.start = Date.now();
//         }
//
//         if (this.isRunning) {
//             try {
//                 step = await this.#state.inner.next(...args);
//             } catch (e) {
//                 step = {done: true, error: e};
//             }
//         }
//
//         if (step?.done) {
//             this.#state.timeline.end = Date.now();
//             this.#state.retVal = {step};
//             this.#state.inner = null;
//         }
//
//         return step;
//     }
//
//     async throw(e) {
//         if (this.isFinished) {
//             return this.#state.retVal;
//         }
//
//         let step;
//
//         if (this.isRunning) {
//             try {
//                 step = await this.#state.inner.throw(e);
//             } catch (e) {
//                 step = {done: true, error: e};
//             }
//         }
//
//         if (!this.isStarted) {
//             this.#state.timeline.start = Date.now();
//             step = {error: e, done: true};
//         }
//
//         if (step?.done) {
//             this.#state.timeline.end = Date.now();
//             this.#state.retVal = {...step};
//             this.#state.inner = null;
//         }
//
//         return step;
//     }
//
//     async return(value) {
//         if (this.isFinished) {
//             return this.#state.retVal;
//         }
//
//         let step;
//
//         if (this.isRunning) {
//             try {
//                 step = await this.#state.inner.return(value);
//             } catch (e) {
//                 step = {done: true, error: e};
//             }
//         }
//
//         if (!this.isStarted) {
//             this.#state.timeline.start = Date.now();
//             step = {value, done: true};
//         }
//
//         if (step?.done) {
//             this.#state.timeline.end = Date.now();
//             this.#state.retVal = {...step};
//             this.#state.inner = null;
//         }
//
//         return step;
//     }
// }
//
// class ChainGenerator extends SafeRunGenerator {
//     #state = {
//         children: [],
//         current: null,
//         retVal: {},
//         timeline: {
//             start: null,
//             end: null,
//         },
//     };
//
//     constructor() {
//         super();
//
//         /**
//          * Running children
//          * @type {SafeRunGenerator[]}
//          */
//         this.children = [];
//     }
//
//
// }
//
// class SafeGenerator {
//     constructor(generator) {
//         this.#state.gens.inner = generator;
//
//         this.#state.stages = [];
//     }
//
//     //#region Stata managing
//
//     #stage(name, priority) {
//         const children = [];
//         const timeline = {start: null, end: null};
//
//         return {
//             get name() {
//                 return name;
//             },
//             get priority() {
//                 return priority;
//             },
//
//
//             get isStarted() {
//                 return timeline.start > 0;
//             },
//             get isRunning() {
//                 return this.isStarted && !this.isFinished;
//             },
//             get isFinished() {
//                 return this.isStarted && timeline.end > 0;
//             },
//
//             add(gen) {
//                 children.push(gen);
//                 return gen;
//             },
//             remove(gen) {
//                 const index = children.indexOf(gen);
//                 if (index !== -1) {
//                     children.splice(index, 1);
//                     return true;
//                 }
//             },
//
//
//             next(...args) {
//
//             },
//         };
//     }
//
//     #setError(error, priority = 0) {
//         if (this.#state.timeline.end > 0)
//             return {skip: 'already finished'};
//
//         if (priority < this.#state.retVal.priority)
//             return {skip: 'cannot override higher priority error'};
//
//         this.#state.retVal = {error, priority};
//
//         // remove regular handlers
//         this.#state.gens.before.concat(this.#state.gens.after).forEach(x => this.removeChild(x));
//
//         // was not visited error yet
//         if (!this.#state.timeline.err) {
//             this.#state.timeline.err = Date.now();
//         } else {
//             // clear catch handlers if error occurred in catch stage
//             this.#state.gens.catch.forEach(x => this.removeChild(x));
//         }
//
//         return {
//             done: this.#state.gens.catch.length || this.#state.gens.finally.length,
//         };
//     }
//
//     #setValue(value, priority = 0) {
//         if (this.#state.timeline.end > 0)
//             return {skip: 'already finished'};
//
//         this.addChild(value);
//
//         if (priority < this.#state.retVal.priority)
//             return {skip: 'cannot override higher priority error'};
//
//         this.#state.retVal = {value, priority};
//
//         return {
//             done: !(this.#state.gens.before.length
//                 || this.#state.gens.inner
//                 || this.#state.gens.after.length
//                 || this.#state.gens.finally.length),
//         };
//     }
//
//     get #currentStage() {
//         if (!this.#state.timeline.start) return 'not_started';
//
//         if (this.#state.timeline.start > 0
//             && !this.hasError
//             && this.#state.gens.before.length) {
//             return 'before';
//         }
//
//         if (this.#state.timeline.start > 0
//             && !this.hasError
//             && this.#state.gens.before.length) {
//             return 'before';
//         }
//
//     }
//
//     //#endregion Stata managing
//
//     //#region Private
//
//     #state = {
//         timeline: {start: null, err: null, end: null,},
//         retVal: {priority: Number.MIN_VALUE},
//         gens: {
//             before: [],
//             after: [],
//             catch: [],
//             finally: [],
//             inner: null,
//         },
//     };
//
//     get hasError() {
//         return !!this.#state.retVal.error;
//     }
//
//     get isFinished() {
//         return this.#state.timeline.end > 0;
//     }
//
//     get #nextGenerator() {
//         const {gens, retVal, timeline} = this.#state;
//
//         // managing timeline dates
//         if (!timeline.start) {
//             timeline.start = Date.now();
//         } else if (this.hasError && !timeline.err) {
//             timeline.err = Date.now();
//         }
//
//         if (this.hasError) {
//             if (!timeline.err) {
//                 timeline.err = Date.now();
//             } else {
//                 gens.catch.forEach(gen => this.removeChild(gen));
//             }
//         }
//
//         if (!this.hasError) {
//             return gens.before.at(0)
//                 || gens.inner
//                 || ('value' in retVal && gens.after.at(0))
//         }
//     }
//
//
//     async #onGenerationFinished({error, value} = {}) {
//         // wash finisehd already
//         if (this.#timeline.end)
//             return {done: true};
//
//         this.#timeline.end = Date.now();
//         this.#inner = this.#children.length = 0;
//
//         try {
//             return {done: true, error, value};
//         } finally {
//             if (error)
//                 this.#pwr.reject(error);
//             else
//                 this.#pwr.resolve(value);
//         }
//     }
//
//     async #nextChild(child, ...args) {
//         let step;
//
//         try {
//             step = await child.next(...args);
//         } catch (e) {
//             step = {done: true, error: e};
//         } finally {
//             if (step.done) {
//                 const i = this.#children.indexOf(child);
//                 if (i !== -1)
//                     this.#children.splice(i, 1);
//             }
//         }
//
//         // failed
//         if (step.done && step.error)
//             return await this.throw(step.error, true);
//
//         // finished as last gen instruction
//         if (step.done && !step.error && !this.#children.length && !this.#inner) {
//             return this.#onGenerationFinished(step);
//         }
//
//         // returning child result
//         return {...step, done: false};
//     }
//
//     //#endregion
//
//     //#region Iterator
//
//     #nextGenerator() {
//         // no error, not finished, has any high priority children
//         if (!this.#state.retVal.error && this.#innerGenerators.children.length && !this.#state.timeline.end) {
//             return [this.#innerGenerators.children[0], 'before'];
//         }
//
//         // no error, main generator exists and hasn't run yet
//         if (!this.#state.retVal.error && this.#innerGenerators.inner) {
//             return [this.#innerGenerators.inner, 'main'];
//         }
//
//         // no error, main was run and has return value, run after handlers
//         if (!this.#state.retVal.error && this.#innerGenerators.after.length && 'value' in this.#state.retVal) {
//             return [this.#innerGenerators.after[0], 'after'];
//         }
//
//         // error occurred, can call catch handlers
//         if (!!this.#state.retVal.error && this.#innerGenerators.catch.length) {
//             return [this.#innerGenerators.catch[0], 'catch'];
//         }
//
//         // finally handlers always run if available
//         if (this.#innerGenerators.finally.length) {
//             return [this.#innerGenerators.finally[0], 'finally'];
//         }
//
//         // no more generators to run
//         return null;
//
//     }
//
//     async #it(name, ...args) {
//         const [gen, stage] = this.#nextGenerator() || [];
//         if (!gen)
//             return {done: true, ...this.#state.retVal};
//
//         let step;
//         try {
//             step = await gen[name](...args);
//         } catch (e) {
//             step = {done: true, error: e};
//         }
//
//         // not finished yet - return step as is
//         if (!step?.done)
//             return step;
//
//         // handle completed generator based on stage
//         if (this.#innerGenerators.inner === gen) {
//             // main generator finished
//             this.#innerGenerators.inner = null;
//             if (step.error) {
//                 this.#state.retVal = {error: step.error};
//             } else {
//                 this.#state.retVal = {value: step.value};
//             }
//         } else {
//             // remove completed generator from appropriate array
//             for (let arr of [this.#innerGenerators.children,
//                 this.#innerGenerators.after,
//                 this.#innerGenerators.catch,
//                 this.#innerGenerators.finally]) {
//
//                 let index = arr.indexOf(gen);
//                 if (index !== -1) {
//                     arr.splice(index, 1);
//                     break;
//                 }
//             }
//
//             // handle errors from catch stage
//             if (step.error && stage === 'catch') {
//                 this.#state.retVal = {error: step.error};
//                 // clear remaining catch handlers as they couldn't handle the error
//                 this.#innerGenerators.catch.length = 0;
//             }
//         }
//
//
//         return step;
//     }
//
//     async next(...args) {
//         if (!this.#timeline.start) this.#timeline.start = Date.now();
//
//         if (this.#children.length) {
//             return await this.#nextChild(this.#children[0], ...args);
//         }
//
//         if (this.#inner) {
//             const step = await this.#it('next', ...args);
//             if (step?.error)
//                 return this.#onGenerationFinished(step);
//
//             const child = this.addChild(step?.value);
//             if (!!child)
//                 return {done: false, value: child};
//
//             // last instruction
//             if (step.done && !this.#children.length && !this.#inner)
//                 return this.#onGenerationFinished(step);
//
//             return {...step, done: false};
//         }
//
//         return {done: true};
//     }
//
//     async throw(error) {
//         const step = this.#inner
//             ? await this.#it('throw', error)
//             : {done: true, error};
//
//         return step?.done ? this.#onGenerationFinished(step) : step;
//     }
//
//     //#endregion
//
//     //#region Promise
//
//     async return(value) {
//         const step = await this.#it('return', value);
//         return step?.done
//             ? this.#onGenerationFinished(step)
//             : step;
//     }
//
//     then(resolve, reject) {
//         const pwr = Promise.withResolvers();
//         if (isFunc(resolve)) {
//             const state = this.#state;
//             const gen = new SafeGenerator(async function* onThan() {
//                 try {
//                     return yield resolve(state.retVal.value);
//                 } finally {
//                     pwr.resolve(state.retVal?.value);
//                 }
//             });
//             this.#innerGenerators.after.push(gen);
//         }
//
//         if (isFunc(reject)) {
//             const state = this.#state;
//             const gen = new SafeGenerator(async function* onCatch() {
//                 try {
//                     return yield resolve(state.retVal.error);
//                 } finally {
//                     pwr.resolve(state.retVal?.error);
//                 }
//             });
//             this.#innerGenerators.catch.push(gen);
//         }
//
//         return pwr.promise;
//     }
//
//     catch(cb) {
//         return this.then(null, cb);
//     }
//
//     finally(cb) {
//         if (isFunc(cb)) {
//             const gen = new SafeGenerator(async function* onThan() {
//                 return yield cb();
//             });
//             this.#innerGenerators.finally.push(gen);
//             return gen;
//         }
//     }
//
//     before(gen) {
//         return this.addChild(gen);
//     }
//
//     //#endregion
//
//     /**
//      * Try to add task into working generator
//      * .
//      * @param value {SafeGenerator | Promise | Generator | AsyncGenerator | Iterable | AsyncIterable | Function | PromiseLike}
//      * @returns {SafeGenerator|*}
//      */
//     addChild(value) {
//         if (value instanceof SafeGenerator) {
//             this.#innerGenerators.children.push(value);
//             return value.wait();
//         }
//
//         if (!isPrimitive(value) && isFunc(value?.[Symbol.asyncIterator])) {
//             const gen = value[Symbol.asyncIterator]();
//             return this.addChild(new SafeGenerator(gen));
//         }
//
//         if (!isPrimitive(value) && isFunc(value?.[Symbol.iterator])) {
//             const gen = value[Symbol.iterator]();
//             return this.addChild(new SafeGenerator(gen));
//         }
//
//         if (isFunc(value?.then)) {
//             const p = value;
//             const gen = async function* promise2gen() {
//                 return yield p;
//             }();
//             return this.addChild(new SafeGenerator(gen));
//         }
//
//         if (isFunc(value)) {
//             return this.addChild(new SafeGenerator(function* func2Gen() {
//                 return value();
//             }()));
//         }
//     }
//
//     removeChild(gen) {
//         if (gen) {
//             'before after catch finally'.split(' ').forEach(prop => {
//                 const arr = this.#state.gens[prop];
//                 let index = arr?.indexOf?.(gen);
//                 if (index !== -1) {
//                     arr.splice(index, 1);
//                     return prop;
//                 }
//             });
//         }
//     }
//
//     async wait() {
//         let step;
//
//         while (!this.isFinished) {
//             step = await this.next(step?.value)
//         }
//
//         return step?.value;
//     }
// }
//
// /**
//  *
//  * @param func {Function | AsyncFunction | GeneratorFunction | AsyncGeneratorFunction}
//  * @param opts {}
//  * @returns {function(...[*]): SafeGenerator}
//  */
// export default function e_gen(func, opts = {}) {
//     const state = {
//         callbacks: {before: [], after: [], catch: [], finally: []},
//         calls: []
//     };
//
//     const result = function e_gen(...args) {
//         const result = new SafeGenerator(null);
//         const api = {
//             before(cb) {
//                 return result.addChild(cb)
//             },
//             finally(cb) {
//                 return result.finally(cb);
//             },
//             then(resolve, reject) {
//                 return result.then(resolve, reject);
//             },
//             catch(cb) {
//                 return this.then(null, cb);
//             },
//
//             throw(e) {
//                 return result.throw(e);
//             },
//             return(value) {
//                 return result.return(value);
//             },
//         };
//         const thisArg = proxyThis(this, api);
//
//         for (let cb of state.callbacks.before) {
//             api.before(cb.apply(thisArg, args));
//         }
//         state.callbacks.after.forEach(x => api.then(x));
//         state.callbacks.catch.forEach(x => api.catch(x));
//         state.callbacks.finally.forEach(x => api.finally(x));
//
//         result.addChild(() => func.apply(thisArg, args));
//         return result;
//     };
//
//     const addCb = arr => function addCallback(cb) {
//         return isFunc(cb) && arr.push(cb) && this;
//     };
//
//     result.after = addCb(state.callbacks.after);
//     result.catch = addCb(state.callbacks.catch);
//     result.finally = addCb(state.callbacks.finally);
//     result.before = addCb(state.callbacks.before);
//
//     return result;
// }
//