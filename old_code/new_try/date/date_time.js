import {date_part, units} from './part.js';

export class date_time {
    #total_nanos = 0;
    #js_date = new Date();
    #parts = new date_part();

    /**
     *
     * @param value {string | number | Date | date_time | date_part | null}
     */
    constructor(value = null) {
        // called without ctor
        if (!(this instanceof date_time)) {
            return new date_time(value);

            // cloning object
        } else if (value instanceof date_time) {
            this.#js_date = new Date(value.#js_date);
            this.#total_nanos = value.#total_nanos;

            // concrete values
        } else if (value instanceof date_part) {
            this.#js_date = new Date(value.year, value.month, value.day, value.hour, value.min, value.sec, value.mls);
            this.#total_nanos = value.total_nanos();

            // parsing date
        } else if (typeof value === 'string') {
            this.#js_date = new Date(Date.parse(value));
            this.#total_nanos = this.#js_date * units.NS.mls;

            // copy from JS date
        } else if (typeof value === 'number' || value instanceof Date) {
            this.#js_date = new Date(value);
            this.#total_nanos = this.#js_date * units.NS.mls;

            // obtain presize now
        } else if (value == null && typeof performance !== 'undefined') {
            const now = performance.now() + performance.timeOrigin;
            this.#js_date = new Date(now);
            this.#total_nanos = now * units.NS.mls;

            // default date now impl
        } else {
            this.#js_date = new Date();
            this.#total_nanos = this.#js_date.getTime() * units.NS.mls;
        }

        this.#parts = new date_part(this.#js_date)
            .add({ns: this.#total_nanos % units.NS.mls});

        /**
         * represents milliseconds in high resolution.
         */
        this.high_res_mls = 1.0 * this.#parts.total_nanos() / units.NS.mls;
    }

    /**
     *
     * @param mls_or_part {number | date_part}
     */
    add(mls_or_part) {
        if (typeof mls_or_part === 'number') mls_or_part = new date_part({mls: mls_or_part});
        return new date_time(this.#parts.add(mls_or_part));
    }

    /**
     *
     * @param other {date_time | Date}
     * @return {date_part}
     */
    diff(other) {
        if (other instanceof Date)
            return this.#parts.add(date_part(other).invert());

        if (other instanceof date_time)
            return this.#parts.add(other.#parts.invert());

        return date_part({mls: 0});
    }

    /**
     * Pretty date formatting
     *
     * @param fmt
     */
    format(fmt = "{yyyy}.{MM}.{dd} {HH}:{mm}:{ss}.{fff}") {
        return this.#parts.format(fmt);
    }

    valueOf() {
        return this.#total_nanos;
    }
}