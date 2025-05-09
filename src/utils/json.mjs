import './global.mjs';

JSON.original_stringify = JSON.stringify;
console.json = JSON.stringify = function (obj, replacer = null, space = 0, avoid_circular = true) {
    if (!avoid_circular) return JSON.original_stringify.apply(this, [obj, replacer, space]);

    const seen = new WeakMap();
    const _replacer = function (key, value) {
        if (key == '' && this?.[key] === obj) {

            if (!!obj && typeof obj === 'object')
                seen.set(obj, 'self');

            return value;
        }

        if (isPlainObject(value) && !!key?.length) {
            if (seen.has(value))
                value = `<${value === obj ? 'self' : seen.get(value)}>`;
            else {
                if (this !== obj)
                    key = seen.get(this) + '.' + key;

                seen.set(value, key);
            }
        }

        if (IsFunc(replacer))
            value = replacer.apply(this, [key, value]);
        else if (isArray(replacer))
            value = replacer.includes(key) ? value : undefined;
        else if (typeof replacer === 'string' || typeof replacer === 'number')
            value = replacer == key ? value : undefined;

        return value;
    };

    return JSON.original_stringify.apply(this, [obj, _replacer, space]);
}