export class AsyncEventTarget {
    #listeners = new Map();

    /**
     *
     * @param type {string}
     * @param callback {(e: CustomEvent) => (void | Promise) }
     * @param options {EventListenerOptions & {prepend: boolean}}
     * @return {function} unsubscriber
     */
    addEventListener(type, callback, options = {}) {
        if (!this.#listeners.has(type)) this.#listeners.set(type, []);

        const arr = this.#listeners.get(type);
        const handler = {
            ...options, type, callback,
            discard() {
                const i = arr.indexOf(this);
                if (i >= 0) {
                    arr.splice(i, 1);
                }
            },
        };

        if (options.prepend)
            arr.unshift(handler);
        else
            arr.push(handler);

        return handler.discard.bind(handler);
    }

    /**
     *
     * @param type {string}
     * @param callback {(e: CustomEvent) => (void | Promise) }
     */
    removeEventListener(type, callback) {
        const arr = this.#listeners.get(type);
        if (arr?.length) {
            const item = arr.find(x => x.callback === callback);
            item?.discard?.();
        }
    }

    /**
     *
     * @param event {CustomEvent}
     * @returns {Promise<boolean>}
     */
    async dispatchEvent(event) {
        if (!event) return false;

        if (event.cancelable) {
            event.stopImmediatePropagation = function stopImmediatePropagation() {
                event.stopped = true;
                Event.prototype.stopImmediatePropagation.call(event);
            }
            event.stopPropagation = function stopPropagation() {
                event.stopped = true;
                Event.prototype.stopPropagation.call(event);
            }
        }

        const listeners = this.#listeners.get(event.type);
        if (!listeners?.length) return false;

        for (let handler of listeners) {
            try {
                await handler.callback(event);
            } finally {
                if (handler.once) {
                    handler?.discard();
                }
            }

            if (event.stopped) break;
        }

        return !event.defaultPrevented;
    }
}