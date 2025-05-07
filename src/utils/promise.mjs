import './proxy.mjs';

/**
 * Extends Promise with a wrap method that transforms a function into a Promise-based API.
 * The wrapped function gains Promise-like behavior plus additional control methods.
 *
 * @param {Function} fn - The function to be wrapped with Promise functionality
 * @returns {Function} A function that returns a Promise and has Promise-like chain methods
 * @example
 * const wrappedFn = Promise.wrap(function(a, b) {
 *   return a + b; // or use this.return(value) for early returns
 * });
 *
 * // Can be used with async/await
 * const result = await wrappedFn(1, 2); // 3
 *
 * // Or with Promise chaining
 * wrappedFn(1, 2)
 *   .then(result => console.log(result)) // 3
 *   .catch(err => console.error(err))
 *   .finally(() => console.log('Done'));
 */
Promise.wrap = function (fn) {
    const pwr = Promise.withResolvers();

    /**
     * API object containing methods that will be accessible to the wrapped function
     * through its 'this' context and also attached to the function itself
     * @type {Object}
     */
    const api = {
        /**
         * Attaches fulfillment and rejection handlers to the promise
         *
         * @param {Function} resolve - Function to call when promise is fulfilled
         * @param {Function} reject - Function to call when promise is rejected
         * @returns {Object} The wrapped function for chaining
         */
        then: function (resolve, reject) {
            pwr.promise = pwr.promise.then(resolve, reject);
            return this;
        },

        /**
         * Attaches a rejection handler to the promise
         *
         * @param {Function} reject - Function to call when promise is rejected
         * @returns {Object} The wrapped function for chaining
         */
        catch: function (reject) {
            pwr.promise = pwr.promise.then(null, reject);
            return this;
        },

        /**
         * Attaches a handler that is invoked regardless of the promise's fate
         *
         * @param {Function} cb - Function to call when promise is settled
         * @returns {Object} The wrapped function for chaining
         */
        finally: function (cb) {
            pwr.promise = pwr.promise.finally(cb);
            return this;
        },

        /**
         * Immediately resolves the promise with the provided value
         * and short-circuits the function's execution
         *
         * @param {*} value - Value to resolve the promise with
         * @returns {Object} The wrapped function for chaining
         */
        return: function (value) {
            pwr.resolve(value);
            return this;
        },

        /**
         * Immediately rejects the promise with the provided error
         * and short-circuits the function's execution
         *
         * @param {Error|*} err - Error to reject the promise with
         * @returns {Object} The wrapped function for chaining
         */
        throw: function (err) {
            pwr.reject(err);
            return this;
        },

        /**
         * Sleep method inherited from Promise.prototype.sleep
         * for convenient use within the wrapped function
         */
        sleep: Promise.prototype.sleep,
    };

    /**
     * The wrapped function that provides Promise-like behavior
     *
     * @param {...*} args - Arguments to pass to the original function
     * @returns {Promise} A promise that resolves/rejects based on the function's result
     */
    const result = async function wrapPromise(...args) {
        // Create a proxy that merges the original 'this' context with our API
        const thisArg = Proxy.this(this, api);

        try {
            // Execute the function and resolve the promise with its result
            pwr.resolve(await fn.apply(thisArg, args));
        } catch (e) {
            // If the function throws, reject the promise
            pwr.reject(e);
        }

        // Return the promise for async/await usage
        return await pwr.promise;
    };

    // Copy the API methods to the function itself for direct access
    Object.assign(result, api);

    return result;
};

/**
 * Extends Promise prototype with a sleep method that creates a delay.
 * This allows for more readable asynchronous code with delays.
 *
 * @param {number} ms - Number of milliseconds to sleep
 * @returns {Promise} A promise that resolves after the specified delay
 * @example
 * // Using in a Promise chain
 * Promise.resolve()
 *   .then(() => console.log("Start"))
 *   .sleep(1000)
 *   .then(() => console.log("After 1 second"));
 *
 * // Using with async/await
 * async function example() {
 *   console.log("Start");
 *   await Promise.resolve().sleep(1000);
 *   console.log("After 1 second");
 * }
 */
Promise.sleep = function (ms) {
    const pwr = Promise.withResolvers();
    // Set up a timer to resolve the promise after the specified delay
    const timer = setTimeout(pwr.resolve, ms);
    // Ensure the timer is cleared when the promise is settled to prevent memory leaks
    return pwr.promise.finally(() => clearTimeout(timer));
};