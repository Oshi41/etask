import './global.mjs';
import './gen.mjs';

/**
 * Validates and normalizes a path string or array used for deep object navigation.
 *
 * This helper function converts a dot notation string path or bracket notation
 * into a standardized array of property names. It handles various path formats
 * consistently for use with Object.get and Object.set utilities.
 *
 * @param {string|string[]} paths - A path to a nested property, either as a dot notation string
 *                                 (e.g., 'user.profile.name') or an array of property names
 * @returns {string[]} A new array containing the normalized path segments
 *
 * @example
 * // From dot notation
 * pathValidate('user.profile.name'); // ['user', 'profile', 'name']
 *
 * @example
 * // From bracket notation
 * pathValidate('user[profile][name]'); // ['user', 'profile', 'name']
 *
 * @example
 * // From mixed notation
 * pathValidate('users[0].name'); // ['users', '0', 'name']
 *
 * @private
 */
const pathValidate = function (paths) {
    if (typeof paths == 'string') {
        paths = paths.replaceAll('[', '.')
            .replaceAll(']', '')
            .split('.')
            .map(x => x?.trim())
            .filter(Boolean);
    }

    return [...paths];
}

/**
 * Safely retrieves a nested property value from an object using a path.
 *
 * This utility function traverses an object based on the provided path (either a string
 * path with dot notation or an array of keys) and returns the value at that path.
 * If any part of the path doesn't exist, the function returns undefined.
 *
 * @param {Object} src - The source object to retrieve the value from
 * @param {string|string[]} paths - A path to the property, either as a dot notation string
 *                                 or an array of keys
 * @returns {*} The value at the specified path, or undefined if the path doesn't exist
 *
 * @example
 * const user = {
 *   profile: {
 *     name: 'John',
 *     details: { age: 30 }
 *   }
 * };
 *
 * // Using string path
 * Object.get(user, 'profile.name'); // 'John'
 *
 * // Using array path
 * Object.get(user, ['profile', 'details', 'age']); // 30
 *
 * // Path that doesn't exist
 * Object.get(user, 'profile.address'); // undefined
 */
Object.get = function (src, paths) {
    paths = pathValidate(paths);
    let temp = src;

    while (isRefType(temp) && paths.length) {
        temp = temp[paths.shift()];
    }
    return temp;
}

/**
 * Sets a value at a nested path within an object, creating the path if it doesn't exist.
 *
 * This utility function traverses an object based on the provided path and sets
 * the specified value at that location. If any parts of the path don't exist,
 * they are created as empty objects, allowing for deep property setting.
 *
 * @param {Object} src - The source object to modify
 * @param {string|string[]} paths - A path to the property, either as a dot notation string
 *                                 or an array of keys
 * @param {*} value - The value to set at the specified path
 *
 * @example
 * const user = { profile: {} };
 *
 * // Set a nested property, creating the path as needed
 * Object.set(user, 'profile.details.age', 30);
 * // Result: user = { profile: { details: { age: 30 } } }
 *
 * // Using array path
 * Object.set(user, ['settings', 'theme'], 'dark');
 * // Result: user = {
 * //   profile: { details: { age: 30 } },
 * //   settings: { theme: 'dark' }
 * // }
 */
Object.set = function (src, paths, value) {
    paths = pathValidate(paths);

    let temp = src;
    for (let key of paths.slice(0, -1)) {
        if (!(key in temp))
            temp[key] = {};

        temp = temp[key];
    }
    temp[paths.at(-1)] = value;
}

/**
 *
 * @param obj
 * @returns {[
 * {isComplex: (false|boolean|arg is any[]), frozen: boolean},
 * (function(): Generator<[string,*], void, *>)
 * ]}
 */
Object.stats = function (obj) {
    const meta = {
        isComplex: obj != null && (typeof obj == 'object' || Array.isArray(obj) || typeof obj == 'function'),
        frozen: Object.isFrozen(obj),
    };
    const entries = function* entries() {
        if (!meta.isComplex) return;

        for (let key of Object.keys(obj)) {
            try {
                const value = obj[key];
                yield [key, value];
            } catch (e) {
                // ignored
            }
        }
    };

    return [meta, entries];
}

/**
 *
 * @param root
 * @param deep
 * @param strategy {'deep' | 'layer'}
 * @yields {{root, prop, value, stats: {leaf: boolean, frozen: boolean, keys: string[], getKey(*): ({value: *}|undefined)}}|{value: *}}
 */
Object.forEachRecursive = function (root, {deep = 10, strategy = 'deep'} = {}) {
    const visited = new WeakMap();

    const visit = function visit(value, prop = []) {
        if (visited.has(value)) return {fail: 'recursive'};
        if (prop.length > deep) return {fail: 'maxDeepReached'};

        const [stats, getEntries] = Object.stats(value);
        const result = {
            ret: {
                root,
                prop,
                value,
                stats,
            },
            children: function* children() {
                if (stats.isComplex)
                    yield* getEntries().map(([key, value]) => [value, [...prop, key]]);
            },
        };

        if (stats.isComplex)
            visited.set(value, result);

        return result;
    };

    const deepStrategy = function* deepStrategy(value, prop = []) {
        const step = visit(value, prop);
        if (step.fail) return;

        yield step.ret;
        yield* step.children().flatMap(x => deepStrategy(...x));
    }

    /**
     *
     * @param values {Iterable<[key: string, value: string]>}
     * @returns {any}
     */
    const layerStrategy = function* layerStrategy(values) {

        const nextLevel = [];

        for (let step of values[Symbol.iterator]()
            .map(([value, prop]) => visit(value, prop))
            .filter(x => !x.fail)) {

            yield step.ret;

            nextLevel.push(step.children);
        }

        if (nextLevel.length) {
            nextLevel[Symbol.iterator]().flatMap(x => x())
            yield* layerStrategy(nextLevel[Symbol.iterator]().flatMap(x => x()));
        }
    }

    switch (strategy) {
        case "layer":
            return layerStrategy([[root, []]]);

        case "deep":
        default:
            return deepStrategy(root);
    }
}