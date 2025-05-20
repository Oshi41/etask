import './global.mjs';
import './gen.mjs';
import './proxy.mjs';
import './promise.mjs';


Object.defineProperties(Function.prototype, {
    isAsync: {
        get() {
            return this.constructor === functions.async.constructor
                || this.constructor === functions.asyncGen.constructor;
        }
    },
    isGen: {
        get() {
            return this.constructor === functions.gen.constructor
                || this.constructor === functions.asyncGen.constructor;
        }
    },
});

/**
 * Install function as disposable
 * @returns {Function}
 */
Function.prototype.asDisposable = function () {
    return {
        // [Symbol.asyncDispose]: async () => {
        //     if (this.isGen) {
        //         await this();
        //     } else {
        //         await this();
        //     }
        // },
        [Symbol.dispose]() {
            this();
        }
    }
    // let called = false;
    //
    // this[Symbol.asyncDispose] = async () => {
    //     if (called) return;
    //     called = true;
    //
    //     if (this.isGen) {
    //         await this();
    //     } else {
    //         await this();
    //     }
    // };
    // this[Symbol.dispose] = () => this[Symbol.asyncDispose]();
    //
    // return this;
}

/**
 *
 * @returns {AsyncGeneratorFunction}
 */
Function.prototype.asGen = function () {
    if (this.isGen && this.isAsync) return this;

    const _this = this;
    if (this.isGen) return async function* gen2AsyncGenWrapper(...args) {
        return yield* _this.apply(this, args);
    };

    if (this.isAsync) return async function* promise2AsyncGenWrapper(...args) {
        const res = _this.apply(this, args);
        yield res;
        return res;
    }

    return async function* func2AsyncGenWrapper(...args) {
        const res = _this.apply(this, args);
        yield res;
        return res;
    };
}

Function.prototype.once = function () {
    const fn = this;
    let called;
    return function (...args) {
        if (called) return;

        called = true;
        return fn.apply(this, args);
    };
};