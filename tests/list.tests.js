import {strict as assert} from 'assert';
import {LinkedList} from '../src/list.mjs';

describe('LinkedList', function () {
    let list;

    beforeEach(function () {
        list = new LinkedList();
    });

    describe('insertValue', function () {
        it('should insert the first value into an empty list', function () {
            const node = list.insertValue(10);
            assert.equal(list.head, node);
            assert.equal(list.tail, node);
            assert.equal(list.head.value, 10);
            assert.equal(list.tail.value, 10);
            assert.equal(list.length, 1);
        });

        it('should insert a value at the head in "before" mode', function () {
            list.insertValue(20);
            const node = list.insertValue(10, 0, 'before');
            assert.equal(list.head, node);
            assert.equal(list.head.value, 10);
            assert.equal(list.head.next.value, 20);
            assert.equal(list.length, 2);
        });

        it('should insert a value at the tail in "after" mode', function () {
            list.insertValue(10);
            const node = list.insertValue(20, 0, 'after');
            assert.equal(list.tail, node);
            assert.equal(list.tail.value, 20);
            assert.equal(list.head.value, 10);
            assert.equal(list.length, 2);
        });

        it('should insert a value at the correct index', function () {
            // 10
            list.insertValue(10, 0, 'before');
            // 30 10
            list.insertValue(30, 0, 'before');
            // 30 20 10
            const node = list.insertValue(20, 1, 'before');
            assert.equal(list.length, 3);
            assert.equal(list.head.value, 30);
            assert.equal(list.head.next.value, 20);
            assert.equal(list.head.next.next.value, 10);
            assert.equal(list.head.next, node);
            assert.equal(list.tail.prev, node);
        });

        it('should throw an error for an invalid index', function () {
            assert.throws(() => list.insertValue(10, 5), /index too big/);
        });

        it('should throw an error for an invalid mode', function () {
            assert.throws(() => list.insertValue(10, 0, 'invalid-mode'), /mode must be before\/after only/);
        });
    });

    describe('nodeAt', function () {
        it('should return the correct node at a given index', function () {
            list.insertValue(10);
            list.insertValue(20);
            list.insertValue(30);

            const node = list.nodeAt(1);
            assert.equal(node.value, 20);
        });

        it('should return the correct node for a negative index', function () {
            list.insertValue(10, -1, 'after');
            list.insertValue(20, -1, 'after');
            list.insertValue(30, -1, 'after');

            const node = list.nodeAt(-1);
            assert.equal(node.value, 30);
        });

        it('should return null for an out-of-bounds index', function () {
            list.insertValue(10);
            const node = list.nodeAt(5);
            assert.equal(node, null);
        });
    });

    describe('[Symbol.iterator]', function () {
        it('should iterate over all nodes in the list', function () {
            const values = [10, 20, 30];
            values.forEach(value => list.insertValue(value, -1, 'after'));

            const iteratedValues = Array.from(list).map(node => node.value);
            assert.deepEqual(iteratedValues, values);
        });

        it('should return an empty iterator for an empty list', function () {
            const iteratedValues = Array.from(list).map(node => node.value);
            assert.deepEqual(iteratedValues, []);
        });
    });

    describe('deletion', function () {
        this.timeout(10000);

        for (let size of [1, 1000, 10_000, 100_000]) {
            it(`[array] [${size}] fill and delete`, () => {
                const arr = Array(size)
                    .keys()
                    .map(x => ({
                        elem: x,
                        discard() {
                            const index = arr.indexOf(this);
                            if (index !== -1) {
                                arr.splice(index, 1);
                            }
                        }
                    }))
                    .toArray();

                assert.equal(arr.length, size);

                const nodesToCall = [...arr];
                arr.sort(() => Math.random() - 0.5);


                for (let node of nodesToCall) {
                    node.discard();
                }

                assert.equal(arr.length, 0);
            });

            it(`[list] [${size}] fill and delete]`, () => {
                const list = new LinkedList();
                const nodes = [];

                for (let item of Array(size).keys().toArray().sort(() => Math.random() - 0.5)) {
                    const node = list.insertValue(item, -1, 'after');
                    nodes.push(node);
                }

                assert.equal(nodes.length, size);
                assert.equal(list.length, size);

                for (let node of nodes) {
                    node[Symbol.dispose]();
                }

                assert.equal(list.length, 0);
            });
        }
    });
});