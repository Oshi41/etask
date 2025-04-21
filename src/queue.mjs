export class Queue {
    #processing = false;
    #queue = [];

    #max_size;
    #batch_size;
    #max_retries;
    #timeout;

    constructor({
                    can_enqueue = async (x) => true,
                    process_item = async (x) => true,
                    max_size = 100_000,
                    batch_size = 20,
                    max_retries = 3,
                    timeout_mls = 60*1000,
                } = {}) {
        this.#max_size = max_size;
        this.#batch_size = batch_size;
        this.#max_retries = max_retries;
        this.#timeout = timeout_mls;

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
            const skipped = this.#queue.shift();
            console.log('skipping item in queue:', skipped);)
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
            const promises = to_run.map(s => this.#process_item(s));
            await Promise.all(promises);
        }
        
        this.#processing = false;
    }
    
    #process_item(item) {
        let timer;
        for (let i = 0; i <= this.#max_retries; i++) {
            var ac = new AbortController();
            timer = setTimeout(()=> ac.abort('timeout'), this.#timeout);
            
            try {
                await this._process_item(item, ac.signal);
                return true;
            }
            catch (e) {
                console.log('Error during item processing:', e);
            } finally {
                clearTimeout(timer);
            }
        }
        
        console.error('max retries reached for item', item);
        return false;
    }
}