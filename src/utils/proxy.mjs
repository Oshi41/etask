import './global.mjs';

Proxy.this = function (_this, api) {
    return new Proxy(_this || {}, {
        get(target, p, receiver) {
            if (Object.hasOwn(api, p))
                return Reflect.get(api, p, receiver);

            return Reflect.get(target, p, receiver);
        },
        has(target, p) {
            return Object.hasOwn(api, p) || Reflect.has(target, p);
        },
        ownKeys(target) {
            return [...Reflect.ownKeys(api), ...Reflect.ownKeys(target)];
        },
        apply(target, thisArg, argArray) {
            if (Object.hasOwn(api, p))
                return Reflect.apply(api, thisArg, argArray);

            return Reflect.apply(target, thisArg, argArray);
        }
    });
};

Proxy.canProxy = function (obj) {

};