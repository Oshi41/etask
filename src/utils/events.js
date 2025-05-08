import './promise.mjs';

export class AsyncEventTarget {
    #listeners = new Map();

    /**
     *
     * @param type {string}
     * @param callback {(e: CustomEvent) => (void | Promise) }
     * @param options {EventListenerOptions & {prepend: boolean}}
     */
    addEventListener(type, callback, options = {}) {
        if (!this.#listeners.has(type)) this.#listeners.set(type, []);

        const arr = this.#listeners.get(type);
        const handler = {...options, type, callback};
        if (options.prepend)
            arr.unshift(handler);
        else
            arr.push(handler);
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
            if (item) {
                const index = arr.indexOf(item);
                if (index !== -1) {
                    arr.splice(index, 1);
                }
            }
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
            await Promise.wrap(async function run_callback() {
                this.finally(() => {
                    if (handler.once) {
                        const i = listeners.indexOf(listeners);
                        if (i !== -1) {
                            listeners.splice(i, 1);
                        }
                    }
                });


                return handler.callback(event);
            })();

            if (event.stopped) break;
        }

        return !event.defaultPrevented;
    }
}