import {e_listener, single_promise_fn} from "./async.js";

class ETask extends e_listener {
    /**
     *
     * @type {Set<this>}
     */
    children = new Set();

    //#region static

    static async* create_gen(any) {
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

    constructor(fn, {_this = null} = {}) {
        super();
        fn ??= ETask.wait_fn;
        this.run = single_promise_fn(this.run.bind(this));

        this.once('start', async ev => {
            this.end = 0;
            this.start = Date.now();

            let prev_step;
            const clear_tick = this.on('tick', async ev => {
                if (this.end) return;
                ev.preventDefault();

                // first step - iterating through inner function
                if (!prev_step) {
                    try {
                        const step = await this.gen.next(...args);
                        return prev_step = step.done && step;
                    } catch (e) {
                        return prev_step = {error: e, done: true};
                    } finally {

                    }
                }

                // can call then callbacks
                if (prev_step?.done && !prev_step?.error) {
                    prev_step = {fin: true};
                    await this.emit('then', prev_step?.value);
                    return prev_step;
                }

                // can call catch callbacks
                if (prev_step?.done && prev_step?.error) {
                    prev_step = {fin: true};
                    await this.emit('catch', prev_step?.error);
                    return prev_step;
                }

                // can call fin callbacks
                if (prev_step?.fin) {
                    prev_step = null;
                    await this.emit('finally');
                    this.end = Date.now();
                }
            });

            this.once('resolve', async ev => {
                await this.gen.return(ev.detail);
                return this;
            });
            this.once('reject', async ev => {
                await this.gen.throw(ev.detail);
                return this;
            });
            this.once('finally', () => {
                clear_tick();
            });
            this.gen = ETask.create_gen(fn.apply(this.#create_this(_this), ev.detail));

            const _ = this.run(ev.detail);
        });
    }

    //#endregion

    //#region Promise

    /**
     * Waits for specific events to resolve or reject a promise.
     * Subscribes to various events (`resolve`, `than`, `reject`, `catch`, and `finally`).
     * Resolves or rejects the promise based on the emitted event, and handles clean-up upon the `finally` event.
     *
     * @return {Promise<any>} A promise that resolves or rejects based on the event emitted.
     */
    static async wait_fn() {
        const pwr = Promise.withResolvers();

        const subs = [
            this.once('resolve', ev => pwr.resolve(ev.detail)),
            this.once('than', ev => pwr.resolve(ev.detail)),

            this.once('reject', ev => pwr.reject(ev.detail)),
            this.once('catch', ev => pwr.reject(ev.detail)),
        ];

        this.once('finally', () => {
            while (subs.length)
                subs.pop()();
        });

        return pwr.resolve;
    }

    finally(fn) {
        this.once('finally', fn);
        return this;
    }

    //#endregion

    //#region Resolvers

    async resolve(data) {
        await this.emit('resolve', data);
        return this;
    }

    async reject(e) {
        await this.emit('reject', e);
        return this;
    }

    //#endregion

    //#region Children

    then(than, err) {
        than && this.once('then', ev => than(ev.detail));
        err && this.once('catch', ev => err(ev.detail));
        this.run();
        return this;
    }

    spawn(child) {
        if (!(child instanceof ETask)) child = new ETask(child);
        if (!this.children.add(child)) return;

        const subs = [
            this.before('tick', child._handle_evt.bind(child)),
            this.before('resolve', child._handle_evt.bind(child)),
            this.before('reject', child._handle_evt.bind(child)),
            () => this.children.delete(child),
        ]
        child.once('finally', () => {
            while (subs.length) subs.shift()();
        });
        child.run();
        return child;
    }

    //#endregion

    //#region this arg helping methods

    #create_this(orig) {
        const self = this;
        orig ??= typeof globalThis !== 'undefined' ? globalThis : {};
        return new Proxy(orig, {
            has(target, p) {
                return p in self || p in target;
            },
            get(target, p) {
                if (p in self) return self[p];
                return target[p];
            }
        });
    }

    sleep(mls) {
        const waiter = etask();
        let timer = setTimeout(() => waiter.resolve(true), mls);
        waiter.once('finally', () => clearTimeout(timer));
        return waiter;
    }

    //#endregion

    //#region Tick execution

    async tick(...args) {
        // was not started
        if (!this.start) {
            await this.emit('start', args);
            return true;
        }

        await this.emit('tick', args);
        return !this.end;
    }

    async run(...args) {
        let step = await this.tick(...args);
        while (step) step = await this.tick();
        return this;
    }

    //#endregion
}

export function etask(fn, opts) {
    return new ETask(fn, {...opts, _this: this});
}

etask(async function* () {
    for (let i = 0; i < 10; i++) {
        yield;
        console.log('step 1', i);
    }

    console.log('step 2');
    yield this.sleep(55);

    this.spawn(etask(async function* () {
        console.log('step 4, sleeping');
        yield this.sleep(55);
        console.log('step 5');
    }));

    for (let i = 0; i < 10; i++) {
        yield;
        console.log('step 6', i);
    }


}).then(x => console.log('done', x));
