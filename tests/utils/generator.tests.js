import assert from 'node:assert';
import e_gen from '../../src/utils/generator.js';
import {isFunc} from "../../src/index.mjs";
import {sleep} from '../../src/utils/promise.mjs'

describe('e_gen', () => {

    it('should execute the function and return SafeGenerator instance', () => {
        const mockFunc = (a, b) => a + b;
        const wrappedFunc = e_gen(mockFunc);

        const e_gen_apis = 'before after catch finally'.split(' ');
        for (let prop of e_gen_apis) {
            assert.ok(isFunc(wrappedFunc[prop]), `e_gen.${prop} func should exists`);
        }

        const result = wrappedFunc(2, 3);

        const safeGenApis = 'before then catch finally throw return addChild'.split(' ');

        for (let prop of safeGenApis) {
            assert.ok(isFunc(result[prop]), `SafeGenerator.${prop} func should exists`);
        }
    });

    it('should allow before callbacks to be executed before the main function', () => {
        const mockFunc = (a, b) => a + b;
        const wrappedFunc = e_gen(mockFunc);

        let beforeCalled = false;

        wrappedFunc.before(() => {
            beforeCalled = true;
        });
        const result = wrappedFunc(1, 2);

        assert.strictEqual(beforeCalled, true);
    });

    it('should allow after callbacks to be executed after the main function', async () => {
        const mockFunc = (a, b) => a + b;
        const wrappedFunc = e_gen(mockFunc);

        let afterResult = null;

        wrappedFunc.after((value) => {
            afterResult = value;
        });
        const result = await wrappedFunc(4, 5).wait();

        assert.strictEqual(afterResult, 9);
    });

    it('should catch errors using catch callbacks', async () => {
        const mockFunc = () => {
            throw new Error('Test error');
        };
        const wrappedFunc = e_gen(mockFunc);

        let caughtError = null;

        wrappedFunc.catch((error) => {
            caughtError = error.message;
        });
        await wrappedFunc().wait();

        assert.strictEqual(caughtError, 'Test error');
    });

    it('should execute finally callbacks', async () => {
        const mockFunc = (a) => a * 2;
        const wrappedFunc = e_gen(mockFunc);

        let finallyCalled = false;

        wrappedFunc.finally(() => {
            finallyCalled = true;
        });
        await wrappedFunc(3).wait();

        assert.strictEqual(finallyCalled, true);
    });

    it('should handle edge case of no callbacks set', async () => {
        const mockFunc = (a, b) => a * b;
        const wrappedFunc = e_gen(mockFunc);

        await assert.doesNotThrow(async () => {
            const result = await wrappedFunc(2, 5).wait();
            assert.equal(result, 9)
        })
    });

    it('should correctly bind context to the function', async () => {
        function mockFunc(a) {
            return this.value + a;
        }

        const context = {value: 10};
        const wrappedFunc = e_gen(mockFunc).bind(context);
        const result = await wrappedFunc(5).wait();

        assert.equal(result, 15);
    });
});

describe('complicated', () => {
    let wrappedGen;
    beforeEach(() => {
        wrappedGen = e_gen(async function* gen(shouldThrow) {
            // in case of success, return +1 value from original
            this.then(res => {
                this.return(res + 1);
            });

            // in case of error, return -1
            this.catch(e => {
                this.return(-1);
            });

            yield 'main: start';
            yield this.before(sleep(100));
            yield 'main: after sleep';

            const childResult = yield e_gen(function* innerGenerator() {
                yield 'child: starting';
                console.log('child started');

                // swallow all the errors and return 15 instead
                this.catch(e => {
                    this.return(15);
                });

                if (shouldThrow) {
                    yield 'child: error';
                    throw new Error('child error thrown');
                }

                yield 'child: success';
                return 2;
            });

            return childResult + 1;
        });
    })

    it('should handle async generators and return correct final value', async () => {
        const finalResult = await wrappedGen(false).wait();

        // Expected: childResult (2) + 1 = 3, then after callback adds 1 = 4
        assert.strictEqual(finalResult, 4);
    });
});

