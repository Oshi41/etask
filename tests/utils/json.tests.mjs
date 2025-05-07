import '../../src/utils/json.mjs';
import {describe, it} from 'node:test';
import {strict as assert} from 'assert';

describe('JSON.stringify with circular reference protection', () => {
    const _nativeStringify = JSON.stringify;

    describe('safe_replacer function', () => {
        // Since safe_replacer is not exported, we can't test it directly.
        // Its functionality is tested through the overridden JSON.stringify
    });

    describe('JSON.stringify override', () => {
        it('should stringify simple objects', () => {
            const obj = {name: 'John', age: 30};
            const expected = '{"name":"John","age":30}';
            assert.equal(JSON.stringify(obj), expected);
        });

        it('should stringify arrays', () => {
            const arr = [1, 2, 3, 'four', {five: 5}];
            const expected = '[1,2,3,"four",{"five":5}]';
            assert.equal(JSON.stringify(arr), expected);
        });

        it('should handle null values', () => {
            assert.equal(JSON.stringify(null), 'null');
        });

        it('should handle primitive values', () => {
            assert.equal(JSON.stringify('string'), '"string"');
            assert.equal(JSON.stringify(42), '42');
            assert.equal(JSON.stringify(true), 'true');
            assert.equal(JSON.stringify(undefined), undefined);
        });

        it('should respect spacing parameter', () => {
            const obj = {a: 1, b: 2};
            const expected = '{\n  "a": 1,\n  "b": 2\n}';
            assert.equal(JSON.stringify(obj, null, 2), expected);
        });

        it('should handle circular self-references', () => {
            const obj = {name: 'circular'};
            obj.self = obj;

            const result = JSON.stringify(obj);
            assert.equal(result, '{"name":"circular","self":"<self>"}');
        });

        it('should handle circular references between multiple objects', () => {
            const obj1 = {name: 'obj1'};
            const obj2 = {name: 'obj2'};
            obj1.ref = obj2;
            obj2.ref = obj1;

            const result = JSON.stringify(obj1);
            // The exact format might vary depending on implementation details
            assert.equal(result, '{"name":"obj1","ref":{"name":"obj2","ref":"<self>"}}');
        });

        it('should handle circular references in arrays', () => {
            const arr = [1, 2, 3];
            arr.push(arr); // Circular reference

            const result = JSON.stringify(arr);
            assert.equal(result, '[1,2,3,"<self>"]');
        });

        it('should handle circular references in nested objects', () => {
            const obj = {
                a: {
                    b: {
                        c: {} // This will reference back to 'a'
                    }
                }
            };
            obj.a.b.c = obj.a;

            const result = JSON.stringify(obj);
            assert.equal(result, '{"a":{"b":{"c":"<a>"}}}');
        });

        it('should handle deeply nested structures without circular references', () => {
            const deep = {a: {b: {c: {d: {e: {f: 'value'}}}}}};
            const expected = '{"a":{"b":{"c":{"d":{"e":{"f":"value"}}}}}}';
            assert.equal(JSON.stringify(deep), expected);
        });

        it('should use custom replacer function if provided', () => {
            const obj = {a: 1, b: 2, c: 3};
            const replacer = (key, value) => (key === 'b' ? 'replaced' : value);
            const expected = '{"a":1,"b":"replaced","c":3}';

            assert.equal(JSON.stringify(obj, replacer), expected);
        });

        it('should combine circular reference handling with custom replacer', () => {
            const obj = {a: 1};
            obj.self = obj;
            const replacer = (key, value) => (key === 'a' ? 'modified' : value);

            const result = JSON.stringify(obj, replacer);
            assert.equal(result, '{"a":"modified","self":"<self>"}');
        });

        it('should disable circular reference handling when avoid_circular is false', () => {
            const obj = {name: 'test'};
            // Non-circular object should stringify normally
            assert.equal(JSON.stringify(obj, null, 0, false), '{"name":"test"}');

            // Circular object should throw an error when avoid_circular is false
            const circular = {name: 'circular'};
            circular.self = circular;

            assert.throws(() => {
                JSON.stringify(circular, null, 0, false);
            }, /circular structure/i);
        });

        it('should use the original stringify implementation when avoid_circular is false', () => {
            const obj = {a: 1, b: 2};
            const replacer = ['a']; // Only include property 'a'

            const withCircularAvoidance = JSON.stringify(obj, replacer, 0, true);
            const withoutCircularAvoidance = JSON.stringify(obj, replacer, 0, false);

            // Both should filter to just the 'a' property
            assert.equal(withCircularAvoidance, '{"a":1}');
            assert.equal(withoutCircularAvoidance, '{"a":1}');
        });

        it('should handle multiple types of values in the same object', () => {
            const complex = {
                string: 'text',
                number: 42,
                boolean: true,
                null: null,
                undefined: undefined,
                date: new Date('2023-01-01'),
                regex: /pattern/,
                array: [1, 2, 3],
                nested: {key: 'value'}
            };

            // Just make sure it doesn't throw
            const result = JSON.stringify(complex);
            assert.ok(result.includes('"string":"text"'));
            assert.ok(result.includes('"number":42'));
            assert.ok(result.includes('"boolean":true'));
            assert.ok(result.includes('"null":null'));
            // undefined should be omitted
            assert.ok(!result.includes('"undefined"'));
            // Date becomes a string
            assert.ok(result.includes('"date":"2023-01-01'));
            // RegExp becomes an empty object
            assert.ok(result.includes('"regex":{}'));
            assert.ok(result.includes('"array":[1,2,3]'));
            assert.ok(result.includes('"nested":{"key":"value"}'));
        });
    });
});