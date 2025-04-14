/**
 * A simple metric system for performance tracking and logging.
 *
 * This system provides interfaces for:
 * - Logging at different severity levels
 * - Time measurement and performance tracking
 * - Metrics collection and reporting
 *
 * The core component is the IMark interface which combines logging,
 * timeline measurement, and metric collection capabilities.
 */

/**
 * Defines logging operations at various severity levels.
 * Each method returns the instance for method chaining.
 */
interface ILogItem {
    /**
     * Log trace-level messages for detailed debugging.
     * @param messages - Any values to be logged
     * @returns The current instance for chaining
     */
    trace(...messages: any): this;

    /**
     * Log debug-level messages for development information.
     * @param messages - Any values to be logged
     * @returns The current instance for chaining
     */
    debug(...messages: any): this;

    /**
     * Log informational messages for general operational events.
     * @param messages - Any values to be logged
     * @returns The current instance for chaining
     */
    info(...messages: any): this;

    /**
     * Log standard messages (equivalent to info in many systems).
     * @param messages - Any values to be logged
     * @returns The current instance for chaining
     */
    log(...messages: any): this;

    /**
     * Log warning messages for concerning but non-critical issues.
     * @param messages - Any values to be logged
     * @returns The current instance for chaining
     */
    warn(...messages: any | Error): this;

    /**
     * Log error messages for operational failures.
     * @param messages - Any values to be logged
     * @returns The current instance for chaining
     */
    error(...messages: any | Error): this;
}

/**
 * Defines timeline measurement operations for performance tracking.
 */
interface ITimeline {
    /**
     * Measures elapsed time from a previous mark, metric, or timestamp.
     * Used for timing operations and performance measurement.
     *
     * @param start - The starting point for measurement, can be a mark object,
     *                a label string, or a timestamp number
     * @returns The current instance for chaining
     */
    measure_from(start: IMark | string | number): this;
}

/**
 * Defines metric collection operations for tracking various measurements.
 */
interface IMetric {
    /**
     * Increments a counter metric by the specified value.
     * Useful for tracking event counts (e.g., requests, actions).
     *
     * @param by - The amount to increment the metric by
     * @returns The current instance for chaining
     */
    inc(by: number): this;

    /**
     * Records detailed information about the metric.
     * Used for providing context or additional data points.
     *
     * @param details - Detailed information to record
     * @returns The current instance for chaining
     */
    hist(details: any): this;

    /**
     * Sets a global level for the metric.
     * Useful for defining thresholds or target values.
     *
     * @param level - The level value to set
     * @returns The current instance for chaining
     */
    set_level(level: number): this;

    /**
     * Records a local minimum value for the metric.
     * Useful for tracking performance bounds or resource usage floors.
     *
     * @param level - The minimum value to record
     * @returns The current instance for chaining
     */
    min(level: number): this;

    /**
     * Records a local maximum value for the metric.
     * Useful for tracking performance bounds or resource usage ceilings.
     *
     * @param level - The maximum value to record
     * @returns The current instance for chaining
     */
    max(level: number): this;
}

/**
 * The main interface that combines logging, timeline measurement, and metric
 * collection capabilities into a single mark point in the system.
 *
 * A mark represents a specific point or event in the application's execution
 * that can be used for logging, performance measurement, and metric collection.
 */
export interface IMark extends ITimeline, IMetric, ILogItem {
    /**
     * A descriptive label for the mark point.
     * Used to identify the mark in logs and reports.
     */
    readonly label: string;

    /**
     * The timestamp when this mark was created.
     * Used for temporal tracking and measurement.
     */
    readonly timestamp: string;

    /**
     * Additional contextual information associated with this mark.
     */
    readonly details: object;

    /**
     * Enriches the mark with additional details.
     * Allows for adding context to marks after creation.
     *
     * @param details - Additional information to associate with the mark
     * @returns The current instance for chaining
     */
    with(details: any): this;

    /**
     * Converts the mark to a JSON-serializable object.
     * Used for data transmission or persistence.
     *
     * @returns A JSON-serializable representation of the mark
     */
    toJSON(): any;
}