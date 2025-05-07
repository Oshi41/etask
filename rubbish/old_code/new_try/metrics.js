import {working_queue} from "./utils/working_queue.js";

class metrics_api {
    /**
     * Checking if can post metric on server
     *
     * @param name {string}
     * @param type {'post' | 'counter' | 'average'}
     * @param payload {any}
     */
    can_handle(name, type, payload) {
        return true;
    }

    /**
     * Posting metric to server
     *
     * @param name {string}
     * @param data {any}
     * @returns {Promise<void>}
     */
    async post(name, data) {

    }

    /**
     * increasing counter metric.
     *
     * @param {string} name - metric name.
     * @param {number} [delta=1] - change value
     * @return {Promise<number>} - A promise that resolves to the updated count of the item.
     */
    async add(name, delta = 1) {

    }

    /**
     * Post average counter to server
     *
     * @param name {string} - metric name
     * @param value {number} - updated value
     * @returns {Promise<void>}
     */
    async average(name, value) {

    }
}

let api = new metrics_api();

/**
 *
 * @type {working_queue<{name, _type, timestamp}>}
 */
let queue = new working_queue({
    process_item: function ({name, _type, ...rest}) {
        switch (_type) {
            case 'post':
                return metrics.api.post(name, rest);

            case 'counter':
                return metrics.api.add(name, +rest.delta);

            case 'average':
                return metrics.api.average(name, +rest.delta);

            default:
                throw Object.assign(new Error(`Unknown metric type ${_type}`), {remove: true});
        }
    },
    can_enqueue: function ({name, _type, ...rest}) {
        return metrics.api.can_handle(name, _type, ...rest);
    },
});

export const metrics = {
    get api() {
        return api;
    },
    set api(value) {
        api = value;
    },

    get queue() {
        return queue;
    },
    set queue(value) {
        queue = value;
    },
}