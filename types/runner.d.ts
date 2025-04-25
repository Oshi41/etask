/**
 * Context object available inside a runner function via 'this'
 * @template T returning function type
 */
export interface RunnerContext<T> {
    /**
     * Registers a callback to be executed when the runner completes, regardless of success or failure
     * @param cb The callback function to execute
     * @returns The runner instance for chaining
     */
    finally(cb: () => void): this;

    /**
     * Registers callbacks for successful execution
     * @param reject Optional callback for handling rejections
     * @param resolve Optional callback for handling successful results
     * @returns The runner instance for chaining
     */
    then(resolve?: ((result: T) => void) | null, reject?: ((error: Error) => void) | null,): this;

    /**
     * Registers a callback for handling errors
     * @param reject Callback for handling rejections
     * @returns The runner instance for chaining
     */
    catch(reject: (error: any) => void): this;
}

/**
 * Function type that can be used with the runner
 * The function receives any number of arguments and has access to runner context via 'this'
 */
export type RunnerFunction<T = any> = (this: RunnerContext<T>, ...args: any[]) => T;

/**
 * Creates a new runner with the specified function
 * @param fn The function to be executed by the runner
 * @returns A new runner instance
 *
 * @example
 * // Basic usage
 * const result = runner(function() {
 *   // do something
 *   return value;
 * }).run();
 *
 * @example
 * // Using 'this' context for finally
 * runner(function(...args) {
 *   this.finally(() => console.log('Done!'));
 *   // do something with args
 * }).run(1, 2, 3);
 */
export function runner<T>(fn: RunnerFunction<T>): RunnerFunction<T>;