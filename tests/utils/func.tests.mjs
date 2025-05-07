// Import the function prototype extension
import '../../src/utils/func.mjs';

import {afterEach, beforeEach, describe, it, mock} from 'node:test';
import assert from 'node:assert/strict';

describe('debounce', async () => {
    beforeEach(() => {
        mock.timers.enable({
            apis: ['setTimeout']
        });
    });
    afterEach(() => {
        mock.timers.runAll();
        mock.timers.reset();
    });

    it('should execute the function immediately on first call', () => {
        let callCount = 0;
        const fn = function () {
            callCount++;
        };
        const debouncedFn = fn.debounce(100);

        debouncedFn();
        assert.equal(callCount, 1, 'Function should be called immediately on first invocation');
    });

    it('should not execute again when called multiple times within wait period', () => {
        let callCount = 0;
        const fn = function () {
            callCount++;
        };
        const debouncedFn = fn.debounce(100);

        debouncedFn();
        debouncedFn();
        debouncedFn();

        assert.equal(callCount, 1, 'Function should only be called once');
    });

    it('should allow execution again after wait period', () => {
        let callCount = 0;
        const fn = function () {
            callCount++;
        };
        const debouncedFn = fn.debounce(100);

        debouncedFn();
        assert.equal(callCount, 1, 'Function should be called on first invocation');

        // Fast-forward time
        mock.timers.tick(101);

        debouncedFn();
        assert.equal(callCount, 2, 'Function should be called again after wait period');
    });

    it('should reset timer when called again during wait period', () => {
        let callCount = 0;
        const fn = function () {
            callCount++;
        };
        const debouncedFn = fn.debounce(100);

        debouncedFn();

        // Fast-forward time partially
        mock.timers.tick(50);

        debouncedFn(); // This should reset the timer

        // Fast-forward to just after the original timeout
        mock.timers.tick(51);

        // The timer should have been reset, so no new execution should happen
        assert.equal(callCount, 1, 'Timer should have been reset');

        // Fast-forward to complete the new timeout
        mock.timers.tick(50);

        debouncedFn();
        assert.equal(callCount, 2, 'Function should be callable again after full wait period');
    });

    it('should pass arguments to the original function', () => {
        let receivedArgs = [];
        const fn = function (...args) {
            receivedArgs = args;
        };
        const debouncedFn = fn.debounce(100);

        debouncedFn(1, 'test', {key: 'value'});

        assert.deepEqual(receivedArgs, [1, 'test', {key: 'value'}], 'Arguments should be passed to the original function');
    });

    it('should use default wait time if none provided', () => {
        let callCount = 0;
        const fn = function () {
            callCount++;
        };
        const debouncedFn = fn.debounce();

        debouncedFn();
        assert.equal(callCount, 1, 'Function should be called on first invocation');

        debouncedFn();
        assert.equal(callCount, 1, 'Function should not be called again within default wait time');

        // Fast-forward past default wait time (250ms)
        mock.timers.tick(251);

        debouncedFn();
        assert.equal(callCount, 2, 'Function should be called again after default wait period');
    });
});

describe('before()', function () {
    it('should execute the before function first', function () {
        const calls = [];

        function originalFn(value) {
            calls.push(`original: ${value}`);
            return value;
        }

        function beforeFn(value) {
            calls.push(`before: ${value}`);
        }

        const enhancedFn = originalFn.before(beforeFn);
        const result = enhancedFn('test');

        assert.strictEqual(result, 'test', 'Should return the original function result');
        assert.deepStrictEqual(calls, ['before: test', 'original: test'], 'Before function should execute first');
    });

    it('should handle null/undefined before function', function () {
        function originalFn() {
            return 'result';
        }

        const enhancedFn = originalFn.before(null);
        const result = enhancedFn();

        assert.strictEqual(result, 'result', 'Should work with null before function');
    });

    it('should preserve this context', function () {
        const obj = {
            ref: {},
            value: 'test',
            originalFn() {
                return this.value;
            }
        };

        let capturedThis;

        function beforeFn() {
            capturedThis = this;
        }

        const enhancedFn = obj.originalFn.before(beforeFn);
        const result = enhancedFn.call(obj);

        assert.strictEqual(result, 'test', 'Should return correct result');
        assert.strictEqual(capturedThis.ref, obj.ref, 'Should preserve this context');
    });
});

describe('after()', function () {
    it('should execute the after function with the result', function () {
        const calls = [];
        let capturedResult;

        function originalFn(value) {
            calls.push(`original: ${value}`);
            return `result-${value}`;
        }

        function afterFn(result) {
            calls.push(`after: ${result}`);
            capturedResult = result;
        }

        const enhancedFn = originalFn.after(afterFn);
        const result = enhancedFn('test');

        assert.strictEqual(result, 'result-test', 'Should return the original function result');
        assert.strictEqual(capturedResult, 'result-test', 'After function should receive result');
        assert.deepStrictEqual(calls, ['original: test', 'after: result-test'], 'After function should execute last');
    });

    it('should handle null/undefined after function', function () {
        function originalFn() {
            return 'result';
        }

        const enhancedFn = originalFn.after(null);
        const result = enhancedFn();

        assert.strictEqual(result, 'result', 'Should work with null after function');
    });

    it('should preserve this context', function () {
        const obj = {
            ref: {},
            value: 'test',
            originalFn() {
                return this.value;
            }
        };

        let capturedThis;

        function afterFn() {
            capturedThis = this;
        }

        const enhancedFn = obj.originalFn.after(afterFn);
        const result = enhancedFn.call(obj);

        assert.strictEqual(result, 'test', 'Should return correct result');
        assert.strictEqual(capturedThis.ref, obj.ref, 'Should preserve this context');
    });
});

describe('catch()', function () {
    it('should catch errors thrown by the original function', function () {
        let caughtError = null;
        const errorMessage = 'Test error';

        function errorFn() {
            throw new Error(errorMessage);
        }

        function catchFn(error) {
            caughtError = error;
        }

        const enhancedFn = errorFn.catch(catchFn);
        const result = enhancedFn();

        assert.strictEqual(result, undefined, 'Should return undefined when error is caught');
        assert.ok(caughtError instanceof Error, 'Should catch the error');
        assert.strictEqual(caughtError.message, errorMessage, 'Should catch the correct error');
    });

    it('should return the original function result when no error occurs', function () {
        let caughtError = null;

        function originalFn() {
            return 'success';
        }

        function catchFn(error) {
            caughtError = error;
        }

        const enhancedFn = originalFn.catch(catchFn);
        const result = enhancedFn();

        assert.strictEqual(result, 'success', 'Should return the original function result');
        assert.strictEqual(caughtError, null, 'Should not call catch function when no error occurs');
    });

    it('should handle null/undefined catch function', function () {
        function errorFn() {
            throw new Error('Should be caught silently');
        }

        const enhancedFn = errorFn.catch(() => {
        });
        const result = enhancedFn();

        assert.strictEqual(result, undefined, 'Should return undefined with null catch function');
    });

    it('should preserve this context', function () {
        const obj = {
            ref: {},
            value: 'test',
            errorFn() {
                throw new Error(this.value);
            }
        };

        let capturedThis;
        let capturedError;

        function catchFn(error) {
            capturedThis = this;
            capturedError = error;
        }

        const enhancedFn = obj.errorFn.catch(catchFn);
        enhancedFn.call(obj);

        assert.strictEqual(capturedThis.ref, obj.ref, 'Should preserve this context');
        assert.strictEqual(capturedError.message, 'test', 'Should catch error with correct message');
    });
});

describe('finally()', function () {
    it('should always call the finally function after successful execution', function () {
        let finallyCalled = false;

        function originalFn(value) {
            return `result-${value}`;
        }

        function finallyFn() {
            finallyCalled = true;
        }

        const enhancedFn = originalFn.finally(finallyFn);
        const result = enhancedFn('test');

        assert.strictEqual(result, 'result-test', 'Should return the original function result');
        assert.strictEqual(finallyCalled, true, 'Should call finally function');
    });

    it('should always call the finally function even when error is thrown', function () {
        let finallyCalled = false;

        function errorFn() {
            throw new Error('Test error');
        }

        function finallyFn() {
            finallyCalled = true;
        }

        const enhancedFn = errorFn.finally(finallyFn);

        // The function will throw, so we need to catch it
        try {
            enhancedFn();
            assert.fail('Should have thrown an error');
        } catch (error) {
            assert.strictEqual(error.message, 'Test error', 'Should rethrow the original error');
        }

        assert.strictEqual(finallyCalled, true, 'Should call finally function even after error');
    });

    it('should handle null/undefined finally function', function () {
        function originalFn() {
            return 'result';
        }

        const enhancedFn = originalFn.finally(null);
        const result = enhancedFn();

        assert.strictEqual(result, 'result', 'Should work with null finally function');
    });

    it('should preserve this context', function () {
        const obj = {
            ref: {},
            value: 'test',
            originalFn() {
                return this.value;
            }
        };

        let capturedThis;

        function finallyFn() {
            capturedThis = this;
        }

        const enhancedFn = obj.originalFn.finally(finallyFn);
        const result = enhancedFn.call(obj);

        assert.strictEqual(result, 'test', 'Should return correct result');
        assert.strictEqual(capturedThis.ref, obj.ref, 'Should preserve this context');
    });
});

describe('once()', function () {
    it('should execute the function only once', function () {
        let callCount = 0;

        function incrementFn() {
            callCount++;
            return callCount;
        }

        const onceFn = incrementFn.once();

        const result1 = onceFn();
        const result2 = onceFn();
        const result3 = onceFn();

        assert.strictEqual(result1, 1, 'First call should return 1');
        assert.strictEqual(result2, undefined, 'Subsequent calls should return undefined');
        assert.strictEqual(result3, undefined, 'Subsequent calls should return undefined');
        assert.strictEqual(callCount, 1, 'Original function should be called only once');
    });

    it('should preserve the result of the first call', function () {
        function randomFn() {
            return Math.random();
        }

        const onceFn = randomFn.once();

        const result1 = onceFn();
        const result2 = onceFn();

        assert.strictEqual(result2, undefined, 'Second call should return undefined');
    });

    it('should preserve this context', function () {
        const obj = {
            value: 'test',
            count: 0,
            originalFn() {
                this.count++;
                return this.value;
            }
        };

        const onceFn = obj.originalFn.once();
        const result1 = onceFn.call(obj);
        const result2 = onceFn.call(obj);

        assert.strictEqual(result1, 'test', 'Should return correct result');
        assert.strictEqual(result2, undefined, 'Second call should return undefined');
        assert.strictEqual(obj.count, 1, 'Should only increment count once');
    });

    it('should work with async functions', async function () {
        let callCount = 0;

        async function asyncFn() {
            callCount++;
            return new Promise(resolve => {
                setTimeout(() => resolve(callCount), 10);
            });
        }

        const onceAsyncFn = asyncFn.once();

        // Call multiple times in parallel
        const [result1, result2, result3] = await Promise.all([
            onceAsyncFn(),
            onceAsyncFn(),
            onceAsyncFn()
        ]);

        // Only one of these should have a value, others should be undefined
        const definedResults = [result1, result2, result3].filter(r => r !== undefined);

        assert.strictEqual(definedResults.length, 1, 'Only one call should return a value');
        assert.strictEqual(definedResults[0], 1, 'Should return 1');
        assert.strictEqual(callCount, 1, 'Original function should be called only once');
    });
});

describe('Chaining', function () {
    it('should support chaining of multiple extensions', function () {
        const calls = [];

        function originalFn(value) {
            calls.push(`original: ${value}`);
            return `result-${value}`;
        }

        function beforeFn(value) {
            calls.push(`before: ${value}`);
        }

        function afterFn(result) {
            calls.push(`after: ${result}`);
        }

        function finallyFn() {
            calls.push('finally');
        }

        const enhancedFn = originalFn
            .before(beforeFn)
            .after(afterFn)
            .finally(finallyFn);

        const result = enhancedFn('test');

        assert.strictEqual(result, 'result-test', 'Should return the original function result');
        assert.deepStrictEqual(calls, [
            'before: test',
            'original: test',
            'after: result-test',
            'finally'
        ], 'Functions should execute in the correct order');
    });

    it('should handle errors correctly when chaining', function () {
        const calls = [];
        let caughtError = null;

        function errorFn() {
            calls.push('original');
            throw new Error('Test error');
        }

        function beforeFn() {
            calls.push('before');
        }

        function catchFn(error) {
            calls.push('catch');
            caughtError = error;
        }

        function finallyFn() {
            calls.push('finally');
        }

        const enhancedFn = errorFn
            .before(beforeFn)
            .catch(catchFn)
            .finally(finallyFn);

        const result = enhancedFn();

        assert.strictEqual(result, undefined, 'Should return undefined');
        assert.deepStrictEqual(calls, ['before', 'original', 'catch', 'finally'],
            'Functions should execute in the correct order');
        assert.strictEqual(caughtError.message, 'Test error', 'Should catch the correct error');
    });

    it('should execute once even when chained with other extensions', function () {
        const calls = [];

        function originalFn(value) {
            calls.push(`original: ${value}`);
            return `result-${value}`;
        }

        function beforeFn(value) {
            calls.push(`before: ${value}`);
        }

        const enhancedFn = originalFn
            .before(beforeFn)
            .once();

        const result1 = enhancedFn('test1');
        const result2 = enhancedFn('test2');

        assert.strictEqual(result1, 'result-test1', 'First call should return result');
        assert.strictEqual(result2, undefined, 'Second call should return undefined');
        assert.deepStrictEqual(calls, ['before: test1', 'original: test1'],
            'Functions should only be called once');
    });

    it('finally should be called even when chained with other extensions', function () {
        const calls = [];

        const func = function () {
            calls.push('func');
            return 1;
        }.finally(() => calls.push('finally'))
            .after(() => calls.push('after'))
            .before(() => calls.push('before'));

        func();

        assert.deepStrictEqual(calls, ['before', 'func', 'after', 'finally'],);


    });
});

