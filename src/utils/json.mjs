import {isArray, isFunc, isPrimitive} from './global.mjs';

/**
 * Creates a replacer function that can be used with JSON.stringify to handle cyclic references.
 * The function tracks circular references and replaces them with a reference path string.
 *
 * @param {Object} root - The root object from which the serialization starts.
 * @return {Function} A replacer function to be used in JSON.stringify for safe serialization of objects with cyclic references.
 */
export function createSafeReplacer(root) {
    const seen = new WeakMap();

    return function (key, value) {
        if (!isPrimitive(value)) {
            // cyclic reference detected
            if (seen.has(value)) {
                // retrieve a full path.
                return `<${seen.get(value)}>`;
            }

            if (value === root)
                seen.set(value, 'self');
            else {
                seen.set(value, `${seen.get(this) || 'self'}.${key}`);
            }
        }

        return value;
    };
}

/**
 * Processes the given replacer and returns a function to apply it during operations.
 * The function determines how the replacer is used based on its type: function, array, primitive type,
 * or defaults to returning the value unchanged.
 *
 * @param {Function | [] | string | number | symbol} replacer - The replacer used to process key-value pairs. It can be a function, an array,
 *                       or a primitive type (symbol, number, string). An invalid type defaults to no change.
 * @return {Function} A function that applies the specified replacer logic based on its type.
 *                    For a function, it directly uses it. For arrays, it checks key inclusions.
 *                    For a primitive type, it matches the key. Otherwise, it returns the value unchanged.
 */
export function useDefaultReplacer(replacer) {
    if (isFunc(replacer)) return replacer;

    if (isArray(replacer)) return function fromArray(key, value) {
        return replacer.includes(key) ? value : undefined
    };

    if (['symbol', 'number', 'string'].includes(typeof replacer)) return function fromProperty(key, value) {
        return replacer === key ? value : undefined
    };

    return function noChange(key, value) {
        return value;
    };
}

/**
 * Safely serializes an object to a JSON string while incorporating custom and default replacer functions.
 *
 * @param {Object} obj - The object to serialize.
 * @param {Function|null} [replacer=null] - A custom replacer function to transform values before serialization. It accepts two arguments: the key and the value.
 * @param {number} [space=2] - The number of spaces used for indentation in the resulting JSON string.
 * @return {string} The JSON string representation of the object.
 */
export function safeJSON(obj, replacer = null, space = 2) {
    const safeReplacer = createSafeReplacer(obj);
    const userReplacer = useDefaultReplacer(replacer);

    return JSON.stringify(obj, function (key, value) {
        value = safeReplacer(key, value);

        if (!Object.is(value, obj))
            value = userReplacer(key, value);

        return value;
    }, space);
}
