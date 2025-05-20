import {assert, isFunc, isPrimitive, tryDispose} from "./global.mjs";
import {safeYield, toAsyncGen} from "./gen.mjs";
import {LinkedList} from "../list.mjs";

/**
 * Represents the state of an asynchronous event.
 * Contains details about the event type, payload, options, and its handling status.
 */
class AsyncEventState {
    constructor(type, payload, {stoppable = false, sender = null} = {}) {
        this.type = type;
        /**
         * Represents the payload data for a specific operation or request.
         * The content and structure of this property may vary depending on
         * the specific use case or function implementation.
         */
        this.payload = payload;

        /**
         * Represents whether an action or*/
        this.stoppable = stoppable;
        /**
         * A property indicating whether the specific event, action,
         * or process has been handled.
         * It is typically used as a flag to track the state or completion
         * of a particular operation.
         */
        this.wasHandled = false;
        /**
         * A property that indicates whether a specific process, action, or operation has been stopped.
         **/
        this.wasStopped = false;
        /**
         * Stores the reference to the original sender of a message or data.
         * This property is typically used to keep track of the original entity
         * that initiated a process or transmitted a message within a system.
         */
        this.originalSender = sender;
        /**** @type {Awaited<ReturnType<visit>>[]}*/
        this.visited = [];
    }
}

/**
 * Represents the state of a subscription for an event-based system.
 * This class tracks attributes and behaviors of a subscription, ensuring proper handling
 * of callbacks, priorities, and constraints like the maximum number of allowed calls.
 */
class SubscriptionState {
    #state;

    /**
     * Creates a new subscription state object with the specified type, callback, and options.
     *
     * @param {string} type - The type of the subscription.
     * @param {(e: AsyncEvent) => Promise} callback - The callback function to be executed when the subscription is invoked.
     * @param {Object} [opts={}] - Optional parameters for configuring the subscription.
     * @param {number} [opts.max] - the subscription is automatically removed after the exact count of invocation.
     * @param {boolean} [opts.weak] - If true, the subscription is considered weak and does not prevent garbage collection.
     * @param {any} [opts.sender] - possible sibscription sender.
     **/
    constructor(type, callback, opts = {}) {
        assert(!type, 'Unknown event type provided');
        assert(isFunc(callback), 'callback must be a function');

        this.type = type;
        /**
         * Represents the 'calls' property, which typically stores a reference to a data structure or value
         * associated with calls or invocations in the application.
         */
        this.calls = 0;
        /**
         * Represents the maximum number of allowable calls.
         * This property is used to define and enforce a limit
         * on the total number of actions or invocations permitted.
         *
         * @type {number}
         */
        this.maxCalls = opts.max;

        this.#state = {
            callback: opts.weak ? new WeakRef(callback) : {deref: () => callback},
            sender: opts.weak && !isPrimitive(opts.sender) ? new WeakRef(opts.sender) : {deref: () => opts.sender},
        };
    }

    /**
     * Retrieves the current callback function if it exists and is still accessible.
     *
     * @return {((e: AsyncEvent) => Promise)|undefined} The callback function if it is available; otherwise, undefined.
     */
    get callback() {
        return this.#state?.callback?.deref();
    }

    /**
     * Retrieves the sender from the current state, if available.
     * The sender is obtained by dereferencing a weak reference.
     *
     * @return {Object|undefined} The sender object if present, or undefined if it does not exist.
     */
    get sender() {
        return this.#state?.sender?.deref();
    }

    /**
     * Checks if the current object or resource has been disposed.
     *
     * Determines whether the associated callback has been set to null,
     * indicating the disposal of the resource or object.
     *
     * @return {boolean} Returns true if the resource or object has been disposed,
     * otherwise false.
     */
    isDisposed() {
        return this.callback == null;
    }

    /**
     * Releases resources and performs cleanup tasks.
     * Ensures that the instance is marked as disposed, preventing further use.
     *
     * @return {void} Does not return a value.
     */
    dispose() {
        if (this.isDisposed()) return;

        this.#state = {};
    }

    [Symbol.dispose]() {
        this.dispose();
    }
}

/**
 * event User API
 */
class AsyncEvent {
    #state;
    #sub;
    #visit;

    /**
     *
     * @param state {AsyncEventState}
     * @param sub {SubscriptionState}
     * @param visit
     */
    constructor(state, sub, visit) {
        this.#state = state;
        this.#sub = sub;
        this.#visit = visit;
    }

    /**
     * Retrieves the type property from the internal state.
     *
     * @return {string} The type associated with the current state.
     */
    get type() {
        return this.#state.type;
    }

    /**
     * Retrieves the payload from the current state.
     *
     * @return {*} The payload stored in the current state.
     */
    get payload() {
        return this.#state.payload;
    }

    /**
     * Retrieves the sender property from the internal subproperty.
     *
     * @return {any} The sender value from the internal subproperty.
     */
    get sender() {
        return this.#sub.sender;
    }

    /**
     * Retrieves the original sender from the state.
     *
     * @return {string} The original sender.
     */
    get originalSender() {
        return this.#state.originalSender;
    }

    /**
     * Determines whether the current state allows stopping.
     * This method evaluates if the instance is in a stoppable state.
     *
     * @return {boolean} Returns true if the instance can stop, false otherwise.
     */
    get canStop() {
        return this.#state.stoppable;
    }

    /**
     * Getter method to check if the state indicates that an operation or process was stopped.
     *
     * @return {boolean} Returns true if the operation or process was stopped, otherwise false.
     */
    get wasStopped() {
        return this.#state.wasStopped;
    }

    /**
     * Determines if the current state has been handled.
     *
     * @return {boolean} True if the state was handled, otherwise false.
     */
    get wasHandled() {
        return this.#state.wasHandled;
    }

    /**
     * Handles the current state by updating the internal flags.
     * Marks the visit and state as handled.
     *
     * @return {void} Does not return any value.
     */
    handle() {
        this.#visit.wasHandled = this.#state.wasHandled = true;
    }

    /**
     * Stops the current process or activity if allowed.
     * Sets the internal state to indicate the process has been stopped.
     *
     * @return {void} No return value.
     */
    stop() {
        if (this.canStop)
            this.#visit.wasStopped = this.#state.wasStopped = true;
    }
}

/**
 * Represents an asynchronous event store for managing subscriptions and handling events.
 * Provides functionality to add, remove, and asynchronously process events and associated
 * subscriptions.
 */
class AsyncEventStore {
    #type;
    #callback2nodeMap;
    #subscriptions;

    constructor(type) {
        this.#type = type;
        this.#callback2nodeMap = new WeakMap();
        this.#subscriptions = new LinkedList();
    }

    /**
     * Retrieves the type of the object.
     *
     * @return {*} The type associated with this object.
     */
    get type() {
        return this.#type;
    }

    /**
     * Adds a new subscription with the specified callback and options.
     *
     * @param {(e: AsyncEvent) => Promise} callback - The callback function to be executed when the subscription is invoked.
     * @param {Object} [options={}] - Optional parameters for configuring the subscription.
     * @param {boolean} [options.once=false] - If true, the subscription is automatically removed after the first invocation.
     * @param {boolean} [options.weak=false] - If true, the subscription is considered weak and does not prevent garbage collection.
     * @param {*} [options.sender] - An optional sender associated with the subscription.
     * @param {boolean} [options.prepend=false] - If true, the subscription is added to the beginning of the subscription list.
     * @return {Function|undefined} - Returns a discard function to dispose of the subscription, or undefined if the subscription was not added.
     */
    add(callback, options = {}) {
        let node = this.#callback2nodeMap.get(callback);

        if (!node) {
            const sub = new SubscriptionState(this.#type, callback, {
                max: options.once ? 1 : Number.MAX_VALUE,
                weak: options.weak,
                sender: options.sender,
            });

            node = options.prepend
                ? this.#subscriptions.insertValue(sub, 0, 'before')
                : this.#subscriptions.insertValue(sub, -1, 'after');

            if (node) {
                sub.discard = () => tryDispose(node);
                this.#callback2nodeMap.set(callback, node);
            }
        }

        return node ? node.value.discard : undefined;
    }

    /**
     * Removes the node associated with the given callback and disposes it if possible.
     *
     * @param {(e: AsyncEvent) => Promise} callback - The callback function whose associated node is to be removed.
     * @return {boolean} Returns true if the node was successfully disposed; otherwise, false.
     */
    remove(callback) {
        const node = this.#callback2nodeMap.get(callback);
        return node && !!tryDispose(node);
    }

    /**
     * Asynchronously handles the subscribed callbacks based on the given state.
     * Iterates through the internal list of subscriptions, processes them, and yields key events
     * and intermediate states during execution.
     *
     * @param {AsyncEventState} state - The current state object tracking progress and any interruptions.
     *   - state.wasStopped: {boolean} Indicates if the process should be halted.
     *   - state.visited: {Array} A list to track information of each processed subscription.
     *
     * @return {AsyncGenerator} Yields intermediate steps, subscription objects, and execution states.
     *   - Yields subscription objects from the internal list.
     *   - Yields discarded subscriptions for cleanup.
     *   - Yields execution events and states including errors, timing, and the resulting object.
     *   - Throws information regarding any errors encountered while processing.
     */
    async* handle(state) {
        for (let sub of this.#subscriptions) {
            if (state.wasStopped) break;

            yield sub;

            // already disposed
            if (!sub.callback) {
                yield sub.discard();
                continue;
            }

            const visited = {
                start: null,
                end: null,
                error: null,
                wasHandled: false,
                wasStopped: false,
                sub: sub,
                store: this,
            };
            state.visited.push(visited);
            yield visited;

            try {
                visited.start = Date.now();
                const func = toAsyncGen(sub.callback);
                const funcCall = func.call(this, new AsyncEvent(state, sub, visited));
                const safeGen = safeYield(funcCall);
                for await (let step of safeGen) {
                    yield step;
                }
            } catch (e) {
                visited.error = e;
                throw visited;
            } finally {
                visited.end = Date.now();
                sub.calls++;

                if (sub.maxCalls > 0 && sub.maxCalls >= sub.calls) {
                    sub.discard();
                }
            }
        }
    }

    [Symbol.dispose]() {
        for (let sub of this.#subscriptions) {
            sub.discard();
        }
    }
}

/**
 * Represents an asynchronous event target for managing event stores.
 * Provides functionality to add, remove, and asynchronously process events and associated
 * subscriptions.
 *
 * @example
 * const target = new AsyncEventTarget();
 * const store = target.add('test', (e) => {
 *     console.log(e.payload);
 * });
 * yield* target.rise('test', {hello: 'world'});
 */
export class AsyncEventTarget {
    /** @type {Map<string, AsyncEventStore>}*/
    #stores = new Map();

    /**
     * Adds a callback for a specified type, managing it within an event store.
     *
     * @param {string} type - The type of event to add the callback for.
     * @param {(e: AsyncEvent) => Promise} callback - The function to be called when the event is triggered.
     * @param {Object} [options={}] - Optional parameters for managing the callback behavior.
     * @return {boolean} Returns true if the callback was successfully added, otherwise false.
     */
    add(type, callback, options = {}) {
        let store = this.#stores.get(type);
        if (!store) this.#stores.set(type, store = new AsyncEventStore(type));

        return store.add(callback, options);
    }

    /**
     * Removes an item from the specified store type based on the provided callback.
     *
     * @param {string} type - The type of the store from which the item should be removed.
     * @param {(e: AsyncEvent) => Promise} callback - A function used to identify the item(s) to be removed.
     *                              The function should return a boolean indicating
     *                              whether the item matches the criteria for removal.
     * @return {boolean} - Returns true if the item was successfully removed,
     *                     otherwise returns false if*/
    remove(type, callback) {
        const store = this.#stores.get(type);
        if (!store) return false;

        return store.remove(callback);
    }

    /**
     * Asynchronously iterates over events handled by the store for a given type, emitting state updates.
     *
     * @param {string} type - The type of event to be handled.
     * @param {*} payload - The payload associated with the event.
     * @param {Object} [opts] - Additional options to be passed to the event state.
     * @return {AsyncGenerator} An asynchronous generator yielding the results of the event handling process, followed by the final state.
     */
    async* rise(type, payload, opts) {
        const store = this.#stores.get(type);
        if (store) {
            const state = new AsyncEventState(type, payload, opts);
            yield* store.handle(state);
            return state;
        }
    }

    [Symbol.dispose]() {
        for (let store of this.#stores.values()) {
            store[Symbol.dispose]();
        }
        this.#stores.clear();
    }
}