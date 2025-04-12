const NS = {
    ns: 1,
    tick: 100,
    mls: 1_000_000,
    sec: 1_000_000_000,
    min: 60 * 1_000_000_000,
    hour: 60 * 60 * 1_000_000_000,
    day: 24 * 60 * 60 * 1_000_000_000,
    week: 7 * 24 * 60 * 60 * 1_000_000_000,
};
const MONTH = {
    month: 1,
    year: 12,
};
export const units = {NS, MONTH};

const aliases = new Map(Object.entries({
    ns: ['nano', 'nanos', 'nanosecond', 'nanoseconds'],
    tick: ['t'],
    mls: ['milli', 'millisecond', 'milliseconds'],
    sec: ['s', 'second', 'seconds'],
    min: ['minute', 'minutes'],
    hour: ['h', 'hours', 'hr', 'hrs'],
    day: ['d', 'days'],
    week: ['w', 'weeks'],
    month: ['mo', 'months', 'mon', 'months'],
    year: ['y', 'years', 'yr', 'yrs'],
    tz: ['timezone'],
}).flatMap(([k, v]) => [...v.map(alias => [alias, k]), [k, k]]));

/**
 *
 * @param parts
 * @returns {date_part | Date}
 */
export function date_part(parts = {}) {
    if (!(this instanceof date_part)) return new date_part(parts);

    if (parts instanceof Date) {
        parts = {
            year: parts.getUTCFullYear(),
            month: parts.getUTCMonth(),
            day: parts.getUTCDate(),
            hour: parts.getUTCHours(),
            min: parts.getUTCMinutes(),
            sec: parts.getUTCSeconds(),
            mls: parts.getUTCMilliseconds(),
            ns: 0,
            tz: parts.getTimezoneOffset(),
        };
    }

    this.tz = parts.tz || 0;
    const {ns, month} = compressed(parts);
    this.total_nanos = () => ns;
    this.total_months = () => month;
    normalize.apply(this, [ns, month]);

    return this;
}

/**
 * Format date parts into a string representation using C#-style formatting
 *
 * @param {string} formatStr - The format string with placeholders
 * @returns {string} - Formatted date string
 *
 * Format specifiers:
 * {yyyy} - Year (4 digits)
 * {yy} - Year (2 digits)
 * {MM} - Month (01-12)
 * {M} - Month (1-12)
 * {dd} - Day (01-31)
 * {d} - Day (1-31)
 * {HH} - Hour (00-23)
 * {H} - Hour (0-23)
 * {hh} - Hour (01-12)
 * {h} - Hour (1-12)
 * {tt} - AM/PM
 * {t} - A/P
 * {mm} - Minute (00-59)
 * {m} - Minute (0-59)
 * {ss} - Second (00-59)
 * {s} - Second (0-59)
 * {fff} - Millisecond (000-999)
 * {f} - Millisecond (0-999 without padding)
 * {nnnnnnnnn} - Nanosecond (000000000-999999999)
 * {n} - Nanosecond (0-999999999 without padding)
 * {zz} - Timezone offset (+/-HH:MM)
 */
date_part.prototype.format = function (formatStr = "{dd} {HH}:{mm}:{ss}.{fff}") {
    if (!formatStr) return '';

    // Helper to pad numbers with leading zeros
    const pad = (num, size) => String(num).padStart(size, '0');

    // Handle AM/PM for 12-hour clock
    const hour12 = this.hour % 12 || 12;
    const ampm = this.hour >= 12 ? 'PM' : 'AM';
    const ampmShort = this.hour >= 12 ? 'P' : 'A';

    // Format timezone offset
    const tzOffset = this.tz;
    const tzSign = tzOffset >= 0 ? '+' : '-';
    const tzHours = Math.floor(Math.abs(tzOffset) / 60);
    const tzMinutes = Math.abs(tzOffset) % 60;
    const tzFormatted = `${tzSign}${pad(tzHours, 2)}:${pad(tzMinutes, 2)}`;

    // Define formats and their replacements
    const formats = {
        '{yyyy}': pad(this.year, 4),
        '{yy}': pad(this.year % 100, 2),
        '{MM}': pad(this.month, 2),
        '{M}': String(this.month),
        '{dd}': pad(this.day, 2),
        '{d}': String(this.day),
        '{HH}': pad(this.hour, 2),
        '{H}': String(this.hour),
        '{hh}': pad(hour12, 2),
        '{h}': String(hour12),
        '{tt}': ampm,
        '{t}': ampmShort,
        '{mm}': pad(this.min, 2),
        '{m}': String(this.min),
        '{ss}': pad(this.sec, 2),
        '{s}': String(this.sec),
        '{fff}': pad(this.mls, 3),
        '{f}': String(this.mls),
        '{nnnnnnnnn}': pad(this.ns, 9),
        '{n}': String(this.ns),
        '{zz}': tzFormatted,
    };

    // Replace all format specifiers in the format string
    let result = formatStr;
    for (const [format, value] of Object.entries(formats)) {
        // Use a global regex to replace all occurrences
        const regex = new RegExp(format.replace(/[{}]/g, '\\$&'), 'g');
        result = result.replace(regex, value);
    }

    return result;
};

/**
 *
 * @param other {date_part | Date}
 */
date_part.prototype.add = function (other) {
    if (!(other instanceof date_part)) other = date_part(other);

    const month = this.total_months() + other.total_months();
    const nanos = this.total_nanos() + other.total_nanos();
    const tz = this.tz + this.tz;

    return new date_part({month, nanos, tz});
}

/**
 * Inverts current date parts
 *
 * @returns {date_part|Date}
 */
date_part.prototype.invert = function () {
    const copy = new date_part(this);
    Object.keys(NS).concat(Object.keys(MONTH)).concat('tz').forEach(k => copy[k] *= -1);
    return copy;
}

/**
 * compress parts to root units
 *
 * @param parts {Object<keyof NS | keyof MONTH, number>}
 * @return {ns: number, month: number}
 */
function compressed(parts = {}) {
    let ns = 0, month = 0;

    for (let [unit, amount] of Object.entries(parts)
        .filter(([k, v]) => Number.isFinite(+v))
        .filter(([k, v]) => aliases.has(k))
        .map(([k, v]) => [aliases.get(k), +v])) {

        if (unit in NS) {
            ns += amount * NS[unit];
        } else if (unit in MONTH) {
            month += amount * MONTH[unit];
        }
    }

    return {ns, month};
}

/**
 * Normalize parts from root units
 *
 * @param nanos {number}
 * @param months {number}
 */
function normalize(nanos, months) {
    this.year = Math.floor(months / MONTH.year);
    this.month = months % MONTH.year;

    const extract = function (per_unit) {
        const amount = Math.floor(nanos / per_unit);

        if (Math.abs(amount) > 0) {
            nanos -= per_unit * amount;
        }

        return amount;
    }

    for (let [prop, per_unit] of Object.entries(NS)
        .toSorted((a, b) => b[1] - a[1])) {
        this[prop] = extract(per_unit);
    }
}