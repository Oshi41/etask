import etask from "./etask.js";
import {deepEqual as de, fail} from 'node:assert';

describe('index', () => {
    it('then/finally', async () => {
        let count = 0;
        const result = await etask(function* () {
            this.then(() => {
                de(count, 1);
                count++;
            });
            this.then(() => {
                de(count, 2);
                count++;
            });
            this.finally(() => {
                de(count, 3);
                count++;
            });
            this.finally(() => {
                de(count, 4);
                count++;
            });
            de(count, 0);
            yield count++;
            return count;
        });
        de(count, 5);
        de(result, 1);
    });
    it('throw stop the execution', async () => {
        const error = new Error('some error');
        try {
            await etask(function* () {
                try {
                    yield this.throw(error);
                } catch (e) {
                    yield console.log('here');
                }

                return 10;
            });
            fail('Must fail');
        } catch (e) {
            de(e, error);
        }
    });
    it('return stop the execution', async () => {
        let count = 0;
        const result = await etask(function* () {
            yield this.return(5);
            yield count++;
            return 10;
        });
        de(result, 5);
        de(count, 0);
    });
    it('timeout example', async () => {
        let count = 0;
        try {
            await etask(function* () {
                this.after(10, () => {
                    this.throw('timeout')
                });
                yield this.sleep(20);
                yield count++;
                return 10;
            });
            fail('must fail on timeout')
        } catch (e) {
            de(e, 'timeout');
        }
    });
    it('timeout example, will not throw an error', async () => {
        let count = 0;
        const result = await etask(function* () {
            this.after(100, () => {
                this.throw('timeout')
            });
            yield this.sleep(20);
            yield count++;
            return 10;
        });
        de(count, 1);
        de(result, 10);
    });
    it('catch, return special value in case of error', async () => {
        let count = 0;
        const result = await etask(function* () {
            this.catch(() => this.return('error'));
            throw new Error('some error');
            count++;
            return 'success';
        });
        de(result, 'error');
        de(count, 0);
    });
    it('execution time logging', async () => {
        const result = await etask(function* () {
            this.finally(() => {
                const diff = this.stats.end - this.stats.start;
                de(diff > 20, true);
            });
            yield this.sleep(20);

            return 7;
        });
        de(result, 7);
    });
});