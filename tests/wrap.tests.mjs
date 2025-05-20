// tests/wrap.test.js
import assert from 'assert';
import '../src/utils/func.mjs';
import '../src/utils/gen.mjs';
import '../src/utils/promise.mjs';
import {wrapper} from '../src/wrap.mjs';

describe('wrapper', function () {
    // Basic wrapper functionality tests
    describe('Basic functionality', function () {
        it('should create a wrapper with the provided function', function () {
            const testFn = () => 'test';
            const wrapped = new wrapper(testFn);

            assert.strictEqual(wrapped.func, testFn);
            assert.strictEqual(wrapped.isWrapped, true);
            assert.strictEqual(wrapped.name, 'testFn');
            assert.strictEqual(wrapped.length, 0);
            assert.ok(wrapped.callbacks.before !== undefined);
            assert.ok(wrapped.callbacks.after !== undefined);
            assert.ok(wrapped.callbacks.catch !== undefined);
            assert.ok(wrapped.callbacks.finally !== undefined);
        });

        it('should handle anonymous functions properly', function () {
            const wrapped = new wrapper(function () {
            });
            assert.strictEqual(wrapped.name, 'anonymous');
        });

        it('should preserve function arity', function () {
            const fn = (a, b, c) => a + b + c;
            const wrapped = new wrapper(fn);
            assert.strictEqual(wrapped.length, 3);
        });
    });

    // Testing the callback registration methods
    describe('Callback registration', function () {
        let wrapped;

        beforeEach(function () {
            wrapped = new wrapper(() => 'test');
        });

        it('should register before callbacks', function () {
            const beforeFn = () => {
            };
            wrapped.before(beforeFn);
            assert.ok(wrapped.callbacks.before.includes(beforeFn));
        });

        it('should register after callbacks with then()', function () {
            const afterFn = () => {
            };
            wrapped.then(afterFn);
            assert.ok(wrapped.callbacks.after.includes(afterFn));
        });

        it('should register catch callbacks with catch()', function () {
            const catchFn = () => {
            };
            wrapped.catch(catchFn);
            assert.ok(wrapped.callbacks.catch.includes(catchFn));
        });

        it('should register catch callbacks with then(null, reject)', function () {
            const catchFn = () => {
            };
            wrapped.then(null, catchFn);
            assert.ok(wrapped.callbacks.catch.includes(catchFn));
        });

        it('should register finally callbacks', function () {
            const finallyFn = () => {
            };
            wrapped.finally(finallyFn);
            assert.ok(wrapped.callbacks.finally.includes(finallyFn));
        });

        it('should ignore non-function callbacks', function () {
            wrapped.before('not a function');
            wrapped.then('not a function');
            wrapped.finally('not a function');

            assert.strictEqual(wrapped.callbacks.before.length, 0);
            assert.strictEqual(wrapped.callbacks.after.length, 0);
            assert.strictEqual(wrapped.callbacks.finally.length, 0);
        });

        it('should support method chaining', function () {
            const chain = wrapped.before(() => {
            }).then(() => {
            }).catch(() => {
            }).finally(() => {
            });
            assert.strictEqual(chain, wrapped);
        });
    });

    // Testing the apply method and execution flow
    describe('Function execution', function () {
        it('should execute the wrapped function', async function () {
            const testFn = () => 'result';
            const wrapped = new wrapper(testFn);

            const result = await wrapped.apply({}, []);
            assert.strictEqual(result, 'result');
        });

        it('should pass arguments to the wrapped function', async function () {
            const testFn = (a, b) => a + b;
            const wrapped = new wrapper(testFn);

            const result = await wrapped.apply({}, [2, 3]);
            assert.strictEqual(result, 5);
        });

        it('should preserve the this context', async function () {
            const obj = {value: 10};
            const testFn = function () {
                return this.value;
            };
            const wrapped = new wrapper(testFn);

            const result = await wrapped.apply(obj, []);
            assert.strictEqual(result, 10);
        });
    });

    // Testing the execution flow with callbacks
    describe('Execution flow', function () {
        it('should execute before callbacks before the main function', async function () {
            const executionOrder = [];
            const testFn = () => {
                executionOrder.push('main');
                return 'result';
            };
            const wrapped = new wrapper(testFn);

            wrapped.before(() => {
                executionOrder.push('before1');
            });
            wrapped.before(() => {
                executionOrder.push('before2');
            });

            await wrapped.apply({}, []);
            assert.deepStrictEqual(executionOrder, ['before1', 'before2', 'main']);
        });

        it('should execute after callbacks after the main function', async function () {
            const executionOrder = [];
            const testFn = () => {
                executionOrder.push('main');
                return 'result';
            };
            const wrapped = new wrapper(testFn);

            wrapped.before(() => {
                executionOrder.push('before');
            });
            wrapped.then(result => {
                executionOrder.push('after1');
            });
            wrapped.then(result => {
                executionOrder.push('after2');
            });

            await wrapped.apply({}, []);
            assert.deepStrictEqual(executionOrder, ['before', 'main', 'after1', 'after2']);
        });

        it('should execute finally callbacks at the end', async function () {
            const executionOrder = [];
            const testFn = () => {
                executionOrder.push('main');
                return 'result';
            };
            const wrapped = new wrapper(testFn);

            wrapped.before(() => {
                executionOrder.push('before');
            });
            wrapped.then(result => {
                executionOrder.push('after');
            });
            wrapped.finally(() => {
                executionOrder.push('finally1');
            });
            wrapped.finally(() => {
                executionOrder.push('finally2');
            });

            await wrapped.apply({}, []);
            assert.deepStrictEqual(executionOrder, ['before', 'main', 'after', 'finally1', 'finally2']);
        });
    });

    // Testing error handling
    describe('Error handling', function () {
        it('should catch errors from the main function', async function () {
            const error = new Error('Test error');
            const testFn = () => {
                throw error;
            };
            const wrapped = new wrapper(testFn);

            let caughtError = null;
            wrapped.catch(err => {
                caughtError = err;
            });

            await wrapped.apply({}, []);
            assert.strictEqual(caughtError, error);
        });

        it('should catch errors from before callbacks', async function () {
            const error = new Error('Before error');
            const executionOrder = [];
            const testFn = () => {
                executionOrder.push('main');
            };
            const wrapped = new wrapper(testFn);

            wrapped.before(() => {
                throw error;
            });
            wrapped.catch(err => {
                executionOrder.push('catch');
            });

            await wrapped.apply({}, []);
            assert.deepStrictEqual(executionOrder, ['catch']);
        });

        it('should catch errors from after callbacks', async function () {
            const error = new Error('After error');
            const executionOrder = [];
            const testFn = () => {
                executionOrder.push('main');
            };
            const wrapped = new wrapper(testFn);

            wrapped.then(() => {
                throw error;
            });
            wrapped.catch(err => {
                executionOrder.push('catch');
            });

            await wrapped.apply({}, []);
            assert.deepStrictEqual(executionOrder, ['main', 'catch']);
        });

        it('should execute finally callbacks even when errors occur', async function () {
            const error = new Error('Test error');
            const executionOrder = [];
            const testFn = () => {
                throw error;
            };
            const wrapped = new wrapper(testFn);

            wrapped.catch(err => {
                executionOrder.push('catch');
            });
            wrapped.finally(() => {
                executionOrder.push('finally');
            });

            await wrapped.apply({}, []);
            assert.deepStrictEqual(executionOrder, ['catch', 'finally']);
        });

        it('should rethrow uncaught errors', async function () {
            const error = new Error('Uncaught error');
            const testFn = () => {
                throw error;
            };
            const wrapped = new wrapper(testFn);

            try {
                await wrapped.apply({}, []);
                // Should not reach here
                assert.fail('Error was not thrown');
            } catch (err) {
                assert.strictEqual(err, error);
            }
        });
    });

    // Testing the sleep functionality
    describe('Sleep functionality', function () {
        it('should have the sleep method available', function () {
            const wrapped = new wrapper(() => {
            });
            assert.strictEqual(wrapped.sleep, Promise.sleep);
        });

        it('should wait the specified time before resuming', async function () {
            const startTime = Date.now();
            const wrapped = new wrapper(() => {
            });

            await wrapped.sleep(100);
            const elapsed = Date.now() - startTime;

            assert.ok(elapsed >= 90, `Expected elapsed time to be at least 90ms but got ${elapsed}ms`);
        });
    });

    // Testing with generators and async functions
    describe('Generator and async function support', function () {
        it('should handle regular functions', async function () {
            const testFn = () => 'result';
            const wrapped = new wrapper(testFn);

            const result = await wrapped.apply({}, []);
            assert.strictEqual(result, 'result');
        });

        it('should handle async functions', async function () {
            const testFn = async () => 'async result';
            const wrapped = new wrapper(testFn);

            const result = await wrapped.apply({}, []);
            assert.strictEqual(result, 'async result');
        });

        it('should handle generator functions', async function () {
            const testFn = function* () {
                yield 1;
                yield 2;
                return 'generator result';
            };
            const wrapped = new wrapper(testFn);

            const result = await wrapped.apply({}, []);
            assert.strictEqual(result, 'generator result');
        });

        it('should handle async generator functions', async function () {
            const testFn = async function* () {
                yield 1;
                yield 2;
                return 'async generator result';
            };
            const wrapped = new wrapper(testFn);

            const result = await wrapped.apply({}, []);
            assert.strictEqual(result, 'async generator result');
        });
    });

    // Testing the runStage method
    describe('runStage method', function () {
        it('should run through all stages correctly', async function () {
            const stages = [];
            const wrapped = new wrapper(() => 'result');

            // Replace runStage to monitor stages
            const originalRunStage = wrapped.runStage;
            wrapped.runStage = async function* (stage, thisArg, args) {
                stages.push(stage);
                return yield* originalRunStage.call(this, stage, thisArg, args);
            };

            await wrapped.apply({}, []);

            assert.ok(stages.includes('start'), 'Missing start stage');
            assert.ok(stages.includes('before'), 'Missing before stage');
            assert.ok(stages.includes('main'), 'Missing main stage');
            assert.ok(stages.includes('after'), 'Missing after stage');
            assert.ok(stages.includes('finally'), 'Missing finally stage');
            assert.ok(stages.includes('finally2'), 'Missing finally2 stage');
        });
    });

    // Testing the Proxy.this integration
    describe('Proxy.this integration', function () {
        it('should make wrapper methods available on the thisArg', async function () {
            let proxyUsed = false;
            const obj = {value: 10};

            // Create a test function that checks if wrapper methods are available on this
            const testFn = function () {
                proxyUsed = this.isWrapped === true;
                return this.value;
            };

            const wrapped = new wrapper(testFn);
            const result = await wrapped.apply(obj, []);

            assert.strictEqual(result, 10);
            assert.strictEqual(proxyUsed, true, 'Proxy.this was not used or did not expose wrapper properties');
        });
    });

    describe('throw and return methods', function () {
        it('should set error in retVal when throw is called', function () {
            const error = new Error('Test error');
            const wrapped = new wrapper(() => 'result');

            wrapped.throw(error);

            assert.strictEqual(wrapped.retVal.error, error);
        });

        it('should set value in retVal when return is called', function () {
            const wrapped = new wrapper(() => 'original result');

            wrapped.return('early return value');

            assert.strictEqual(wrapped.retVal.value, 'early return value');
        });

        it('should call generator throw method if _gen exists', function () {
            const error = new Error('Test error');
            const wrapped = new wrapper(() => 'result');

            // Mock the _gen object
            let throwCalled = false;
            wrapped._gen = {
                throw: (err) => {
                    throwCalled = true;
                    assert.strictEqual(err, error);
                }
            };

            wrapped.throw(error);

            assert.ok(throwCalled, 'Generator throw method was not called');
        });

        it('should call generator return method if _gen exists', function () {
            const wrapped = new wrapper(() => 'original result');

            // Mock the _gen object
            let returnCalled = false;
            wrapped._gen = {
                return: (val) => {
                    returnCalled = true;
                    assert.strictEqual(val, 'early return value');
                }
            };

            wrapped.return('early return value');

            assert.ok(returnCalled, 'Generator return method was not called');
        });

        it('should allow early return during execution', async function () {
            const executionOrder = [];
            const testFn = function* () {
                executionOrder.push('main start');
                this.return('early result');
                yield;
                executionOrder.push('main end'); // This should still execute as return just affects the return value
                return 'original result';
            };

            const wrapped = new wrapper(testFn);
            wrapped.before(() => {
                executionOrder.push('before');
            });
            wrapped.then(() => {
                executionOrder.push('after');
            }); // This still runs with the early result

            const result = await wrapped.apply({}, []);

            assert.strictEqual(result, 'early result');
            assert.deepStrictEqual(executionOrder, [
                'before',
                'main start',
                'main end',
                'after'
            ]);
        });

        it('should allow throwing errors during execution', async function () {
            const executionOrder = [];
            const customError = new Error('Custom error');

            const testFn = function () {
                executionOrder.push('main start');
                this.throw(customError);
                executionOrder.push('main end'); // This should still execute
                return 'result';
            };

            const wrapped = new wrapper(testFn);
            wrapped.before(() => {
                executionOrder.push('before');
            });
            wrapped.catch((err) => {
                executionOrder.push('catch');
                assert.strictEqual(err, customError);
            });
            wrapped.finally(() => {
                executionOrder.push('finally');
            });

            await wrapped.apply({}, []);

            assert.deepStrictEqual(executionOrder, [
                'before',
                'main start',
                'main end',
                'catch',
                'finally'
            ]);
        });

        it('should allow early return from before callbacks', async function () {
            const executionOrder = [];

            const testFn = () => {
                executionOrder.push('main');
                return 'original result';
            };

            const wrapped = new wrapper(testFn);

            wrapped.before(function () {
                executionOrder.push('before');
                this.return('early result');
            });

            wrapped.then(() => {
                executionOrder.push('after');
            });

            const result = await wrapped.apply({}, []);

            assert.strictEqual(result, 'early result');
            // Main function shouldn't be called due to early return
            assert.deepStrictEqual(executionOrder, ['before', 'after']);
        });

        it('should allow throwing errors from before callbacks', async function () {
            const executionOrder = [];
            const customError = new Error('Before error');

            const testFn = () => {
                executionOrder.push('main');
                return 'result';
            };

            const wrapped = new wrapper(testFn);

            wrapped.before(function () {
                executionOrder.push('before');
                this.throw(customError);
            });

            wrapped.catch((err) => {
                executionOrder.push('catch');
                assert.strictEqual(err, customError);
            });

            await wrapped.apply({}, []);

            // Main function shouldn't be called due to error
            assert.deepStrictEqual(executionOrder, ['before', 'catch']);
        });

        it('should support method chaining for throw and return', function () {
            const wrapped = new wrapper(() => 'result');

            const returnChain = wrapped.return('value');
            assert.strictEqual(returnChain, wrapped);

            const throwChain = wrapped.throw(new Error('error'));
            assert.strictEqual(throwChain, wrapped);
        });

        it('should handle return in after callbacks', async function () {
            const executionOrder = [];

            const testFn = () => {
                executionOrder.push('main');
                return 'original result';
            };

            const wrapped = new wrapper(testFn);

            wrapped.then(function (result) {
                executionOrder.push('after1');
                assert.strictEqual(result, 'original result');
                this.return('new result');
            });

            wrapped.then(function (result) {
                executionOrder.push('after2');
                assert.strictEqual(result, 'new result', 'Result should be the new value');
            });

            const result = await wrapped.apply({}, []);

            assert.strictEqual(result, 'new result');
            assert.deepStrictEqual(executionOrder, ['main', 'after1', 'after2']);
        });

        it('should handle throw in after callbacks', async function () {
            const executionOrder = [];
            const customError = new Error('After error');

            const testFn = () => {
                executionOrder.push('main');
                return 'result';
            };

            const wrapped = new wrapper(testFn);

            wrapped.then(function () {
                executionOrder.push('after');
                this.throw(customError);
            });

            wrapped.catch((err) => {
                executionOrder.push('catch');
                assert.strictEqual(err, customError);
            });

            await wrapped.apply({}, []);

            assert.deepStrictEqual(executionOrder, ['main', 'after', 'catch']);
        });

        it('should handle multiple calls to return with the last one taking precedence', async function () {
            const wrapped = new wrapper(() => 'original');

            wrapped.return('first');
            wrapped.return('second');

            assert.strictEqual(wrapped.retVal.value, 'second');

            const result = await wrapped.apply({}, []);
            assert.strictEqual(result, 'second');
        });

        it('should handle throw overriding return values', async function () {
            const error = new Error('Override error');
            const wrapped = new wrapper(() => 'original');

            wrapped.return('value');
            assert.strictEqual(wrapped.retVal.value, 'value');

            wrapped.throw(error);

            assert.strictEqual(wrapped.retVal.error, error);
            assert.strictEqual(wrapped.retVal.value, undefined);

            try {
                await wrapped.apply({}, []);
                assert.fail('Should have thrown an error');
            } catch (err) {
                assert.strictEqual(err, error);
            }
        });

        it('should handle return overriding throw errors', async function () {
            const error = new Error('Original error');
            const wrapped = new wrapper(() => 'original');

            wrapped.throw(error);
            assert.strictEqual(wrapped.retVal.error, error);

            wrapped.return('override value');

            // Return should override the error
            assert.strictEqual(wrapped.retVal.value, 'override value');
            assert.strictEqual(wrapped.retVal.error, undefined);

            const result = await wrapped.apply({}, []);
            assert.strictEqual(result, 'override value');
        });
    });
});

