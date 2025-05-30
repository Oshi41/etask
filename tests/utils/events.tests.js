import {strict as assert} from 'assert';
import {AsyncEventTarget, isFunc} from '../../src/index.mjs';

describe('AsyncEventTarget', () => {
    it('should add a callback to a type and return true', () => {
        const target = new AsyncEventTarget();
        const callback = async () => {
        };
        const result = target.add('type1', callback);
        assert.ok(isFunc(result), 'Should return unsubscribe function');
    });

    it('should return false when removing a non-existent callback', () => {
        const target = new AsyncEventTarget();
        const callback = async () => {
        };
        const result = target.remove('type1', callback);
        assert.equal(result, false);
    });

    it('should remove an added callback and return true', () => {
        const target = new AsyncEventTarget();
        const callback = async () => {
        };
        target.add('type1', callback);
        const result = target.remove('type1', callback);
        assert.equal(result, true);
    });

    it('should not process events for a type with no callbacks', async () => {
        const target = new AsyncEventTarget();
        const payload = {data: 'test'};
        const gen = target.rise('type1', payload);
        const result = await gen.next();
        assert.equal(result.done, true);
    });

    it('should process an event through added callback', async () => {
        const target = new AsyncEventTarget();
        let processedPayload = null;
        const callback = async (e) => {
            processedPayload = e.payload;
        };
        target.add('type1', callback);
        const payload = {data: 'test'};

        const gen = target.rise('type1', payload);
        for await (const state of gen) {
        } // Exhaust generator

        assert.deepEqual(processedPayload, payload);
    });

    it('should handle Symbol.dispose properly', () => {
        const target = new AsyncEventTarget();
        const callback = async () => {
        };
        target.add('type1', callback);
        target[Symbol.dispose]();

        const result = target.remove('type1', callback);
        assert.equal(result, false);
    });

    it('should support adding multiple callbacks to the same event type', async () => {
        const target = new AsyncEventTarget();
        let callCount = 0;
        const callback1 = async () => {
            callCount++;
        };
        const callback2 = async () => {
            callCount++;
        };

        target.add('type1', callback1);
        target.add('type1', callback2);
        const payload = {};

        const gen = target.rise('type1', payload);
        for await (const state of gen) {
        } // Exhaust generator

        assert.equal(callCount, 2);
    });

    it('should handle edge case of removing non-existent type', () => {
        const target = new AsyncEventTarget();
        const result = target.remove('nonExistentType', async () => {
        });
        assert.equal(result, false);
    });

    it('should handle rise without callbacks gracefully', async () => {
        const target = new AsyncEventTarget();
        const gen = target.rise('nonExistentType', {});
        const result = await gen.next();
        assert.equal(result.done, true);
    });

    it('should support cleaning up all stores via Symbol.dispose', () => {
        const target = new AsyncEventTarget();
        const callback = async () => {
        };
        target.add('event1', callback);
        target.add('event2', callback);

        target[Symbol.dispose]();

        let result = target.remove('event1', callback);
        assert.equal(result, false);

        result = target.remove('event2', callback);
        assert.equal(result, false);
    });
});