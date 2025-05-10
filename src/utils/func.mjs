import './global.mjs';
import './gen.mjs';
import './proxy.mjs';
import './promise.mjs';

const functions = {
    async: async function () {
    },
    gen: function* () {
    },
    asyncGen: async function* () {
    },
};

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
    let called = false;

    this[Symbol.asyncDispose] = async () => {
        if (called) return;
        called = true;

        if (this.isGen) {
            await this().runAsync();
        } else {
            await this();
        }
    };
    this[Symbol.dispose] = () => this[Symbol.asyncDispose]();

    return this;
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
        return yield _this.apply(this, args);
    }

    return async function* func2AsyncGenWrapper(...args) {
        return yield _this.apply(this, args);
    };
}