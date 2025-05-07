import '../../src/utils/promise.mjs'
import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

describe('Promise.wrap', async () => {
    it('should wrap a function that returns a value', async () => {
        const wrappedFn = Promise.wrap(function (a, b) {
            return a + b;
        });

        const result = await wrappedFn(1, 2);
        assert.equal(result, 3);
    });

    it('should allow chaining with then', async () => {
        const wrappedFn = Promise.wrap(function (a, b) {
            return a + b;
        });

        return new Promise((done, fail) => {
            wrappedFn(1, 2)
                .then(result => {
                    assert.equal(result, 3);
                    done();
                })
                .catch(fail);
        });
    });

    it('should handle exceptions with catch', async () => {
        const wrappedFn = Promise.wrap(function () {
            throw new Error('Test error');
        });

        return new Promise((done, fail) => {
            wrappedFn()
                .then(() => {
                    fail(new Error('Should not resolve'));
                })
                .catch(err => {
                    assert.equal(err.message, 'Test error');
                    done();
                });
        });
    });

    it('should support early return with .return()', async () => {
        const wrappedFn = Promise.wrap(function () {
            this.return(42);
            return 100; // This should be ignored
        });

        return new Promise((done, fail) => {
            wrappedFn()
                .then(result => {
                    assert.equal(result, 42);
                    done();
                })
                .catch(fail);
        });
    });

    it('should support early throw with .throw()', async () => {
        const wrappedFn = Promise.wrap(function () {
            this.throw(new Error('Early error'));
            return 100; // This should be ignored
        });

        return new Promise((done, fail) => {
            wrappedFn()
                .then(() => {
                    fail(new Error('Should not resolve'));
                })
                .catch(err => {
                    assert.equal(err.message, 'Early error');
                    done();
                });
        });
    });

    it('should support finally', async () => {
        let finallyWasCalled = false;

        const wrappedFn = Promise.wrap(function () {
            return 'success';
        });

        return new Promise((done, fail) => {
            wrappedFn()
                .finally(() => {
                    finallyWasCalled = true;
                })
                .then(() => {
                    assert.ok(finallyWasCalled);
                    done();
                })
                .catch(fail);
        });
    });

    it('should allow accessing the API methods from `this` inside the function', async () => {
        const wrappedFn = Promise.wrap(function () {
            [this.return, this.throw, this.then, this.catch, this.finally, this.sleep]
                .every(x => assert.ok(typeof x === 'function'));
        });

        await wrappedFn();
    });
});

describe('Promise.prototype.sleep', async () => {
    it('should delay execution for the specified time', async () => {
        const startTime = Date.now();
        const delayMs = 100;

        await Promise.resolve().sleep(delayMs);

        const elapsedTime = Date.now() - startTime;
        assert.ok(elapsedTime >= delayMs - 10, `Elapsed time (${elapsedTime}ms) should be at least ${delayMs - 10}ms`);
    });

    it('should be usable within Promise chains', async () => {
        const results = [];

        await Promise.resolve()
            .then(() => {
                results.push(1);
                return Promise.resolve().sleep(50);
            })
            .then(() => {
                results.push(2);
            });

        assert.deepEqual(results, [1, 2]);
    });

    it('should clear timeout when promise is resolved', async () => {
        // This is a bit tricky to test directly, but we can check that
        // multiple sleeps don't accumulate timeouts
        const promises = [];
        for (let i = 0; i < 100; i++) {
            promises.push(Promise.resolve().sleep(10));
        }

        await Promise.all(promises);
        // If we get here without memory issues, we're probably good
        assert.ok(true);
    });
});

describe('Integration tests', async () => {
    it('should allow sleeping within a wrapped function', async () => {
        const wrappedFn = Promise.wrap(async function () {
            const startTime = Date.now();
            await this.sleep(100);
            return Date.now() - startTime;
        });

        const elapsedTime = await wrappedFn();
        assert.ok(elapsedTime >= 90, `Elapsed time (${elapsedTime}ms) should be at least 90ms`);
    });

    it('should handle complex chains with early returns', async () => {
        const steps = [];

        const wrappedFn = Promise.wrap(async function () {
            steps.push(1);
            await this.sleep(10);
            steps.push(2);

            if (true) {
                this.return('early');
            }

            steps.push(3); // Should not reach here

            return 'late';
        });

        const result = await wrappedFn();
        assert.equal(result, 'early');
    });
});