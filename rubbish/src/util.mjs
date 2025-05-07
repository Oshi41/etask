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

export async function* gen_anything(fn) {
    switch (fn?.[Symbol.toStringTag]) {
        case 'AsyncGenerator':
            return yield* fn;

        case 'Generator':
            return yield* fn;
    }

    if (typeof fn?.then == 'function')
        return yield fn;

    if (typeof fn == 'function')
        return yield* gen_anything(fn());

    return fn;
}

export async function run_anything(fn) {
    const gen = gen_anything(fn);

    let lastValue;
    let isDone = false;

    // Run the generator to completion synchronously
    while (!isDone) {
        const result = await gen.next(lastValue);
        lastValue = result.value;
        isDone = result.done;
    }

    return lastValue;
}

export function proxy_this(thisArg, ctx) {
    thisArg ??= (typeof globalThis !== 'undefined' ? globalThis : {});
    return new Proxy(thisArg, {
        has: (target, prop) => prop in ctx || prop in target,
        get: (target, prop, receiver) => prop in ctx
            ? ctx[prop]
            : Reflect.get(target, prop, receiver),
        set: (target, prop, value, receiver) => Reflect.set(target, prop, value, receiver),
    });
}

Date.prototype.format = function (strf, locale = 'en-US') {

    return strf.replace(/yyyy|yy|MMMM|MMM|MM|M|dddd|ddd|dd|d|HH|H|mm|m|ss|s|fff|ff|f|ZZZ/g, s => {


        switch (s) {
            case 'MMMM':
            case 'MMM':
            case 'dddd':
            case 'ddd':
            case 'ZZZ':
                const opts = {};
                if (s === 'MMMM') opts.month = 'long';
                else if (s === 'MMM') opts.month = 'short';
                else if (s === 'dddd') opts.weekday = 'long';
                else if (s === 'ddd') opts.weekday = 'short';
                else opts.timeZoneName = 'longOffset';

                const parts = new Intl.DateTimeFormat(locale, opts).formatToParts(this);
                const part = Object.keys(opts)[0];
                return parts.find(p => p.type === part).value;

            case 'yyyy':
                return this.getFullYear();
            case 'yy':
                return this.getFullYear() % 100;

            case 'MM':
                return (this.getMonth() + 1).toString().padStart(2, '0');
            case 'M':
                return (this.getMonth() + 1);

            case 'dd':
                return this.getDate().toString().padStart(2, '0');
            case 'd':
                return this.getDate();

            case 'HH':
                return this.getHours().toString().padStart(2, '0');
            case 'H':
                return this.getHours();

            case 'mm':
                return this.getMinutes().toString().padStart(2, '0');
            case 'm':
                return this.getMinutes();

            case 'ss':
                return this.getSeconds().toString().padStart(2, '0');
            case 's':
                return this.getSeconds();

            case 'fff':
            case 'ff':
            case 'f':
                return this.getMilliseconds().toString().padStart(3, '0').slice(0, s.length);
        }
    });

    return strf
}