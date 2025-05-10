import "./utils/func.mjs";
import "./utils/gen.mjs";
import "./utils/promise.mjs";

function wrapper(func) {
    this.callbacks = {before: [], after: [], catch: [], finally: [],};
    this.stage = '';
    this.retVal = {};
    Object.defineProperties(this, {
        isWrapped: {get: () => true,},
        func: {get: () => func,},
        name: {get: () => func?.name || 'anonymous',},
        length: {get: () => func?.length || 0,},
    });
}

wrapper.prototype.then = function (resolve, reject) {
    isFunc(resolve) && this.callbacks.after.push(resolve);
    isFunc(reject) && this.callbacks.catch.push(reject);
    return this;
}
wrapper.prototype.catch = function (callback) {
    return this.then(null, callback);
}
wrapper.prototype.before = function (callback) {
    isFunc(callback) && this.callbacks.before.push(callback);
    return this;
}
wrapper.prototype.finally = function (callback) {
    isFunc(callback) && this.callbacks.finally.push(callback);
    return this;
}
wrapper.prototype.sleep = Promise.sleep;

/**
 *
 * @param stage {'start' | 'before' | 'main' | 'after' | 'error' | 'finally' | 'finally2'}
 * @param thisArg
 * @param args
 * @returns {AsyncGenerator<*, void, *>}
 */
wrapper.prototype.runStage = async function* (stage, thisArg, args) {
    this.stage = stage;

    switch (stage) {
        case "start":
            this.retVal = {};
            return yield* this.runStage('before', thisArg, args);

        case "before":
            for (let gen of this.callbacks.before.map(x => x.asGen().apply(thisArg, args).safeYield())) {
                const {error} = yield* gen;
                if (error) {
                    this.retVal = {error};
                    break;
                }
            }

            if (this.retVal.error)
                return yield* this.runStage('error', thisArg, args);
            else
                return yield* this.runStage('main', thisArg, args);

        case "main":
            const gen = this.func.asGen().apply(thisArg, args).safeYield();
            const {done, ..._retVal} = yield* gen;
            this.retVal = _retVal;

            if (this.retVal.error)
                return yield* this.runStage('error', thisArg, args);
            else
                return yield* this.runStage('after', thisArg, [this.retVal.value]);

        case "after":
            for (let gen of this.callbacks.after.map(x => x.asGen().apply(thisArg, args).safeYield())) {
                const {error} = yield* gen;
                if (error) {
                    this.retVal = {error};
                    break;
                }
            }

            if (this.retVal.error)
                return yield* this.runStage('error', thisArg, args);
            else
                return yield* this.runStage('finally', thisArg, args);

        case "error":
            if (this.callbacks.catch.length) {
                for (let gen of this.callbacks.catch.map(x => x.asGen().apply(thisArg, [this.retVal.error]).safeYield())) {
                    const {error} = yield* gen;
                    if (error) {
                        this.retVal = {error};
                        return yield* this.runStage('finally', thisArg, args);
                    }
                }

                // assume we handle the error
                delete this.retVal.error;
            }

            return yield* this.runStage('finally', thisArg, args);

        case "finally":
            for (let gen of this.callbacks.finally.map(x => x.asGen().apply(thisArg, args).safeYield())) {
                const {error} = yield* gen;
                if (error) {
                    this.retVal = {error};
                    break;
                }
            }

            return yield* this.runStage('finally2', thisArg, args);

        case "finally2":
            if (this.retVal.error) {
                throw this.retVal.error;
            }
            return;
    }
}

wrapper.prototype.apply = async function (thisArg, args) {
    thisArg = Proxy.this(thisArg, this);

    const gen = this.runStage('start', thisArg, args).safeYield();
    for await (const {done, error, value} of gen) {
        if (!done) continue;

        if (error) throw error;

        return value;
    }
}