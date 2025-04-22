import {Logger} from './logger';

/**
 * Configuration options for the Queue
 */
export interface QueueOptions {
    /**
     * Timeout in milliseconds for processing items before aborting
     * @default 60000 (1 minute)
     */
    timeout?: number;

    /**
     * Number of retry attempts for failed processing
     * @default 3
     */
    retries?: number;

    /**
     * Maximum number of items to process concurrently
     * @default 20
     */
    batch_size?: number;

    /**
     * Maximum number of items to keep in the queue
     * @default 100000
     */
    queue_size?: number;

    /**
     * Represents an optional instance of the Logger used for logging activities within an application.
     * It can provide methods to log messages at various levels such as debug, info, warn, or error.
     *
     * The Logger instance can be utilized to track events, issues, or general application output,
     * aiding in debugging and monitoring.
     *
     * @type {Logger|undefined}
     */
    logger?: Logger;

    /**
     * Additional custom options that may be used by subclasses
     */
    [key: string]: any;
}

/**
 * A queue implementation for asynchronous batch processing of items
 * with retry capabilities and concurrency control.
 */
export class Queue {
    /**
     * Creates a new Queue instance
     * @param opts Configuration options
     */
    constructor(opts?: Partial<QueueOptions>);

    /**
     * Get the current queue options
     */
    get opts(): QueueOptions;

    /**
     * Set/update queue options
     */
    set opts(v: Partial<QueueOptions>);

    /**
     * Check if the queue is currently processing items
     */
    get processing(): boolean;

    /**
     * Adds an item to the queue. If the queue exceeds the maximum size allowed, the oldest item is removed.
     * The method asynchronously processes the queue after adding a new item.
     *
     * @param item - The item to be added to the queue.
     * @return A promise that resolves when the enqueue logic and any queue processing are initiated.
     */
    enqueue(item: any): Promise<void>;

    /**
     * Determines if an item can be enqueued
     * Override this method in subclasses to implement custom filtering logic
     *
     * @param item The item to check
     * @returns True if the item can be enqueued, false otherwise
     * @protected
     */
    protected _can_enqueue(item: any): Promise<boolean>;

    /**
     * Process a single item from the queue
     * Override this method in subclasses to implement custom processing logic
     *
     * @param item The item to process
     * @param signal An AbortSignal that will be triggered if processing times out
     * @returns True if processing was successful
     * @protected
     */
    protected _process_item(item: any, signal?: AbortSignal): Promise<boolean>;
}