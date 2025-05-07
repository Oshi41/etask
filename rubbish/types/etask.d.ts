import {IMark} from "./metric";

/**
 * Represents the current state of an ERunner execution.
 * This interface provides a readonly snapshot of the runner's execution state.
 */
interface ERunnerState {
    /** Indicates if the task has been started */
    readonly started: boolean;
    /** Indicates if the task completed successfully */
    readonly succeeded: boolean;
    /** Indicates if the task failed with an error */
    readonly failed: boolean;
    /** Indicates if the task has finished (either succeeded or failed) */
    readonly finished: boolean;
    /** Indicates if the task was cancelled before completion */
    readonly cancelled: boolean;

    /** The value returned by the task if it succeeded */
    readonly value?: any;
    /** The error thrown by the task if it failed */
    readonly error?: Error;
}

/**
 * Configuration options for task execution
 */
interface ETaskOptions {
    /**
     * Maximum number of concurrent child tasks
     * Defaults to 16 if not specified
     */
    readonly limit: number | 16;
}

/**
 * Represents a cancellable asynchronous task runner with Promise-like behavior.
 *
 * @template T The type of value that the runner resolves to
 */
export interface ERunner<T> {
    /**
     * Creates a new task runner
     *
     * @param fn The function that will be executed by this runner
     * @param options Optional configuration options
     */
    new(fn: () => PromiseLike<T>, options?: ETaskOptions);

    //#region PromiseLike

    /**
     * Attaches callbacks for the resolution and/or rejection of the runner
     *
     * @param resolve The callback to execute when the runner is resolved
     * @param reject The callback to execute when the runner is rejected
     * @returns This runner instance for chaining
     */
    then(resolve: (T: any) => any | PromiseLike<any> | this, reject: (e: Error) => any | PromiseLike<any> | this): this;

    /**
     * Attaches a callback for only the rejection of the runner
     *
     * @param reject The callback to execute when the runner is rejected
     * @returns This runner instance for chaining
     */
    catch(reject: (e: Error) => any | PromiseLike<any> | this): this;

    /**
     * Attaches a callback that is invoked when the runner is settled (either fulfilled or rejected)
     *
     * @param cb The callback to execute when the runner is settled
     * @returns This runner instance for chaining
     */
    finally(cb: () => any | PromiseLike<T> | this): this;

    //#endregion

    //#region PromiseWithResolvers

    /**
     * Resolves the runner with the specified value and stops execution immediately
     *
     * @param value The value to resolve the runner with
     * @returns This runner instance for chaining
     */
    return(value: T): this;

    /**
     * Rejects the runner with the specified error and stops execution immediately
     *
     * @param e The error to reject the runner with
     * @returns This runner instance for chaining
     */
    throw(e: Error): this;

    /**
     * Cancels the runner execution with an optional reason
     *
     * @param reason Optional error explaining why the task was cancelled
     * @returns This runner instance for chaining
     */
    cancel(reason?: Error): this;

    /**
     * Gets the current state of the runner
     */
    get state(): ERunnerState;

    //#endregion

    //#region Hierarchy

    /**
     * Spawns a child task from this runner
     *
     * @param child Either a Promise-like object or a function returning a Promise-like object
     * @returns This runner instance for chaining
     */
    spawn(child: PromiseLike<any> | (() => PromiseLike<any>)): this;

    /**
     * Waits for all spawned child tasks to complete
     *
     * @returns A Promise that resolves when all child tasks have completed
     */
    wait4children(): Promise<any>;

    /**
     * Gets the maximum number of concurrent child tasks allowed
     */
    get max_concurrency(): number;

    //#endregion

    //#region Helping methods

    /**
     * Pauses execution for the specified number of milliseconds
     *
     * @param mls Duration to sleep in milliseconds
     * @returns This runner instance for chaining
     */
    sleep(mls: number): this;

    /**
     * Converts this runner to a standard Promise
     *
     * @returns A Promise that resolves or rejects based on this runner's result
     */
    wait(): PromiseLike<T>;

    //#endregion

    //#region Metrics

    /**
     * Creates a timing mark with the given label and optional details
     *
     * @param label The name of the mark
     * @param detail Optional object with additional information
     * @returns The created mark
     */
    mark(label: string, detail?: object): IMark;

    /**
     * Gets all timing marks created during the execution of this runner
     */
    get timeline(): IMark[];

    //#endregion
}

/**
 * Factory interface for creating runner instances with specific argument and result types.
 * ETask functions as both a constructor and a callable function.
 *
 * @template TArgs The type of arguments that the task accepts
 * @template TRes The type of result that the task produces
 */
interface ETask<TArgs, TRes> extends Function {
    /**
     * Creates a new task
     *
     * @param fn The function that implements the task logic
     * @param options Optional configuration options
     */
    new(fn: (args: TArgs) => PromiseLike<TRes>, options?: ETaskOptions);

    /**
     * Gets the name of this task
     */
    get name(): string;

    /**
     * Executes the task with the provided arguments
     *
     * @param args Arguments to pass to the task function
     * @returns A runner that will execute the task
     * @note Calling throw() or return() within the task function will stop execution immediately
     */
    (args: TArgs): ERunner<TRes>;
}