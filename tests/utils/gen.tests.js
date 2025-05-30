import {strict as assert} from 'assert';
import {any2asyncGen, safe} from '../../src/utils/gen.mjs';

describe('any2asyncGen', () => {
    it('should convert async iterator to async generator', async () => {
        const asyncIterable = {
            [Symbol.asyncIterator]: async function* () {
                yield 1;
                yield 2;
                return 3;
            }
        };

        const asyncIterator = asyncIterable[Symbol.asyncIterator]();
        const gen = any2asyncGen(asyncIterator);

        const results = [];
        for await (const value of gen) {
            results.push(value);
        }

        assert.deepEqual(results, [1, 2]);
    });

    it('should convert iterator to async generator', async () => {
        const iterable = {
            [Symbol.iterator]: function* () {
                yield 1;
                yield 2;
                return 3;
            }
        };

        const iterator = iterable[Symbol.iterator]();
        const gen = any2asyncGen(iterator);

        const results = [];
        for await (const value of gen) {
            results.push(value);
        }

        assert.deepEqual(results, [1, 2]);
    });

    it('should convert async iterable to async generator', async () => {
        const asyncIterable = {
            async* [Symbol.asyncIterator]() {
                yield 'a';
                yield 'b';
                return 'c';
            }
        };

        const gen = any2asyncGen(asyncIterable);

        const results = [];
        for await (const value of gen) {
            results.push(value);
        }

        assert.deepEqual(results, ['a', 'b']);
    });

    it('should convert iterable to async generator', async () => {
        const iterable = [1, 2, 3];
        const gen = any2asyncGen(iterable);

        const results = [];
        for await (const value of gen) {
            results.push(value);
        }

        assert.deepEqual(results, [1, 2, 3]);
    });

    it('should convert promise to async generator', async () => {
        const promise = Promise.resolve('test value');
        const gen = any2asyncGen(promise);

        const results = [];
        for await (const value of gen) {
            results.push(value);
        }

        assert.deepEqual(results, ['test value']);
    });

    it('should convert function to async generator', async () => {
        const func = () => 'function result';
        const gen = any2asyncGen(func);

        const results = [];
        for await (const value of gen) {
            results.push(value);
        }

        assert.deepEqual(results, ['function result']);
    });

    it('should convert async function to async generator', async () => {
        const asyncFunc = async () => 'async function result';
        const gen = any2asyncGen(asyncFunc);

        const results = [];
        for await (const value of gen) {
            results.push(value);
        }

        assert.deepEqual(results, ['async function result']);
    });

    it('should handle empty iterables', async () => {
        const emptyArray = [];
        const gen = any2asyncGen(emptyArray);

        const results = [];
        for await (const value of gen) {
            results.push(value);
        }

        assert.deepEqual(results, []);
    });

    it('should handle functions that return undefined', async () => {
        const func = () => undefined;
        const gen = any2asyncGen(func);

        const results = [];
        for await (const value of gen) {
            results.push(value);
        }

        assert.deepEqual(results, [undefined]);
    });

    it('should handle promises that resolve to undefined', async () => {
        const promise = Promise.resolve(undefined);
        const gen = any2asyncGen(promise);

        const results = [];
        for await (const value of gen) {
            results.push(value);
        }

        assert.deepEqual(results, [undefined]);
    });

    it('should handle rejected promises', async () => {
        const rejectedPromise = Promise.reject(new Error('test error'));
        const gen = any2asyncGen(rejectedPromise);

        try {
            for await (const value of gen) {
                // Should not reach here
                assert.fail('Should have thrown an error');
            }
        } catch (error) {
            assert.equal(error.message, 'test error');
        }
    });

    it('should handle functions that throw errors', async () => {
        const throwingFunc = () => {
            throw new Error('function error');
        };
        const gen = any2asyncGen(throwingFunc);

        try {
            for await (const value of gen) {
                // Should not reach here
                assert.fail('Should have thrown an error');
            }
        } catch (error) {
            assert.equal(error.message, 'function error');
        }
    });

    it('should handle generator functions', async () => {
        const generatorFunc = function* () {
            yield 1;
            yield 2;
            return 3;
        };

        const gen = any2asyncGen(generatorFunc());

        const results = [];
        for await (const value of gen) {
            results.push(value);
        }

        assert.deepEqual(results, [1, 2]);
    });

    it('should handle async generator functions', async () => {
        const asyncGeneratorFunc = async function* () {
            yield await Promise.resolve(1);
            yield await Promise.resolve(2);
            return 3;
        };

        const gen = any2asyncGen(asyncGeneratorFunc());

        const results = [];
        for await (const value of gen) {
            results.push(value);
        }

        assert.deepEqual(results, [1, 2]);
    });

    it('should handle Set as iterable', async () => {
        const set = new Set([1, 2, 3]);
        const gen = any2asyncGen(set);

        const results = [];
        for await (const value of gen) {
            results.push(value);
        }

        assert.deepEqual(results, [1, 2, 3]);
    });

    it('should handle Map as iterable', async () => {
        const map = new Map([['a', 1], ['b', 2]]);
        const gen = any2asyncGen(map);

        const results = [];
        for await (const value of gen) {
            results.push(value);
        }

        assert.deepEqual(results, [['a', 1], ['b', 2]]);
    });

    it('should return undefined for unsupported types', () => {
        const unsupportedTypes = [
            null,
            undefined,
            42,
            'string without Symbol.iterator',
            {},
            true,
            Symbol('test')
        ];

        unsupportedTypes.forEach(type => {
            const result = any2asyncGen(type);
            assert.equal(result, undefined, `Expected undefined for type: ${typeof type}`);
        });
    });
});

describe('safe function', () => {
    it('should wrap successful generator execution', async () => {
        const gen = any2asyncGen([1, 2, 3]);
        const safeGen = safe(gen);

        const results = [];
        for await (const step of safeGen) {
            results.push(step);
        }

        assert.equal(results.length, 3);
        assert.deepEqual(results[0], {done: false, value: 1});
        assert.deepEqual(results[1], {done: false, value: 2});
        assert.deepEqual(results[2], {done: false, value: 3});
    });

    it('should catch errors and return them in step objects', async () => {
        const throwingGen = async function* () {
            yield 1;
            throw new Error('test error');
        }();

        const safeGen = safe(throwingGen);

        const results = [];
        for await (const step of safeGen) {
            results.push(step);
        }

        assert.equal(results.length, 2);
        assert.deepEqual(results[0], {done: false, value: 1});

        // The final step should contain the error
        assert.equal(results[1].done, true);
        assert.ok(results[1].error instanceof Error);
        assert.equal(results[1].error.message, 'test error');
    });

    it('should handle generator that throws on first next()', async () => {
        const throwingGen = async function* () {
            throw new Error('immediate error');
        }();

        const safeGen = safe(throwingGen);

        const results = [];
        for await (const step of safeGen) {
            results.push(step);
        }

        assert.equal(results.length, 1);

        // The final step should contain the error
        assert.equal(results[0].done, true);
        assert.ok(results[0].error instanceof Error);
        assert.equal(results[0].error.message, 'immediate error');
    });

    it('should handle empty generator', async () => {
        const emptyGen = any2asyncGen([]);
        const safeGen = safe(emptyGen);

        const results = [];
        for await (const step of safeGen) {
            results.push(step);
        }

        assert.equal(results.length, 0);
    });

    it('should preserve generator return value', async () => {
        const genWithReturn = async function* () {
            yield 1;
            return 'final value';
        }();

        const safeGen = safe(genWithReturn);

        const results = [];
        for await (const step of safeGen) {
            results.push(step);
        }

        assert.equal(results.length, 1);
        assert.deepEqual(results[0], {done: false, value: 1});
        assert.equal(results[1].done, true);
        assert.equal(results[1].value, 'final value');
    });

    it('should handle async errors in generator', async () => {
        const asyncThrowingGen = async function* () {
            yield 1;
            await Promise.reject(new Error('async error'));
        }();

        const safeGen = safe(asyncThrowingGen);

        const results = [];
        for await (const step of safeGen) {
            results.push(step);
        }

        assert.equal(results.length, 1);
        assert.deepEqual(results[0], {done: false, value: 1});

        const finalStep = await safeGen.next();
        assert.equal(finalStep.done, true);
        assert.ok(finalStep.error instanceof Error);
        assert.equal(finalStep.error.message, 'async error');
    });

    it('should handle generator that yields undefined', async () => {
        const genWithUndefined = async function* () {
            yield undefined;
            yield null;
            yield 0;
        }();

        const safeGen = safe(genWithUndefined);

        const results = [];
        for await (const step of safeGen) {
            results.push(step);
        }

        assert.equal(results.length, 3);
        assert.deepEqual(results[0], {done: false, value: undefined});
        assert.deepEqual(results[1], {done: false, value: null});
        assert.deepEqual(results[2], {done: false, value: 0});
    });

    it('should handle generator that yields objects', async () => {
        const obj1 = {name: 'first'};
        const obj2 = {name: 'second'};

        const genWithObjects = async function* () {
            yield obj1;
            yield obj2;
        }();

        const safeGen = safe(genWithObjects);

        const results = [];
        for await (const step of safeGen) {
            results.push(step);
        }

        assert.equal(results.length, 2);
        assert.deepEqual(results[0], {done: false, value: obj1});
        assert.deepEqual(results[1], {done: false, value: obj2});
    });

    it('should handle multiple errors', async () => {
        const multiErrorGen = async function* () {
            yield 1;
            throw new Error('first error');
        }();

        const safeGen = safe(multiErrorGen);

        // Consume the yielded value
        const step1 = await safeGen.next();
        assert.deepEqual(step1, {done: false, value: 1});

        // Get the error step
        const errorStep = await safeGen.next();
        assert.equal(errorStep.done, true);
        assert.ok(errorStep.error instanceof Error);
        assert.equal(errorStep.error.message, 'first error');

        // Subsequent calls should return the same error step
        const subsequentStep = await safeGen.next();
        assert.deepEqual(subsequentStep, errorStep);
    });

    it('should work with sync iterables converted to async generators', async () => {
        const syncIterable = new Set(['a', 'b', 'c']);
        const asyncGen = any2asyncGen(syncIterable);
        const safeGen = safe(asyncGen);

        const results = [];
        for await (const step of safeGen) {
            results.push(step);
        }

        assert.equal(results.length, 3);
        assert.deepEqual(results[0], {done: false, value: 'a'});
        assert.deepEqual(results[1], {done: false, value: 'b'});
        assert.deepEqual(results[2], {done: false, value: 'c'});
    });

    it('should handle promise-based generators', async () => {
        const promiseGen = any2asyncGen(Promise.resolve('promise value'));
        const safeGen = safe(promiseGen);

        const results = [];
        for await (const step of safeGen) {
            results.push(step);
        }

        assert.equal(results.length, 1);
        assert.deepEqual(results[0], {done: false, value: 'promise value'});
    });

    it('should handle rejected promise generators', async () => {
        const rejectedPromiseGen = any2asyncGen(Promise.reject(new Error('promise error')));
        const safeGen = safe(rejectedPromiseGen);

        const results = [];
        for await (const step of safeGen) {
            results.push(step);
        }

        assert.equal(results.length, 0);

        const finalStep = await safeGen.next();
        assert.equal(finalStep.done, true);
        assert.ok(finalStep.error instanceof Error);
        assert.equal(finalStep.error.message, 'promise error');
    });

    it('should properly chain with other generators', async () => {
        const sourceGen = async function* () {
            yield 1;
            yield 2;
            throw new Error('chain error');
        }();

        const safeGen = safe(sourceGen);

        // Collect all steps manually
        const step1 = await safeGen.next();
        const step2 = await safeGen.next();
        const step3 = await safeGen.next();

        assert.deepEqual(step1, {done: false, value: 1});
        assert.deepEqual(step2, {done: false, value: 2});
        assert.equal(step3.done, true);
        assert.ok(step3.error instanceof Error);
        assert.equal(step3.error.message, 'chain error');
    });

    it('should handle generator that yields promises', async () => {
        const promiseYieldingGen = async function* () {
            yield Promise.resolve('first');
            yield Promise.resolve('second');
        }();

        const safeGen = safe(promiseYieldingGen);

        const results = [];
        for await (const step of safeGen) {
            results.push(step);
        }

        assert.equal(results.length, 2);
        // The promises should be yielded as-is, not resolved
        assert.ok(results[0].value instanceof Promise);
        assert.ok(results[1].value instanceof Promise);

        // Verify the promises resolve correctly
        const resolved1 = await results[0].value;
        const resolved2 = await results[1].value;
        assert.equal(resolved1, 'first');
        assert.equal(resolved2, 'second');
    });
});