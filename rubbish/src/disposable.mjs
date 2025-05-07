function as_disposable() {
    // (arg, clearFunction)
    if (arguments.length == 2 && typeof arguments[0] != 'function' && typeof arguments[1] == 'function') {
        let [arg, fn] = arguments;
        return {
            get reference() {
                return arg;
            },
            get disposed() {
                return !arg && !fn;
            },
            [Symbol.dispose]() {
                if (!this.disposed) {
                    const [_fn, _arg] = [fn, arg];
                    [arg, fn] = [null, null];

                    _fn(_arg);
                }
            }
        };
    }

    // (disposable)
    if (arguments.length == 1 && [arguments[0]?.dispose, arguments[0]?.[Symbol.dispose]].some(x => typeof x === 'function')) {
        return arguments[0];
    }

    // (clearFn)
    if (arguments.length == 1 && typeof arguments[0] == 'function') {
        let [fn] = arguments;
        return {
            get reference() {
                return fn;
            },
            get disposed() {
                return !fn;
            },
            [Symbol.dispose]() {
                if (!this.disposed) {
                    const _fn = fn;
                    fn = null;

                    _fn();
                }
            }
        }
    }

    // empty
    return {
        get reference() {
            return null;
        },
        disposed: true,
        [Symbol.dispose]() {
        }
    };
}

export class CompositeDisposable {
    #disposed = false;
    /**
     *
     * @type {Map<Disposable, boolean>}
     */
    #resources = new Map();

    /**
     * Indicates whether this CompositeDisposable has been disposed.
     */
    get disposed() {
        return this.#disposed;
    }

    /**
     * The number of resources currently being tracked.
     */
    get size() {
        return this.#resources.length;
    }

    /**
     * Disposes all resources being tracked and marks as disposed.
     */
    dispose() {
        if (this.disposed) return;

        this.#disposed = true;

        try {
            this.#resources.keys().filter(x => x.disposed !== true).forEach(x => x[Symbol.dispose]());
        } finally {
            this.#resources.clear();
        }
    }

    [Symbol.dispose]() {
        this.dispose();
    }

    /**
     * Adds disposable objects to be tracked.
     */
    add(resourceOrFunction, clearFunction) {
        this.#resources.set(as_disposable(resourceOrFunction, clearFunction), true);
        return this;
    }
}