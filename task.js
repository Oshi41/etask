import {e_listener, single_execution} from './async.js'

async function* run_anything(any) {
    let result;

    if (typeof any?.next == 'function') {
        for await (const item of any) {
            result = yield* run_anything(item);
        }
        return yield* run_anything(result);
    }

    if (typeof any?.then == 'function') {
        return yield* run_anything(await any);
    }

    return yield any;
}

function task(fn, opts) {
    if (!(this instanceof task)) return new task(fn, opts);

    e_listener.prototype.constructor.call(this);
    single_execution(this, this._run, this._next_it_step, this.emit);

    this.children = new Set();

    this.once('start', async start_ev => {
        this.start = Date.now();
        this.end = 0;
        this.gen = run_anything(typeof fn == 'function' ? fn(...start_ev.detail) : fn);
        const on_next = ev => this._next_it_step(() => this.gen.next(ev.detail));

        this.on('next', on_next);

        this.once('reject', ev => this._next_it_step(() => this.gen.throw(ev.detail)));
        this.once('resolve', ev => this._next_it_step(() => this.gen.return(ev.detail)));
        this.once('finally', () => this.off('next', on_next));
    });

    return this;
}

//#region Promise

/**
 * Promiselike interface
 *
 * @param resolve
 * @param reject
 * @returns {task}
 */
task.prototype.then = function (resolve, reject) {
    resolve && this.once('then', ev => resolve(ev.detail));
    reject && this.once('catch', ev => reject(ev.detail));
    this._run();
    return this;
}

/**
 * Add finally callback
 * @param cb
 * @returns {Function}
 */
task.prototype.finally = function (cb) {
    return this.once('finally', cb);
}

/**
 * Rise an error
 *
 * @param e
 * @returns {Function}
 */
task.prototype.reject = function (e) {
    return this.once('reject', e);
}

/**
 * Return custom value
 *
 * @param v
 * @returns {Function}
 */
task.prototype.resolve = function (v) {
    return this.once('resolve', v);
}

//#endregion

//#region Iterable

task.prototype.next = async function next(rv) {
    return this._next_it_step(() => this.gen.next(rv));
};

/**
 * making next generator step
 *
 * @param get_step {() => Promise<{done, value}>}
 * @returns {Promise<*>}
 * @private
 */
task.prototype._next_it_step = async function _next_it_step(get_step) {
    let step = {done: true};

    try {
        step = await get_step();
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

    return step;
};

//#endregion

//#region prototype task

/**
 * Starting executing routine
 * @param args {[]}
 * @returns {Promise<task>}
 * @private
 */
task.prototype._run = async function _run(...args) {
    if (!this.start) {
        await this.emit('start', args);
        while (!this.end) {
            await this.next();
        }
        return this;
    }
    return this;
};

/**
 *
 * @param child {task | any}
 */
task.prototype.spawn = function spawn(child) {
    if (!(child instanceof task)) child = new task(child);

    if (!this.children.add(child)) return;
    child.once('finally', () => this.children.delete(child));
}

//#endregion

async function* simple_run(hdr) {
    yield;
    console.log(hdr + 'running');
    yield await new Promise(r => setTimeout(r, 1000));
    console.log(hdr + 'end');
}

async function run() {
    const main = task(simple_run('main: '));
    const child1 = task(simple_run('child 1: '));
    const child2 = task(simple_run('child 2: '));

    main.spawn(child1);
    child1.spawn(child2);
    await main;
}

run();



