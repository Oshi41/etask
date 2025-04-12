/**
 * Factory for creating logging and monitoring components with async queue system
 */
export class log_entry_factory {
    // Default implementations
    static #defaultConfig = {
        // Default logging implementation uses console
        logger: {
            debug: (msg, ...args) => {
                console.debug(msg, ...args);
                return {};
            },
            info: (msg, ...args) => {
                console.info(msg, ...args);
                return {};
            },
            warn: (msg, ...args) => {
                console.warn(msg, ...args);
                return {};
            },
            error: (msg, ...args) => {
                console.error(msg, ...args);
                return {};
            },
            critical: (msg, ...args) => {
                console.error(`CRITICAL: ${msg}`, ...args);
                return {};
            }
        },

        // Default metrics implementation (no-op)
        metrics: {
            post: async (name, value, tags) => {
                // Default implementation just ignores metrics
                return true; // Always succeeds but doesn't do anything
            }
        },

        // Default timeline implementation uses Performance API
        timelineFactory: {
            create: (etaskInstance) => new DefaultTimeline(etaskInstance)
        }
    };

    // Current configuration (initialized with defaults)
    static #config = {...log_entry_factory.#defaultConfig};
    
    // Queue for metrics
    static #metricsQueue = [];

    // Queue for logs
    static #logsQueue = [];

    // Processing state
    static #isProcessingMetrics = false;
    static #isProcessingLogs = false;

    // Batch size for processing
    static #batchSize = 20;

    // Maximum queue size (to prevent memory issues)
    static #maxQueueSize = 10000;
    
    // Flush promises
    static #metricsFlushedResolvers = [];
    static #logsFlushedResolvers = [];

    /**
     * Configure the factory with custom implementations
     * @param {Object} options - Configuration options
     * @param {Object} [options.logger] - Custom logger implementation
     * @param {Object} [options.metrics] - Custom metrics implementation
     * @param {Object} [options.timelineFactory] - Custom timeline factory
     * @param {number} [options.batchSize] - Batch size for processing queues
     * @param {number} [options.maxQueueSize] - Maximum queue size
     */
    static configure(options = {}) {
        if (options.logger) {
            log_entry_factory.#config.logger = {
                ...log_entry_factory.#config.logger,
                ...options.logger
            };
        }

        if (options.metrics) {
            log_entry_factory.#config.metrics = {
                ...log_entry_factory.#config.metrics,
                ...options.metrics
            };
        }

        if (options.timelineFactory) {
            log_entry_factory.#config.timelineFactory = {
                ...log_entry_factory.#config.timelineFactory,
                ...options.timelineFactory
            };
        }

        if (options.batchSize) {
            log_entry_factory.#batchSize = options.batchSize;
        }

        if (options.maxQueueSize) {
            log_entry_factory.#maxQueueSize = options.maxQueueSize;
        }
    }

    /**
     * Reset the factory to default implementations
     */
    static resetToDefaults() {
        log_entry_factory.#config = {...log_entry_factory.#defaultConfig};
        log_entry_factory.#metricsQueue = [];
        log_entry_factory.#logsQueue = [];
        log_entry_factory.#isProcessingMetrics = false;
        log_entry_factory.#isProcessingLogs = false;
        log_entry_factory.#metricsFlushedResolvers = [];
        log_entry_factory.#logsFlushedResolvers = [];
    }

    /**
     * Creates a logger with the specified context
     * @param {string} context - The logging context (e.g., module name)
     * @returns {Object} - Logger object with logging methods
     */
    static createLogger(context) {
        return {
            debug: (msg, ...args) => {
                return log_entry_factory.#enqueueLog('debug', context, msg, args);
            },

            info: (msg, ...args) => {
                return log_entry_factory.#enqueueLog('info', context, msg, args);
            },

            warn: (msg, ...args) => {
                return log_entry_factory.#enqueueLog('warn', context, msg, args);
            },

            error: (msg, ...args) => {
                return log_entry_factory.#enqueueLog('error', context, msg, args);
            },

            critical: (msg, ...args) => {
                return log_entry_factory.#enqueueLog('critical', context, msg, args);
            }
        };
    }

    /**
     * Enqueues a log entry for processing
     * @param {string} level - Log level
     * @param {string} context - Log context
     * @param {string} message - Log message
     * @param {Array} args - Additional arguments
     * @returns {Object} - Result object
     * @private
     */
    static #enqueueLog(level, context, message, args) {
        // Check if we're at max queue size and either drop or process
        if (log_entry_factory.#logsQueue.length >= log_entry_factory.#maxQueueSize) {
            // In a real implementation, you might want to drop older logs or emit a warning
            log_entry_factory.#logsQueue.shift(); // Remove oldest log
        }

        // Add to queue
        log_entry_factory.#logsQueue.push({
            level,
            context,
            message,
            args: args || [],
            timestamp: Date.now()
        });

        // Ensure processing is started
        if (!log_entry_factory.#isProcessingLogs) {
            log_entry_factory.#processLogsQueue();
        }

        return {}; // Return immediately to not block caller
    }

    /**
     * Posts a metric (non-blocking, queues for processing)
     * @param {string} name - Metric name
     * @param {number} value - Metric value
     * @param {Object} [tags] - Optional tags for the metric
     * @returns {boolean} - Always returns true as processing is async
     */
    static postMetric(name, value, tags = {}) {
        // Check if we're at max queue size
        if (log_entry_factory.#metricsQueue.length >= log_entry_factory.#maxQueueSize) {
            // Remove oldest metric
            log_entry_factory.#metricsQueue.shift();
        }

        // Add to queue
        log_entry_factory.#metricsQueue.push({
            name,
            value,
            tags,
            timestamp: Date.now(),
            retryCount: 0
        });

        // Ensure processing is started
        if (!log_entry_factory.#isProcessingMetrics) {
            log_entry_factory.#processMetricsQueue();
        }

        return true; // Always return true as actual processing is async
    }

    /**
     * Creates a timeline object for the specified etask
     * @param {Object} etaskInstance - The etask instance to create a timeline for
     * @returns {Object} - A timeline object
     */
    static createTimeline(etaskInstance) {
        if (!etaskInstance) {
            throw new Error('etaskInstance is required for timeline creation');
        }

        return log_entry_factory.#config.timelineFactory.create(etaskInstance);
    }

    /**
     * Process the metrics queue asynchronously
     * @private
     */
    static async #processMetricsQueue() {
        if (log_entry_factory.#isProcessingMetrics) {
            return; // Already processing
        }

        log_entry_factory.#isProcessingMetrics = true;
        
        try {
            while (log_entry_factory.#metricsQueue.length > 0) {
                // Take a batch of metrics to process
                const batch = log_entry_factory.#metricsQueue.splice(0, log_entry_factory.#batchSize);
                const failedMetrics = [];

                // Process each metric in the batch
                await Promise.all(batch.map(async (metric) => {
                    try {
                        const success = await log_entry_factory.#config.metrics.post(
                            metric.name,
                            metric.value,
                            metric.tags
                        );

                        if (!success) {
                            // If posting failed, increment retry count and re-queue if under limit
                            metric.retryCount++;
                            if (metric.retryCount < 3) { // Max 3 retries
                                failedMetrics.push(metric);
                            }
                        }
                    } catch (err) {
                        // If there's an error, increment retry count and re-queue if under limit
                        metric.retryCount++;
                        if (metric.retryCount < 3) { // Max 3 retries
                            failedMetrics.push(metric);
                        }
                    }
                }));

                // Re-queue failed metrics
                if (failedMetrics.length > 0) {
                    log_entry_factory.#metricsQueue.unshift(...failedMetrics);
                }

                // Small delay to prevent CPU hogging
                await new Promise(resolve => setTimeout(resolve, 0));
            }
        } finally {
            log_entry_factory.#isProcessingMetrics = false;
            
            // Resolve any pending flush promises
            const resolvers = log_entry_factory.#metricsFlushedResolvers;
            log_entry_factory.#metricsFlushedResolvers = [];
            resolvers.forEach(resolve => resolve());
        }
    }

    /**
     * Process the logs queue asynchronously
     * @private
     */
    static async #processLogsQueue() {
        if (log_entry_factory.#isProcessingLogs) {
            return; // Already processing
        }

        log_entry_factory.#isProcessingLogs = true;
        
        try {
            while (log_entry_factory.#logsQueue.length > 0) {
                // Take a batch of logs to process
                const batch = log_entry_factory.#logsQueue.splice(0, log_entry_factory.#batchSize);
                const failedLogs = [];

                // Process each log in the batch
                for (const log of batch) {
                    try {
                        // Format the message with context
                        const formattedMsg = `[${log.context}] ${log.message}`;

                        // Call the appropriate logger method
                        const result = log_entry_factory.#config.logger[log.level](formattedMsg, ...log.args);
                        
                        // If logging failed, re-queue
                        if (result && result.failed) {
                            log.retryCount = (log.retryCount || 0) + 1;
                            if (log.retryCount < 3) { // Max 3 retries
                                failedLogs.push(log);
                            }
                        }
                    } catch (err) {
                        // If there's an error, increment retry count and re-queue if under limit
                        log.retryCount = (log.retryCount || 0) + 1;
                        if (log.retryCount < 3) { // Max 3 retries
                            failedLogs.push(log);
                        }
                    }
                }

                // Re-queue failed logs
                if (failedLogs.length > 0) {
                    log_entry_factory.#logsQueue.unshift(...failedLogs);
                }

                // Small delay to prevent CPU hogging
                await new Promise(resolve => setTimeout(resolve, 0));
            }
        } finally {
            log_entry_factory.#isProcessingLogs = false;
            
            // Resolve any pending flush promises
            const resolvers = log_entry_factory.#logsFlushedResolvers;
            log_entry_factory.#logsFlushedResolvers = [];
            resolvers.forEach(resolve => resolve());
        }
    }

    /**
     * Flushes all pending logs and metrics, waiting for them to be processed
     * @param {Object} [options] - Flush options
     * @param {boolean} [options.logs=true] - Whether to flush logs
     * @param {boolean} [options.metrics=true] - Whether to flush metrics
     * @param {number} [options.timeout=30000] - Timeout in milliseconds
     * @returns {Promise<boolean>} - Resolves to true if flush completed successfully
     */
    static async flush({logs = true, metrics = true, timeout = 30000} = {}) {
        const promises = [];

        if (logs && log_entry_factory.#logsQueue.length > 0) {
            const logsPromise = new Promise(resolve => {
                log_entry_factory.#logsFlushedResolvers.push(resolve);
                if (!log_entry_factory.#isProcessingLogs) {
                    log_entry_factory.#processLogsQueue();
                }
            });
            promises.push(logsPromise);
        }

        if (metrics && log_entry_factory.#metricsQueue.length > 0) {
            const metricsPromise = new Promise(resolve => {
                log_entry_factory.#metricsFlushedResolvers.push(resolve);
                if (!log_entry_factory.#isProcessingMetrics) {
                    log_entry_factory.#processMetricsQueue();
                }
            });
            promises.push(metricsPromise);
        }

        if (promises.length === 0) {
            return true; // Nothing to flush
        }

        // Add timeout to prevent hanging
        const timeoutPromise = new Promise(resolve => {
            setTimeout(() => resolve('timeout'), timeout);
        });

        // Wait for all promises or timeout
        const result = await Promise.race([
            Promise.all(promises).then(() => 'completed'),
            timeoutPromise
        ]);

        return result === 'completed';
    }

    /**
     * Get queue statistics (useful for monitoring and debugging)
     * @returns {Object} - Queue statistics
     */
    static getQueueStats() {
        return {
            metrics: {
                queueSize: log_entry_factory.#metricsQueue.length,
                isProcessing: log_entry_factory.#isProcessingMetrics,
                oldestEntry: log_entry_factory.#metricsQueue[0]?.timestamp || null
            },
            logs: {
                queueSize: log_entry_factory.#logsQueue.length,
                isProcessing: log_entry_factory.#isProcessingLogs,
                oldestEntry: log_entry_factory.#logsQueue[0]?.timestamp || null
            }
        };
    }
}

/**
 * Default implementation of a Timeline using Performance API
 */
class DefaultTimeline {
    #etaskInstance;
    #marks = [];
    #measures = [];
    #startTime = performance.now();

    /**
     * Creates a new DefaultTimeline instance
     * @param {Object} etaskInstance - The etask this timeline is associated with
     */
    constructor(etaskInstance) {
        this.#etaskInstance = etaskInstance;
        this.#markPoint('start'); // Always mark the start
    }

    /**
     * Mark a point in time with a label
     * @param {string} label - The label for this point in time
     * @returns {Object} - This timeline instance for chaining
     */
    markPoint(label) {
        return this.#markPoint(label);
    }

    /**
     * Internal implementation of markPoint that returns this instance
     * @param {string} label - The label for this point in time
     * @returns {Object} - This timeline instance for chaining
     * @private
     */
    #markPoint(label) {
        const markName = `${this.#etaskInstance.name || 'etask'}_${label}`;
        const time = performance.now();

        try {
            performance.mark(markName);
        } catch (e) {
            // Some environments might restrict performance API
            // Just continue with our own implementation
        }

        this.#marks.push({label, time, markName});
        return this;
    }

    /**
     * Measure time between two marked points
     * @param {string} name - The name for this measurement
     * @param {string} startMark - The starting mark label
     * @param {string} endMark - The ending mark label
     * @returns {Object} - This timeline instance for chaining
     */
    measure(name, startMark, endMark) {
        const startPoint = this.#marks.find(m => m.label === startMark);
        const endPoint = this.#marks.find(m => m.label === endMark);

        if (!startPoint || !endPoint) {
            throw new Error(`Cannot measure: marks not found`);
        }

        const measureName = `${this.#etaskInstance.name || 'etask'}_${name}`;
        const duration = endPoint.time - startPoint.time;

        try {
            performance.measure(measureName, startPoint.markName, endPoint.markName);
        } catch (e) {
            // Some environments might restrict performance API
            // Just continue with our own implementation
        }

        this.#measures.push({name, duration, measureName, startMark, endMark});
        
        // Post the measurement as a metric (non-blocking)
        log_entry_factory.postMetric(`timeline.${measureName}`, duration, {
            task: this.#etaskInstance.name || 'unnamed',
            start: startMark,
            end: endMark
        });

        return this;
    }

    /**
     * Ends the timeline and measures total duration
     * @param {string} [endLabel='end'] - Label for the end point
     * @returns {Object} - Measurements data
     */
    end(endLabel = 'end') {
        this.#markPoint(endLabel);
        this.measure('total', 'start', endLabel);

        return {
            taskName: this.#etaskInstance.name,
            startTime: this.#startTime,
            endTime: performance.now(),
            marks: this.#marks,
            measures: this.#measures,
            totalDuration: this.#measures.find(m => m.name === 'total')?.duration || 0
        };
    }

    /**
     * Gets all measurements from this timeline
     * @returns {Array} - List of measurements
     */
    getMeasurements() {
        return [...this.#measures];
    }

    /**
     * Gets all marks from this timeline
     * @returns {Array} - List of marks
     */
    getMarks() {
        return [...this.#marks];
    }
}