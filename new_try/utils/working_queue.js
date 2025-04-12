import {units} from "../date/part.js";

/**
 * @template {Object} T item type
 */
export class working_queue {
    #processing = false;
    #queue = [];

    #max_size;
    #batch_size;
    #max_retries;
    #item_process_timeout;

    constructor({
                    can_enqueue = async (x) => true,
                    process_item = async (x) => true,
                    max_size = 100_000,
                    batch_size = 20,
                    max_retries = 3,
                    item_process_timeout = units.NS.min,
                } = {}) {
        this.#max_size = max_size;
        this.#batch_size = batch_size;
        this.#max_retries = max_retries;
        this.#item_process_timeout = item_process_timeout;

        this._can_enqueue = can_enqueue;
        this._process_item = process_item;
    }

    /**
     * Adds an item to the queue. If the queue exceeds the maximum size allowed, the oldest item is removed.
     * The method asynchronously processes the queue after adding a new item.
     *
     * @param {*} item - The item to be added to the queue.
     * @return {Promise<void>} A promise that resolves when the enqueue logic and any queue processing are initiated.
     */
    async enqueue(item) {
        if (!await this._can_enqueue(item)) return;

        if (this.#queue.length >= this.#max_size) {
            this.#queue.shift();
        }

        this.#queue.push(item);

        this.#process_queue().finally(() => this.#processing = false);
    }

    /**
     * Processes tasks in the queue asynchronously while adhering to the batch size and retry limits.
     * Ensures only one execution of the queue processing occurs at a time.
     * The method fetches items from the queue in batches, processes them concurrently, and retries upon failure as per the configured maximum retries.
     *
     * @return {Promise<void>} Resolves when all tasks in the queue are successfully processed or appropriate errors are handled.
     */
    async #process_queue() {
        if (this.#processing) return;

        this.#processing = true;
        const self = this;

        while (this.#queue.length) {
            const to_run = this.#queue.splice(0, this.#batch_size);

            await Promise.all(to_run.map(item => async function () {
                for (let i = 0; i <= self.#max_retries; i++) {
                    try {
                        return await self._process_item(item);
                    } catch (e) {
                        if (e.remove) return;
                    }
                }

                throw new Error('max retries');
            }()));
        }
    }
}