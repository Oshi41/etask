/**
 * Async event listener
 * @returns {e_listener}
 */
export function e_listener() {
    /**
     * listeners list
     * @type {Map<string, {index: Set, meta: WeakMap}>}
     */
    const map = new Map();

    const check_access = function (name) {
        if (!map.has(name)) map.set(name, {index: new Set(), meta: new WeakMap()});
        return map.get(name);
    };
    const addEventListener = function (name, cb, opts) {
        const {meta, index} = check_access(name);
        if (meta.has(cb) && index.has(cb)) return false;

        meta.set(cb, opts);
        index.add(cb);
        return () => removeEventListener(name, cb);
    };
    const removeEventListener = function (name, cb) {
        const {meta, index} = check_access(name);
        const m = meta.delete(cb);
        const i = index.delete(cb);
        return m && i;
    };
    const dispatchEvent = async function (name, detail, cancelable = true) {
        const ev = new CustomEvent(name, {detail, bubbles: true, cancelable});
        let {index, meta} = check_access(name);
        const keys = Array.from(index);
        while (keys.length && !ev.defaultPrevented) {
            const cb = keys.shift();
            const {once} = meta.get(cb);
            await cb(ev);
            if (once) {
                index.delete(cb);
                meta.delete(cb);
            }
        }
        return ev.detail;
    }

    /**
     * Unsubscribe from event
     *
     * @param name {string}
     * @param callback {Function}
     * @returns {*}
     */
    this.off = function (name, callback) {
        return removeEventListener(name, callback);
    };

    /**
     * Subscribe on event
     *
     * @param name {string} - event name
     * @param callback {(ev: CustomEvent) => Promise}
     * @returns {null || Function}
     */
    this.on = function (name, callback) {
        return addEventListener(name, callback);
    };

    /**
     * Subscribe on event once
     *
     * @param name {string} - event name
     * @param callback {(ev: CustomEvent) => Promise}
     * @returns {null || Function}
     */
    this.once = function (name, callback) {
        return addEventListener(name, callback, {once: true});
    };

    /**
     * Async emitting event chaining listeners
     *
     * @param name {string}
     * @param detail {any}
     * @param cancelable {boolean}
     * @returns {Promise<unknown>}
     */
    this.emit = async function (name, detail, cancelable = true) {
        return dispatchEvent(name, detail, cancelable);
    }

    return this;
}

/**
 * A function that creates a task runner for managing and executing asynchronous functions with concurrency control.
 *
 * @param {number} limit - The maximum number of asynchronous functions to execute concurrently.
 * @returns {{
 *   enqueue: function(...Function): void,
 *   dequeue: function(...Function): void,
 *   next: function(): Promise<number>
 * }} An object with methods to manage the task queue.
 *
 * - `enqueue(...fns)`: Adds one or more functions to the queue. The provided functions must be asynchronous or return a promise.
 * - `dequeue(...fns)`: Removes one or more functions from the queue if they exist.
 * - `next()`: Executes up to the specified limit of asynchronous functions concurrently from the queue, removes the completed functions from the queue, and returns the number of executed functions as a promise.
 */
export const runner = function (limit) {
    const queue = new Set();
    /**
     *
     * @param fn
     * @returns {Promise}
     */
    this.enqueue = function (fn) {
        const pwr = Promise.withResolvers();
        const p = async function () {
            try {
                await pwr.resolve(await fn());
            } catch (e) {
                await pwr.reject(e);
            } finally {
                queue.delete(p);
            }
        };
        queue.add(p);
        this.run();
        return pwr.promise;
    };
    this.run = single_promise_fn(async function _run() {
        let count = queue.size;
        while (count) {
            count = await this.next();
        }
    }.bind(this));
    this.next = async function () {
        const promises = Array.from(queue).slice(0, limit).map(async function (fn) {
            try {
                await fn();
            } finally {
                queue.delete(fn);
            }
        });
        await Promise.all(promises);
        return promises.length;
    }

    this.run();
    return this;
}

/**
 * A function that enhances an existing function with additional scheduling behavior.
 * It provides a mechanism to execute the function only when it is in a scheduled state.
 * When the function is scheduled, it will attempt to execute the provided function `fn`.
 * If an error occurs during execution, the scheduled state will be reset.
 *
 * @param {Function} fn - The function to be enhanced with scheduling behavior.
 * @returns {Function} An object containing the enhanced function and scheduling controls.
 */
export const scheduled_fn = function (fn) {
    this.schedule = function () {
        this.scheduled = true;
    }
    Object.assign(this, function _scheduled(...args) {
        if (this.scheduled) {
            try {
                return fn.apply(this, ...args);
            } catch (e) {
                this.scheduled = false;
            }
        }
    });
    return this;
};

/**
 * Ensures a given function is executed only once at a time, preventing concurrent executions.
 * Subsequent calls to the function while a previous execution is still pending will share the
 * result of that execution.
 *
 * @param {Function} fn - The function to be wrapped with single execution enforcement.
 * @returns {Function} A function that enforces single execution for the provided function.
 */
export const single_promise_fn = function (fn) {
    let promise;
    this.is_running = function () {
        return !!promise;
    }
    Object.assign(this, function _single(...args) {
        return promise ??= new Promise((resolve, reject) => {
            try {
                resolve(fn.apply(this, ...args));
            } catch (e) {
                reject(e);
            } finally {
                promise = null;
            }
        });
    });

    return this;
}