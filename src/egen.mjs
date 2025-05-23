import {isFunc} from "./utils/global.mjs";
import {safeYield, toAsyncGen} from "./utils/gen.mjs";
import {proxyThis} from "./utils/proxy.mjs";

/**
 * @typedef {'start' | 'before' | 'main' | 'after' | 'error' | 'finally' | 'cleanup'} PhaseType
 */
const phases = [
    {name: 'start', internal: true,},
    {name: 'before', callbacks: true, throws: true,},
    {name: 'main', throws: true,},
    {name: 'after', callbacks: true, throws: true,},
    {name: 'error', callbacks: true, errorOnly: true},
    {name: 'finally', callbacks: true,},
    {name: 'cleanup', internal: true,},
];

function state(fn, src = {}) {
    const timeline = src?.timeline || {};
    const callbacks = src?.callbacks || {before: [], after: [], error: [], finally: []};
    const retVal = src?.retVal || {};

    return {
        get step() {
            const phase = ['start', 'before', 'main', 'after', 'error', 'finally', 'cleanup',].find(x => !timeline[x]);

            switch (phase) {
                case 'start':
                    return async function* start(...args) {
                        timeline.start = Date.now();
                        return args;
                    };

                case 'before':
                    return async function* before(...args) {
                        timeline.before = callbacks.before.length
                            ? Date.now()
                            : 'skip';
                        timeline.before = Date.now();
                        return args;
                    };

                case 'main':
                    return async function* main(...args) {
                        for await (let step of safeYield(toAsyncGen(fn).call(this, ...args))) {

                        }
                    };


                case 'after':
                    break;
                case 'error':
                    return async function* runCallbacks(...args) {

                    };
                case 'finally':
                    break;
                case 'cleanup':
                    break;

                default:
                    return {_finished: true};
            }

            for (let phase of phases) {
                if (timeline[phase.name]) continue;

                if (phase.name === 'start') return async function* start(...args) {
                    timeline.start = Date.now();
                    return args;
                };

                if (phase.name === 'cleanup') return async function* cleanup() {
                    timeline.cleanup = Date.now();

                };

                const {name, callbacks, throws, errorOnly, internal} = phase;

            }

            return {_finished: true};

            // const visited = Object.keys(timeline);
            // // only starting
            // if (!visited.length) return async function* start(...args) {
            //     timeline.start = Date.now();
            //     return args;
            // };
            //
            // // some error handling
            // const current = phases.reverse().find(x => visited.includes(x.name));
            // if (!current) return async function* unknownStep() {
            //     throw new Error('Unknown steps visited: ' + visited.join(', '));
            // };
            //
            // // was finished
            // if (phases.at(-1) === current)
            //     return {_finished: true};
            //
            // // some error handling
            // const next = phases.at(phases.indexOf(current) + 1);
            // if (!next) return async function* unknownStep() {
            //     throw new Error(`Unknown next step for ${current.name}`);
            // };


            //
            // if (visited.length == 1) return async function * before(...args) {
            //     if (!callbacks.before.length) {
            //         timeline.before = 'skip';
            //         return args;
            //     }
            //
            //     timeline.before = Date.now();
            //
            //
            //     return args;
            // }
            //
            // for (let {name, internal, errorOnly, throws, callbacks} of phases) {
            //     // already been there
            //     if (timeline[name]) continue;
            //
            //     if (timeline[name] && internal && errorOnly) return 'error';
            //     if (timeline[name] && internal && !throws) return 'finally';
            // }
        },

        /**
         * Retrieves the result value from the retVal object. If an error is present in the retVal object,
         * it throws the associated error.
         *
         * @return {*} The value contained in the retVal object if no error exists.
         * @throws {*} The error contained in the retVal object if an error is present.
         */
        getResult() {
            if (retVal.error) throw retVal.error;
            return retVal.value;
        },

        /**
         * Safely retrieves the result, encapsulating any potential errors.
         * If an error exists, it returns an object containing the error.
         * Otherwise, it returns an object containing the value.
         *
         * @return {Object} An object with either an `error` property if an error occurred,
         *                  or a `value` property if the operation was successful.
         */
        getResultSafe() {
            if (retVal.error)
                return {error: retVal.error};

            return {value: retVal.value};
        },

        /**
         * Updates the result object with a given value and/or error. Optionally marks the update as coming from a user.
         *
         * @param {Object} param0 An object containing the value and error to be set.
         * @param {*} param0.value The value to set in the result object.
         * @param {*} param0.error The error to set in the result object, if any.
         * @param {boolean} [fromUser=false] A boolean indicating whether the update is from a user.
         * @return {void}
         */
        setResult({value, error}, fromUser = false) {
            if (retVal?.fromUser === true) return;

            if (error) {
                retVal.error = error;
            } else {
                retVal.value = value;
                delete retVal.error;
            }

            if (fromUser) {
                retVal.fromUser = true;
            }
        },

        /**
         * Adds a callback function to the specified callback group.
         *
         * @param {'before' | 'after' | 'error' | 'finally'} name - The name of the callback group to add the function to.
         * @param {Function} callback - The callback function to be added.
         * @return {boolean} Returns true if the callback is successfully added.
         */
        addCallback(name, callback) {
            if (!isFunc(callback)) return;

            callbacks[name] ??= [];
            callbacks[name].push(callback);
            return true;
        },
    };
}

class RunState {
    static order = ['start', 'before', 'main', 'after', 'error', 'finally', 'cleanup',]

    #steps = [];
    #timeline = new Map();
    #callbacks = new Map();
    #retVal = {};

    /**
     *
     * @param callbacks {Map<string, function[]>}
     */
    constructor(callbacks = null) {
        this.#callbacks = callbacks || new Map();

        this.#createStep('start', {internal: true});
        this.#createStep('before', {optional: true, throws: true});
        this.#createStep('main', {throws: true});
        this.#createStep('after', {optional: true, throws: true});
        this.#createStep('error', {optional: true, error: true});
        this.#createStep('finally', {optional: true});
        this.#createStep('cleanup', {internal: true});
    }

    setResult({value, error}, fromUser = false) {
        if (Object.isFrozen(this.#retVal)) return;

        if (error) {
            this.#retVal = {error};
        } else {
            this.#retVal = {value};
        }

        if (fromUser) {
            Object.freeze(this.#retVal);
        }
    }

    addCallback(name, callback) {
        return isFunc(callback)
            && (this.#callbacks.get(name)?.push(callback)
                || this.#callbacks.set(name, [callback]));
    }

    * createSteps(thisArg, args) {
        const _this = this;
        for (let step of _this.#steps) {
            const {name, wasVisited, visit} = step;
            const {visit: visitResult, skip, fail} = visit.call(thisArg, args);
        }

    }


    #createStep(name, {internal, throws, optional, error}) {
        const _this = this;
        _this.#steps.push({
            get name() {
                return name;
            },
            wasVisited: () => _this.#timeline.has(name),
            visit() {
                if (this.wasVisited()) return {fail: 'was visited already'};

                const index = _this.#steps.indexOf(this);
                if (index < 0) return {fail: 'unknown step'};

                if (index > 0 && !_this.#steps[index - 1].wasVisited())
                    return {fail: 'previous step was not visited'};

                // mandatory visit
                if (internal) return {visit: !!_this.#timeline.set(name, Date.now())};

                // cannot handle errors
                if (throws && !!_this.#retVal.error) {
                    return {skip: _this.#timeline.set(name, 'error')};
                }

                // can handle error only
                if (error && !_this.#retVal.error) {
                    return {skip: _this.#timeline.set(name, 'skip')};
                }

                // no callbacks provided
                if (optional && !_this.#callbacks.get(name)?.length) {
                    return {skip: _this.#timeline.set(name, 'skip')};
                }

                // regular phase visit
                return {visit: _this.#timeline.set(name, Date.now())};
            },
        });
    }


}

export class Runner extends Iterator {
    /*** @type {AsyncGenerator}*/
    #inner;
    #callbacks = {before: [], after: [], catch: [], finally: []};
    #timeline = {
        start: null,
        before: null,
        main: null,
        after: null,
        error: null,
        finally: null,
        cleanup: null,
    };
    #retVal = {}
    #isRunning;

    constructor(fn, thisArg, args) {
        super();

        const _runner = this;
        thisArg = proxyThis(thisArg, this);
        this.#inner = runStage('start', args);

        const runCallbacks = async function* runCallbacks(callbacks, funcArguments) {
            if (callbacks?.length) {
                const result = [];
                for (let gen of callbacks.map(x => toAsyncGen(x))
                    .map(x => x.apply(thisArg, funcArguments))
                    .filter(Boolean)
                    .map(x => safeYield(x))) {

                    let stepValue = null;

                    for await (let step of gen) {
                        yield step;
                        stepValue = step.value;
                        if (step.done && step.error) {
                            _runner.#retVal.error = step.error;
                            return step;
                        }
                    }

                    result.push(stepValue);
                }

                return {done: true, value: result};
            }
        }

        async function* runStage(id, funcArguments) {
            switch (id) {
                case 'start': {
                    _runner.#timeline.start = Date.now();
                    return yield* runStage('before', funcArguments);
                }
                case 'before': {
                    if (_runner.#callbacks.before.length) {
                        _runner.#timeline.before = Date.now();
                        yield* runCallbacks(_runner.#callbacks.before, funcArguments);
                    }

                    return _runner.#retVal.error
                        ? yield* runStage('catch', [_runner.#retVal.error])
                        : yield* runStage('main', funcArguments);
                }
                case 'main': {
                    _runner.#timeline.main = Date.now();
                    const step = yield* runCallbacks([fn], funcArguments);

                    if (step.error)
                        _runner.#retVal.error = step.error;
                    else {
                        _runner.#retVal.value = step.value[0];
                        delete _runner.#retVal.error;
                    }

                    return _runner.#retVal.error
                        ? yield* runStage('catch', [_runner.#retVal.error])
                        : yield* runStage('after', [_runner.#retVal.value]);
                }
                case 'after': {
                    if (_runner.#callbacks.after.length) {
                        _runner.#timeline.after = Date.now();
                        yield* runCallbacks(_runner.#callbacks.after, funcArguments);
                    }

                    return _runner.#retVal.error
                        ? yield* runStage('catch', [_runner.#retVal.error])
                        : yield* runStage('finally', []);
                }
                case 'catch': {
                    _runner.#retVal.error ||= funcArguments[0];

                    if (_runner.#callbacks.catch.length) {
                        // assume we handle the error
                        delete _runner.#retVal.error;
                        _runner.#timeline.catch = Date.now();
                        yield* runCallbacks(_runner.#callbacks.catch, funcArguments);
                    }

                    return yield* runStage('finally', []);
                }
                case 'finally': {
                    if (_runner.#callbacks.finally.length) {
                        _runner.#timeline.finally = Date.now();
                        yield* runCallbacks(_runner.#callbacks.finally, funcArguments);
                    }

                    return yield* runStage('cleanup', []);
                }
                case 'cleanup': {
                    _runner.#timeline.cleanup = Date.now();

                    if (_runner.#retVal.error) throw _runner.#retVal.error;

                    return _runner.#retVal.value;
                }
            }
        }
    }

    get isRunning() {
        return this.#isRunning;
    }

    set isRunning(value) {
        // can run only if generator exists
        value &&= !!this.#inner;
        if (this.#isRunning === value) return;

        this.#isRunning = value;
        if (this.isRunning) {
            const _ = new Promise(async (resolve, reject) => {
                while (this.#isRunning || !!this.#inner) {
                    try {
                        const step = await this.#inner.next();
                        if (step.done) {
                            this.#inner = null;
                            this.isRunning = false;
                            return resolve();
                        }
                    } catch (e) {
                        this.#inner = null;
                        this.isRunning = false;
                        return reject(e);
                    }
                }

                return resolve();
            });
        }
    }

    then(resolve, reject) {
        if (isFunc(resolve)) this.#callbacks.after.push(resolve);
        if (isFunc(reject)) this.#callbacks.catch.push(reject);

        if (this.#timeline.cleanup > 0) {
            return this.#retVal.value;
        }

        this.isRunning = true;
        return this;
    }

    catch(reject) {
        return this.then(null, reject);
    }

    finally(cb) {
        if (isFunc(cb)) this.#callbacks.finally.push(cb);
        return this;
    }

    async next(value) {
        return this.#inner.next(value);
    }

    async return(value) {
        return await this.#inner.return(value);
    }

    async throw(error) {
        return await this.#inner.throw(error);
    }

    [Symbol.asyncIterator]() {
        return this;
    }
}

function egen(fn, opts) {
    if (!(this instanceof egen)) return new egen(fn, opts);

    this._state = {};
    return new function (...args) {

    }
}

const s = new RunState();

s.addCallback('before', () => console.log('before'));
s.addCallback('after', () => console.log('after'));
s.addCallback('error', () => console.log('error'));
s.addCallback('finally', () => console.log('finally'));


for (let step of s) {
    console.log(step);
}