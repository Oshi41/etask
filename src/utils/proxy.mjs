export function proxyThis(_this, api) {
    const has = function (prop) {
        return prop in api;
    };

    return new Proxy(_this || {}, {
        get(target, p, receiver) {
            if (has(p)) {
                const result = api[p];
                return typeof result == 'function'
                    ? result.bind(api)
                    : result;
            }

            return Reflect.get(target, p, receiver);
        },
        has(target, p) {
            return has(p) || Reflect.has(target, p);
        },
        ownKeys(target) {
            return [...Reflect.ownKeys(api), ...Reflect.ownKeys(target)];
        },
        apply(target, thisArg, argArray) {
            return has(target?.name)
                ? Reflect.apply(api, thisArg, argArray)
                : Reflect.apply(target, thisArg, argArray);
        }
    });
}