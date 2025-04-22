export class Queue {
    #processing = false;
    #queue = [];
    #opts = {
        timeout: 1000 * 60,
        retries: 3,
        batch_size: 20,
        queue_size: 100_000,
    };

    constructor(opts) {
        this.opts = opts;
    }

    get opts() {
        return this.#opts;
    }

    set opts(v) {
        Object.assign(this.#opts, v);
    }

    get processing() {
        return this.#processing;
    }

    async _can_enqueue(item) {
        return true;
    };

    /**
     *
     * @param item
     * @param signal {AbortSignal}
     * @returns {Promise<boolean>}
     * @private
     */
    async _process_item(item, signal) {
        return true;
    };

    /**
     *
     * @param item
     * @returns {Promise<*>}
     * @private
     */
    async _enrich_item(item) {
        return item;
    };

    /**
     * Adds an item to the queue. If the queue exceeds the maximum size allowed, the oldest item is removed.
     * The method asynchronously processes the queue after adding a new item.
     *
     * @param {*} item - The item to be added to the queue.
     * @return {Promise<void>} A promise that resolves when the enqueue logic and any queue processing are initiated.
     */
    async enqueue(item) {
        if (!await this._can_enqueue(item)) return;

        item = await this._enrich_item(item) || item;

        if (this.#queue.length >= this.opts.queue_size) {
            const skipped = this.#queue.shift();
            console.log('skipping item in queue:', skipped);
        }

        this.#queue.push(item);

        await this.#process_queue();
    }

    /**
     * Processes tasks in the queue asynchronously while adhering to the batch size and retry limits.
     * Ensures only one execution of the queue processing occurs at a time.
     * The method fetches items from the queue in batches, processes them concurrently, and retries upon failure as per the configured maximum retries.
     *
     * @return {Promise<void>} Resolves when all tasks in the queue are successfully processed or appropriate errors are handled.
     */
    async #process_queue() {
        if (this.processing) return;

        this.#processing = true;

        while (this.#queue.length) {
            const to_run = this.#queue.splice(0, this.opts.batch_size);
            const promises = to_run.map(s => this.#process_item(s));
            await Promise.all(promises);
        }

        this.#processing = false;
    }

    async #process_item(item) {
        let timer;
        for (let i = 0; i <= this.opts.retries; i++) {
            const ac = new AbortController();
            timer = setTimeout(() => ac.abort('timeout'), this.opts.timeout);
            if (i > 0)
                console.log(i, 'retry for item', item);

            try {
                await this._process_item(item, ac.signal);
                return true;
            } catch (e) {
                console.log('Error during item processing:', e);
            } finally {
                clearTimeout(timer);
            }
        }

        console.error('max retries reached for item', item);
        return false;
    }
}