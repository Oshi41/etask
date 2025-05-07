/**
 * Runner context that provides callback registration methods
 */
export interface RunnerContext {
    /**
     * Registers a callback to be executed when the runner completes, regardless of success or failure
     * @param cb The callback function to execute
     */
    finally(cb: () => void): void;

    /**
     * Registers a callback to be executed when the runner encounters an error
     * @param cb The callback function to execute
     */
    catch(cb: () => void): void;

    /**
     * Registers a callback to be executed when the runner completes successfully
     * @param cb The callback function to execute with the result
     */
    then<T>(cb: (result: T) => void): void;
}

/**
 * Synchronous function to be executed with a runner
 * @template T The return type of the function
 */
export interface RunnerFunction<T = any> {
    /**
     * @this RunnerContext
     * @returns The result of the function execution
     */
    (this: RunnerContext): T;
}

/**
 * Asynchronous function to be executed with a runner
 * @template T The return type of the function
 */
export interface AsyncRunnerFunction<T = any> {
    /**
     * @this RunnerContext
     * @returns A promise resolving to the result of the function execution
     */
    (this: RunnerContext): Promise<T>;
}

/**
 * Executes a function with a runner context that provides callback registration
 * @param run The function to execute
 * @returns The result of the function execution
 */
export function runner<T = any>(run: RunnerFunction<T>): T;

/**
 * Executes an async function with a runner context that provides callback registration
 * @param run The async function to execute
 * @returns A promise resolving to the result of the function execution
 */
export function async_runner<T = any>(run: AsyncRunnerFunction<T>): Promise<T>;

/**
 * Extends the Date prototype with a format method
 */
declare global {
    interface Date {
        /**
         * Formats a date according to the specified format string
         * @param strf The format string pattern
         * @param locale The locale to use for formatting (default: 'en-US')
         * @returns The formatted date string
         *
         * Available format tokens:
         * - yyyy: 4-digit year
         * - yy: 2-digit year
         * - MMMM: full month name
         * - MMM: abbreviated month name
         * - MM: 2-digit month
         * - M: numeric month
         * - dd: 2-digit day
         * - d: numeric day
         * - HH: 2-digit hour
         * - H: numeric hour
         * - mm: 2-digit minute
         * - m: numeric minute
         * - ss: 2-digit second
         * - s: numeric second
         * - SSS: milliseconds (3 digits)
         * - SS: milliseconds (2 digits)
         * - S: milliseconds (1 digit)
         */
        format(strf: string, locale?: string): string;
    }
}

export {};