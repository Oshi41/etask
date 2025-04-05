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
 * Install functions based on prototype to be executed once and reuse promise
 *
 * @param proto {Object}
 * @param fns {Function}
 */
export function single_execution(proto, ...fns) {
    for (let fn of fns) {
        const name = fn?.name || Object.entries(proto).find(arr => arr[1] === fn)?.at(0);

        proto[name] = async function (...args) {
            this._promises ??= {};

            if (!this._promises[name]) {
                const p = new Promise((resolve, reject) => {
                    try {
                        resolve(fn.apply(this, args));
                    } catch (e) {
                        reject(e);
                    }
                });
                p.finally(() => {
                    if (this._promises[name] === p) {
                        delete this._promises[name];
                    }
                });
                this._promises[name] = p;
            }

            return await this._promises[name];
        }
    }
}