import './func.mjs';

/**
 * Extends Promise prototype with a sleep method that creates a delay.
 * This allows for more readable asynchronous code with delays.
 *
 * @param {number} ms - Number of milliseconds to sleep
 * @returns {(mls) => Promise} A promise that resolves after the specified delay
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
Promise.sleep = async function (ms) {
    const pwr = Promise.withResolvers();
    // Set up a timer to resolve the promise after the specified delay
    const timer = setTimeout(pwr.resolve, ms);
    // Ensure the timer is cleared when the promise is settled to prevent memory leaks
    return await pwr.promise.finally(() => clearTimeout(timer));
};