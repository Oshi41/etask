import {e_listener, runner} from "./async.js";

class ETask extends e_listener {
    constructor(fn, {limit = 16} = {}) {
        super();

        this.once('start', async ev => {
            this.end = 0;
            this.start = Date.now();
            this.gen = ETask.create_gen(fn(ev.detail));
            this.scheduler = new runner(limit);

            this._run_step = async function (fn, ...args) {
                return this.scheduler.enqueue(this.prototype._run_step.bind(this, fn, ...args));
            }
            this.emit = async function (...args) {
                return this.scheduler.enqueue(this.prototype.emit.bind(this, ...args));
            }

            const subs = [
                this.on('next', ev => this._run_step('next', ev.detail)),
                this.once('resolve', ev => this._run_step('return', ev.detail)),
                this.once('reject', ev => this._run_step('throw', ev.detail)),
            ];

            this.once('finally', () => {
                while (subs.length) subs.pop()();
            });

            while (!this.end) {
                await this._run_step('next');
            }
        });
    }

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

    //#region Promise

    then(than, err) {
        than && this.once('then', ev => than(ev.detail));
        err && this.once('catch', ev => err(ev.detail));
        return this;
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

    /**
     *
     * @param fn {'next' | 'throw' | 'return'}
     * @param args {any}
     * @returns {Promise<void>}
     * @private
     */
    async _run_step(fn, ...args) {
        if (!this.end) {
            let step;
            try {
                step = await this.gen[fn](...args);
            } catch (e) {
                step = {error: e, done: true};
            }

            if (step.done && !this.end) {
                this.end = Date.now();
                try {
                    if (step.error)
                        await this.emit('catch', step.error);
                    else
                        await this.emit('then', step.value);
                } finally {
                    await this.emit('finally');
                }
            }
        }
    }
}

export function etask(fn, opts) {
    return new ETask(fn, opts);
}

etask(async function* () {
    for (let i = 0; i < 10; i++) {
        yield;
        console.log('main', i);
    }
});
