export function runner(run) {
    const callbacks = {then: [], catch: [], finally: []};

    const _this = {
        finally: cb => callbacks.finally.push(cb),
        catch: cb => callbacks.catch.push(cb),
        then: cb => callbacks.then.push(cb),
    };

    try {
        const result = run.apply(_this);

        while (callbacks.then.length) {
            callbacks.then.pop()(result);
        }

        return result;
    } catch (e) {
        while (callbacks.catch.length) {
            callbacks.catch.pop()();
        }
    } finally {
        while (callbacks.finally.length) {
            callbacks.finally.pop()();
        }
    }
}

export async function async_runner(run) {
    const callbacks = {then: [], catch: [], finally: []};

    const _this = {
        finally: cb => callbacks.finally.push(cb),
        catch: cb => callbacks.catch.push(cb),
        then: cb => callbacks.then.push(cb),
    };

    try {
        const result = await run.apply(_this);

        while (callbacks.then.length) {
            await callbacks.then.pop()(result);
        }

        return result;
    } catch (e) {
        while (callbacks.catch.length) {
            await callbacks.catch.pop()();
        }
    } finally {
        while (callbacks.finally.length) {
            await callbacks.finally.pop()();
        }
    }
}

const formatter = (function install() {
    /**
     *
     * @type {Map<string, Intl.DateTimeFormat>}
     */
    const cache = new Map();

    const format = {
        year: {
            yyyy: 'numeric',
            yy: '2-digit',
        },
        month: {
            MMMM: 'long',
            MMM: 'short',
            MM: '2-digit',
            M: 'numeric',
        },
        day: {
            dd: '2-digit',
            d: 'numeric',
        },
        hour: {
            HH: '2-digit',
            H: 'numeric',
        },
        minute: {
            mm: '2-digit',
            m: 'numeric',
        },
        second: {
            ss: '2-digit',
            s: 'numeric',
        },
        fractionalSecond: {
            SSS: 'long',
            SS: 'short',
            S: 'numeric',
        },
    };

    /**
     * @param date {Date | number}
     * @param strf {string}
     * @param locale {string}
     */
    return function (date, strf, locale = 'en-US') {
        for (let type of ['long', 'short', 'numeric', '2-digit']) {
            const key = `${locale}_${type}`;
            if (!cache.has(key)) {
                const opts = {};
                for (let [part, formats] of Object.entries(format)) {
                    if (Object.values(formats).includes(type)) {
                        opts[part] = type;
                    }
                }

                cache.set(key, new Intl.DateTimeFormat(locale, opts));
            }
        }

        for (let [part, formats] of Object.entries(format)) {
            for (let [string, type] of Object.entries(formats)) {
                if (!strf.includes(string)) continue;

                const key = `${locale}_${type}`;
                const replacing = part === 'fractionalSecond' && (
                    type === 'long' && date.getMilliseconds().toString().padStart(3, '0')
                    || type === 'short' && (date.getMilliseconds() % 100).toString().padStart(2, '0')
                    || type === 'numeric' && date.getMilliseconds() % 10
                ) || cache.get(key).formatToParts(date).find(p => p.type === part).value;
                strf = strf.replaceAll(string, replacing);
            }
        }

        return strf;
    };
})();

Date.prototype.format = function (strf, locale = 'en-US') {
    return formatter(this, strf, locale);
}