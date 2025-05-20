import {isFunc} from "./utils/global.mjs";
import {safeYield, toAsyncGen} from "./utils/gen.mjs";
import {proxyThis} from "./utils/proxy.mjs";

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