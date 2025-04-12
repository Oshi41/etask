import {date_time} from "./date/date_time.js";
import {working_queue} from "./utils/working_queue.js";

function log_evt(lvl, timestamp, ...messages) {
    if (!(this instanceof log_evt)) return new log_evt(lvl, timestamp, ...messages);

    this.lvl = lvl;
    this.timestamp = timestamp || new date_time();
    this.messages = messages;

    return this;
}

/**
 *
 * @type {working_queue<log_evt>}
 */
let queue = new working_queue({
    can_enqueue(item) {
        return item.lvl in console;
    },
    process_item(item) {
        console[item.lvl](...item.messages);
        return true;
    },
});

export const log = {
    /**
     *
     * @param q {working_queue<log_evt>}
     */
    set_queue(q) {
        this.queue = q;
    },

    /**
     * Logs the given event by adding it to the queue.
     *
     * @param {log_evt} evt - The event object to be logged.
     * @return {Promise} A promise that resolves when the event is successfully added to the queue.
     */
    log(evt) {
        return queue.enqueue(evt);
    },
}
