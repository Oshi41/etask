/**
 * Async event listener
 * @returns {e_listener}
 */
export function e_listener() {
    /**
     * listeners list
     * @type {Map<string, {index: Set, meta: Map}>}
     */
    const map = new Map();

    const check_access = function (name) {
        if (!map.has(name)) map.set(name, {index: new Set(), meta: new Map()});
        return map.get(name);
    };
    const order = function (index, meta) {
        const keys = Array.from(index);
        return keys.toSorted((a, b) => {
            const {order: l} = meta.get(a) || {order: 0};
            const {order: r} = meta.get(b) || {order: 0};
            return l - r;
        });
    };

    const addEventListener = function (name, cb, opts) {
        const {meta, index} = check_access(name);
        if (meta.has(cb) && index.has(cb)) return false;

        meta.set(cb, opts || {});
        index.add(cb);
        return () => removeEventListener(name, cb);
    };
    const removeEventListener = function (name, cb) {
        const {meta, index} = check_access(name);
        const m = meta.delete(cb);
        const i = index.delete(cb);
        return m && i;
    };
    const dispatchEvent = async (name, detail, cancelable = true) => {
        const ev = new CustomEvent(name, {detail, bubbles: true, cancelable});
        return this._handle_evt(ev);
    }


    this._handle_evt = async function (ev) {
        let {index, meta} = check_access(ev.type);
        const keys = order(index, meta);
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
     * Subscribe on event with higher priority
     * @param name
     * @param callback
     * @returns {boolean|(function(): *)}
     */
    this.before = function (name, callback) {
        return addEventListener(name, callback, {order: -1});
    };

    /**
     * Subscribe on event with lower priority
     * @param name
     * @param callback
     * @returns {boolean|(function(): *)}
     */
    this.after = function (name, callback) {
        return addEventListener(name, callback, {order: 1});
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
    let promise, ac;
    const result = function _single(...args) {
        return promise ??= new Promise((resolve, reject) => {
            ac = new AbortController();
            try {
                ac.signal.throwIfAborted();
                resolve(fn(...args));
            } catch (e) {
                reject(e);
            } finally {
                promise = null;
            }
        });
    };
    result.is_running = function () {
        return !!promise && !ac.signal.aborted;
    }
    result.abort = (r = 'user') => result.is_running && ac.abort(r);
    result.throwIfAborted = () => ac.signal.throwIfAborted();
    return result;
}