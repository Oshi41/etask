import './func.mjs';

/*** @type {GeneratorFunction}*/
const Generator = Object.getPrototypeOf(function* () {
});
/*** @type {AsyncGeneratorFunction}*/
const AsyncGenerator = Object.getPrototypeOf(async function* () {
});

/**
 *
 * @this {Generator | AsyncGenerator}
 * @type {{}}
 */
const api = {
    /**
     *
     * @yields {{done, value, error}}
     */
    safeYield: async function* () {
        const gen = this?.[Symbol.asyncIterator]?.() || this?.[Symbol.iterator]?.();
        let step = {};
        while (!step.done) {
            try {
                step = await gen.next();
            } catch (e) {
                step = {error: e, done: true};
            }
            yield step;
        }
        return step;
    },
    concat: async function* (...others) {
        for (let gen of [this, ...others]) {
            let step = yield* this.safeYield();
            if (step.error) {
                throw step.error;
                return;
            }
        }
    },
};

Object.assign(Generator.prototype, api);
Object.assign(AsyncGenerator.prototype, api);