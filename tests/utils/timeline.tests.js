import assert from 'node:assert';
import {Timeline} from '../../src/utils/timeline.mjs';

describe('Timeline', () => {
    let timeline;

    beforeEach(() => {
        timeline = new Timeline();
    });

    describe('Basic Functionality', () => {
        it('should create marks and set first mark as current', () => {
            const mark1 = timeline.mark('start');
            const mark2 = timeline.mark('end');

            assert.strictEqual(timeline.current.name, 'start');
            assert.strictEqual(timeline.current, mark1);
            assert.ok(timeline.current.timestamp() > 0);
            assert.strictEqual(timeline.mark('end').timestamp(), undefined);
        });

        it('should return existing mark if already created', () => {
            const mark1 = timeline.mark('test');
            const mark2 = timeline.mark('test');

            assert.strictEqual(mark1, mark2);
        });

        it('should navigate to next mark', () => {
            timeline.mark('start');
            timeline.mark('middle');
            timeline.mark('end');

            const next = timeline.next();
            assert.strictEqual(timeline.current.name, 'middle');
            assert.strictEqual(next.name, 'middle');
            assert.ok(timeline.current.timestamp() > 0);
        });

        it('should return null when no more marks available', () => {
            timeline.mark('start');
            timeline.mark('end');

            timeline.next(); // move to 'end'
            const result = timeline.next(); // try to move beyond end

            assert.strictEqual(result, null);
            assert.strictEqual(timeline.current.name, 'end');
        });
    });

    describe('Guard Conditions', () => {
        it('should skip marks with failing guards', () => {
            let condition = false;

            timeline.mark('start');
            timeline.mark('conditional').if(() => condition);
            timeline.mark('end');

            const next = timeline.next();
            assert.strictEqual(timeline.current.name, 'end');
            assert.strictEqual(next.name, 'end');
        });

        it('should navigate to marks with passing guards', () => {
            let condition = true;

            timeline.mark('start');
            timeline.mark('conditional').if(() => condition);
            timeline.mark('end');

            const next = timeline.next();
            assert.strictEqual(timeline.current.name, 'conditional');
            assert.strictEqual(next.name, 'conditional');
        });

        it('should handle multiple guards with AND logic', () => {
            let condition1 = true;
            let condition2 = false;

            timeline.mark('start');
            timeline.mark('conditional')
                .if(() => condition1)
                .if(() => condition2);
            timeline.mark('end');

            const next = timeline.next();
            assert.strictEqual(timeline.current.name, 'end');
        });

        it('should handle guard exceptions as failures', () => {
            timeline.mark('start');
            timeline.mark('failing').if(() => {
                throw new Error('Guard error');
            });
            timeline.mark('end');

            const next = timeline.next();
            assert.strictEqual(timeline.current.name, 'end');
        });
    });

    describe('transitionIf Method', () => {
        it('should transition to target mark when condition is true', () => {
            let shouldTransition = false;

            timeline
                .mark('start')
                .mark('middle')
                .mark('error')
                .transitionIf('error', () => shouldTransition)
                .mark('end');

            shouldTransition = true;
            const result = timeline.next();

            assert.strictEqual(timeline.current.name, 'error');
            assert.strictEqual(result.name, 'error');
            assert.ok(timeline.current.timestamp() > 0);
        });

        it('should continue normal navigation when condition is false', () => {
            let shouldTransition = false;

            timeline
                .mark('start')
                .mark('middle')
                .mark('error')
                .transitionIf('error', () => shouldTransition);

            const result = timeline.next();

            assert.strictEqual(timeline.current.name, 'middle');
            assert.strictEqual(result.name, 'middle');
        });

        it('should support multiple transition rules', () => {
            let errorCondition = false;
            let skipCondition = true;

            timeline
                .mark('start')
                .mark('middle')
                .mark('error')
                .mark('skipped')
                .mark('end')
                .transitionIf('error', () => errorCondition)
                .transitionIf('skipped', () => skipCondition);

            const result = timeline.next();

            assert.strictEqual(timeline.current.name, 'skipped');
            assert.strictEqual(result.name, 'skipped');
        });

        it('should check transitions in order and use first matching', () => {
            let condition1 = true;
            let condition2 = true;

            timeline
                .mark('start')
                .mark('target1')
                .mark('target2')
                .mark('end')
                .transitionIf('target1', () => condition1)
                .transitionIf('target2', () => condition2);

            const result = timeline.next();

            assert.strictEqual(timeline.current.name, 'target1');
        });

        it('should handle non-existent target marks gracefully', () => {
            timeline
                .mark('start')
                .transitionIf('nonexistent', () => true)
                .mark('end')

            const result = timeline.next();
            assert.strictEqual(timeline.current.name, 'end');
        });

        it('should handle transition condition exceptions', () => {
            timeline
                .mark('start')
                .mark('error')
                .transitionIf('error', () => {
                    throw new Error('Transition condition failed');
                })
                .mark('end')

            assert.throws(() => {
                timeline.next()
            });
        });

        it('should work with fluent API chaining', () => {
            let errorState = false;

            const api = timeline
                .mark('start')
                .mark('process')
                .mark('error')
                .transitionIf('error', () => errorState)
                .mark('success');

            for (let prop of 'start process error success'.split(' ')) {
                assert.strictEqual(timeline.mark(prop), api.mark(prop));
            }
        });
    });

    describe('Iterator Protocol', () => {
        it('should support for...of iteration', () => {
            timeline.mark('start');
            timeline.mark('middle');
            timeline.mark('end');

            const visited = [];
            for (let mark of timeline) {
                visited.push(mark.name);
            }

            assert.deepStrictEqual(visited, ['start', 'middle', 'end']);
        });

        it('should respect guard conditions in iteration', () => {
            let condition = false;

            timeline.mark('start');
            timeline.mark('conditional').if(() => condition);
            timeline.mark('end');

            const visited = [];
            for (let mark of timeline) {
                visited.push(mark.name);
            }

            assert.deepStrictEqual(visited, ['start', 'end']);
        });

        it('should respect transitionIf in iteration', () => {
            let shouldJump = false;

            timeline
                .mark('start')
                .mark('middle')
                .mark('jumped')
                .transitionIf('jumped', () => shouldJump)
                .mark('end');

            shouldJump = true;
            const visited = [];
            for (let mark of timeline) {
                visited.push(mark.name);

                if (visited.length > 3)
                    shouldJump = false;
            }

            assert.deepStrictEqual(visited, ['start', 'jumped', 'jumped', 'jumped', 'end']);
        });
    });

    describe('Timestamps', () => {
        it('should record timestamps for current marks', () => {
            const startTime = Date.now();

            timeline.mark('start');
            timeline.mark('end');

            const timestamp = timeline.mark('start').timestamp();
            assert.ok(timestamp >= startTime);
            assert.ok(timestamp <= Date.now());
        });

        it('should record timestamps when transitioning', () => {
            timeline
                .mark('start')
                .mark('target')
                .transitionIf('target', () => true);

            const beforeTransition = Date.now();
            timeline.next();
            const afterTransition = Date.now();

            const timestamp = timeline.mark('target').timestamp();
            assert.ok(timestamp >= beforeTransition);
            assert.ok(timestamp <= afterTransition);
        });
    });

    describe('Complex Scenarios', () => {
        it('should handle workflow with error recovery', () => {
            let hasError = false;
            let errorHandled = false;

            timeline
                .mark('start')
                .mark('process')
                .mark('validate')
                .mark('success')
                .mark('error').if(() => hasError)
                .mark('recovery')
                .transitionIf('error', () => hasError)

            // Normal flow first
            timeline.next(); // start -> process
            assert.strictEqual(timeline.current.name, 'process');

            // Trigger error
            hasError = true;
            timeline.next(); // process -> error (via transitionIf)
            assert.strictEqual(timeline.current.name, 'error');

            hasError = false;

            // Continue after error handling
            timeline.next(); // error -> recovery
            assert.strictEqual(timeline.current.name, 'recovery');
        });

        it('should handle multiple conditional branches', () => {
            let mode = 'normal';

            timeline
                .mark('start')
                .mark('normal-path')
                .mark('fast-path')
                .mark('error-path')
                .mark('end')
                .transitionIf('fast-path', () => mode === 'fast')
                .transitionIf('error-path', () => mode === 'error');

            // Test normal path
            timeline.next();
            assert.strictEqual(timeline.current.name, 'normal-path');

            // Reset and test fast path
            timeline = new Timeline();
            mode = 'fast';
            timeline
                .mark('start')
                .mark('normal-path')
                .mark('fast-path')
                .mark('error-path')
                .mark('end')
                .transitionIf('fast-path', () => mode === 'fast')
                .transitionIf('error-path', () => mode === 'error');

            timeline.next();
            assert.strictEqual(timeline.current.name, 'fast-path');
        });

        it('should handle guards and transitions together', () => {
            let canProceed = false;
            let shouldSkip = true;

            timeline
                .mark('start')
                .mark('conditional').if(() => canProceed)
                .mark('target')
                .mark('end')
                .transitionIf('target', () => shouldSkip);

            // Should transition to target, skipping conditional
            timeline.next();
            assert.strictEqual(timeline.current.name, 'target');
        });
    });

    describe('Edge Cases', () => {
        it('should handle empty timeline', () => {
            const result = timeline.next();
            assert.ok(!result,);
            assert.ok(!timeline?.current,);
            assert.ok(!timeline?.current?.name,);
        });

        it('should handle timeline with only one mark', () => {
            timeline.mark('only');

            const result = timeline.next();
            assert.strictEqual(result, null);
            assert.strictEqual(timeline.current.name, 'only');
        });

        it('should handle all marks having failing guards', () => {
            timeline.mark('start');
            timeline.mark('failing1').if(() => false);
            timeline.mark('failing2').if(() => false);

            const result = timeline.next();
            assert.strictEqual(result, null);
            assert.strictEqual(timeline.current.name, 'start');
        });

        it('should handle circular transition references', () => {
            timeline
                .mark('start')
                .mark('loop')
                .transitionIf('start', () => timeline.current.name === 'loop')
                .mark('end');

            timeline.next(); // start -> loop
            assert.strictEqual(timeline.current.name, 'loop');

            timeline.next(); // loop -> start (via transition)
            assert.strictEqual(timeline.current.name, 'start');
        });
    });
});