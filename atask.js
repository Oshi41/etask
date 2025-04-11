async function* create_gen(any) {
    if (typeof any?.next == 'function') {
        let step;
        while (!step?.done) {
            step = await any.next();
            yield* this.create_gen(step.value);
        }
    }

    if (typeof any?.then == 'function') {
        any = await any;
        yield* this.create_gen(any);
    }

    yield any;
}

/**
 *
 * @param arr {((...args) => AsyncGenerator)[]}
 * @param args {...*}
 * @returns {AsyncGenerator<*, void, *>}
 */
async function* run_gen_safe(arr, ...args) {
    for (let cb of arr || []) {
        try {
            yield* create_gen(cb(...args));
        } catch (e) {
            return e;
        }
    }
}

async function* atask_run(gen, callbacks) {
    let result;
    try {
        result = {v: yield* gen};
    } catch (e) {
        result = {e};
        yield* run_gen_safe(callbacks.catch, e);
    } finally {
        const e = yield* run_gen_safe(callbacks.finally);
        if (e) result = {e};
    }
    if (result.e) throw result.e;
    return result.v;
}

function a_task(fn) {
    const self = this;
    const this_arg = new Proxy(this || global, {
        has(target, p) {
            return p in self || p in target;
        },
        get(target, p) {
            if (p in self) return self[p];
            return target[p];
        }
    });
    self.callbacks = {then: [], catch: [], finally: [], _finally: []};


    const run_cb = async function* (arr, ...args) {
        for (let cb of arr || []) {
            yield* create_gen(cb(...args));
        }
    };


    Object.assign(this, async function _a_task(...args) {
        self._gen = async function* _main_fn() {
            const orig = yield* create_gen(fn.apply(this_arg, args));
            for (let cb of self.callbacks.then || []) {
                yield* create_gen(cb(orig));
            }
            return orig;
        }();
        self._run = async function* _run_fn() {
            try {
                self.end = 0;
                self.start = Date.now();
                self._ret_val = {value: yield* self._gen};
            } catch (e) {
                self._ret_val = {error: e};
                yield* run_cb(self.callbacks.catch);
            } finally {
                yield* run_cb(self.callbacks.finally);
                self.end = Date.now();
            }
        }();

        for await (let v of self._run) {
            // ignored
        }


    });
}

class ATask {
    constructor(fn, {_this = null} = {}) {
        const self = this;
        this.callbacks = {
            then: [],
            catch: [],
            finally: [],
            _finally: [],
        };
        this.states = [
            async function* _start() {
                self.end = -1;
                self.start = Date.now();
                const this_arg = new Proxy(_this || global, {
                    has(target, p) {
                        return p in self || p in target;
                    },
                    get(target, p) {
                        if (p in self) return self[p];
                        return target[p];
                    }
                });
                return async function* _main() {
                    yield;
                    return yield* create_gen(fn.apply(this_arg, []));
                }
            },
            async function* _run(generator) {
                try {
                    return {value: yield* generator};
                } catch (e) {
                    return {error: e};
                }
            },
            async function* _then({error, value}) {
                if (error) {
                    for (let cb of self.callbacks.catch || []) {
                        yield* create_gen(cb(error));
                    }
                } else {
                    for (let cb of self.callbacks.then || []) {
                        yield* create_gen(cb(value));
                    }
                }
            },
            async function* _finally() {
                for (let cb of self.callbacks.finally || []) {
                    yield* create_gen(cb());
                }
            },
            async function* _dispose() {
                for (let cb of self.callbacks._finally || []) {
                    yield* create_gen(cb());
                }
                this.end = Date.now();
            },
        ];
    }

    async reject(err) {


        await this.gen.throw(err);
        return this;
    }
}