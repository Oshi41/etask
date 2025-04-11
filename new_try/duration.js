/**
 * Same as TimeSpan in c# - with lots of helping methods
 * Represents a time interval with various time unit representations
 */
export class duration {
    #totalMilliseconds = 0;

    /**
     * Creates a new duration instance
     * @param {number|Date|duration} value - A millisecond value, Date object, or another duration
     */
    constructor(value) {
        if (value instanceof Date) {
            this.#totalMilliseconds = value.getTime();
        } else if (value instanceof duration) {
            this.#totalMilliseconds = value.totalMilliseconds;
        } else if (typeof value === 'number') {
            this.#totalMilliseconds = value;
        } else {
            this.#totalMilliseconds = 0;
        }
    }

    // Getters for different time units

    /**
     * Gets the total number of milliseconds represented by this duration
     * @returns {number}
     */
    get totalMilliseconds() {
        return this.#totalMilliseconds;
    }

    /**
     * Gets the total number of seconds represented by this duration
     * @returns {number}
     */
    get totalSeconds() {
        return this.#totalMilliseconds / 1000;
    }

    /**
     * Gets the total number of minutes represented by this duration
     * @returns {number}
     */
    get totalMinutes() {
        return this.#totalMilliseconds / (1000 * 60);
    }

    /**
     * Gets the total number of hours represented by this duration
     * @returns {number}
     */
    get totalHours() {
        return this.#totalMilliseconds / (1000 * 60 * 60);
    }

    /**
     * Gets the total number of days represented by this duration
     * @returns {number}
     */
    get totalDays() {
        return this.#totalMilliseconds / (1000 * 60 * 60 * 24);
    }

    /**
     * Gets the milliseconds component (0-999)
     * @returns {number}
     */
    get milliseconds() {
        return Math.floor(this.#totalMilliseconds % 1000);
    }

    /**
     * Gets the seconds component (0-59)
     * @returns {number}
     */
    get seconds() {
        return Math.floor((this.#totalMilliseconds / 1000) % 60);
    }

    /**
     * Gets the minutes component (0-59)
     * @returns {number}
     */
    get minutes() {
        return Math.floor((this.#totalMilliseconds / (1000 * 60)) % 60);
    }

    /**
     * Gets the hours component (0-23)
     * @returns {number}
     */
    get hours() {
        return Math.floor((this.#totalMilliseconds / (1000 * 60 * 60)) % 24);
    }

    /**
     * Gets the days component
     * @returns {number}
     */
    get days() {
        return Math.floor(this.#totalMilliseconds / (1000 * 60 * 60 * 24));
    }

    /**
     * Gets ticks (1 tick = 0.1ms)
     * @returns {number}
     */
    get ticks() {
        return this.#totalMilliseconds * 10;
    }

    // Static methods for creating durations

    /**
     * Creates a duration from a specified number of days
     * @param {number} days
     * @returns {duration}
     */
    static fromDays(days) {
        return new duration(days * 24 * 60 * 60 * 1000);
    }

    /**
     * Creates a duration from a specified number of hours
     * @param {number} hours
     * @returns {duration}
     */
    static fromHours(hours) {
        return new duration(hours * 60 * 60 * 1000);
    }

    /**
     * Creates a duration from a specified number of minutes
     * @param {number} minutes
     * @returns {duration}
     */
    static fromMinutes(minutes) {
        return new duration(minutes * 60 * 1000);
    }

    /**
     * Creates a duration from a specified number of seconds
     * @param {number} seconds
     * @returns {duration}
     */
    static fromSeconds(seconds) {
        return new duration(seconds * 1000);
    }

    /**
     * Creates a duration from a specified number of milliseconds
     * @param {number} milliseconds
     * @returns {duration}
     */
    static fromMilliseconds(milliseconds) {
        return new duration(milliseconds);
    }

    // Arithmetic operations

    /**
     * Adds another duration to this one
     * @param {duration|number} other - The duration to add
     * @returns {duration} A new duration instance
     */
    add(other) {
        const otherMs = other instanceof duration ? other.totalMilliseconds : +other;
        return new duration(this.#totalMilliseconds + otherMs);
    }

    /**
     * Subtracts another duration from this one
     * @param {duration|number} other - The duration to subtract
     * @returns {duration} A new duration instance
     */
    subtract(other) {
        const otherMs = other instanceof duration ? other.totalMilliseconds : +other;
        return new duration(this.#totalMilliseconds - otherMs);
    }

    /**
     * Multiplies this duration by a factor
     * @param {number} factor - The factor to multiply by
     * @returns {duration} A new duration instance
     */
    multiply(factor) {
        return new duration(this.#totalMilliseconds * factor);
    }

    /**
     * Divides this duration by a divisor
     * @param {number} divisor - The divisor to divide by
     * @returns {duration} A new duration instance
     */
    divide(divisor) {
        return new duration(this.#totalMilliseconds / divisor);
    }

    // Comparison methods

    /**
     * Determines if this duration equals another duration
     * @param {duration|number} other - The duration to compare to
     * @returns {boolean}
     */
    equals(other) {
        const otherMs = other instanceof duration ? other.totalMilliseconds : +other;
        return this.#totalMilliseconds === otherMs;
    }

    /**
     * Determines if this duration is less than another duration
     * @param {duration|number} other - The duration to compare to
     * @returns {boolean}
     */
    lessThan(other) {
        const otherMs = other instanceof duration ? other.totalMilliseconds : +other;
        return this.#totalMilliseconds < otherMs;
    }

    /**
     * Determines if this duration is greater than another duration
     * @param {duration|number} other - The duration to compare to
     * @returns {boolean}
     */
    greaterThan(other) {
        const otherMs = other instanceof duration ? other.totalMilliseconds : +other;
        return this.#totalMilliseconds > otherMs;
    }

    /**
     * Returns a formatted string representation of this duration
     * @returns {string}
     */
    toString() {
        const parts = [];

        if (this.days > 0) {
            parts.push(`${this.days} day${this.days !== 1 ? 's' : ''}`);
        }

        if (this.hours > 0) {
            parts.push(`${this.hours.toString().padStart(2, '0')} hour${this.hours !== 1 ? 's' : ''}`);
        }

        if (this.minutes > 0) {
            parts.push(`${this.minutes.toString().padStart(2, '0')} minute${this.minutes !== 1 ? 's' : ''}`);
        }

        if (this.seconds > 0) {
            parts.push(`${this.seconds.toString().padStart(2, '0')} second${this.seconds !== 1 ? 's' : ''}`);
        }

        if (this.milliseconds > 0 || parts.length === 0) {
            parts.push(`${this.milliseconds.toString().padStart(3, '0')} ms`);
        }

        return parts.join(', ');
    }

    /**
     * Returns a short formatted string (e.g. "01:23:45.678")
     * @returns {string}
     */
    toTimeString() {
        const parts = [];

        if (this.days > 0) {
            parts.push(`${this.days}d`);
        }

        const hours = this.days > 0 ? this.hours : this.totalHours;

        return [
            hours > 0 ? `${Math.floor(hours).toString().padStart(2, '0')}` : '00',
            `${this.minutes.toString().padStart(2, '0')}`,
            `${this.seconds.toString().padStart(2, '0')}.${this.milliseconds.toString().padStart(3, '0')}`
        ].join(':');
    }

    /**
     * Returns a human-friendly string (e.g. "2 hours 15 minutes")
     * @returns {string}
     */
    toHumanString() {
        const parts = [];

        if (this.days > 0) {
            parts.push(`${this.days} day${this.days !== 1 ? 's' : ''}`);
        }

        if (this.hours > 0) {
            parts.push(`${this.hours} hour${this.hours !== 1 ? 's' : ''}`);
        }

        if (this.minutes > 0) {
            parts.push(`${this.minutes} minute${this.minutes !== 1 ? 's' : ''}`);
        }

        if (this.seconds > 0) {
            parts.push(`${this.seconds} second${this.seconds !== 1 ? 's' : ''}`);
        }

        if (this.milliseconds > 0 || parts.length === 0) {
            parts.push(`${this.milliseconds} millisecond${this.milliseconds !== 1 ? 's' : ''}`);
        }

        return parts.join(' ');
    }
}