import {assert, tryDispose} from "./utils/global.mjs";

export class LinkedList {
    constructor() {
        /** @type {null | ReturnType<#createNode>}*/
        this.head = null;
        /** @type {null | ReturnType<#createNode>}*/
        this.tail = null;
        this.length = 0;
    }

    /**
     * Inserts a value into a doubly-linked list at the specified index and in the specified mode.
     *
     * @param {any} value The value to be inserted into the list.
     * @param {number} [index=0] The index at which to insert the value. Default is 0.
     * @param {string} [mode='before'] The mode of insertion, either 'before' or 'after' the anchor node. Default is 'before'.
     * @return {Disposable | null} The newly inserted node, or null if the insertion fails.
     */
    insertValue(value, index = 0, mode = 'before') {
        const list = this;
        const node = {
            prev: null,
            value,
            next: null,
            [Symbol.dispose]: function dispose() {
                // move head / tail
                if (this === list.head) list.head = this.next;
                if (this === list.tail) list.tail = this.prev;

                // unlink
                if (this.prev) this.prev.next = this.next;
                if (this.next) this.next.prev = this.prev;

                // clear node value
                if ('value' in this) {
                    list.length--;
                    tryDispose(this.value);
                }

                delete this.prev;
                delete this.next;
                delete this.value;
            }
        };

        assert(!!node, 'node must be provided');
        assert(index <= this.length, 'index too big');
        assert('before after'.includes(mode), 'mode must be before/after only');

        const consolidateNode = (prev, node, next) => {
            node.prev = prev;
            node.next = next;

            if (node.prev) node.prev.next = node;
            if (node.next) node.next.prev = node;

            this.length += 1;
            return node;
        };

        // insert first item
        if (this.length == 0 && (index == 0 || index == -1)) {
            return this.head = this.tail = consolidateNode(null, node, null);
        }

        const anchor = this.nodeAt(index);

        // insert as new header
        if (mode == 'before' && anchor === this.head && anchor) {
            // [node] -> head -> next
            return this.head = consolidateNode(null, node, this.head);
        }

        // insert as new tail
        if (mode == 'after' && anchor === this.tail && anchor) {
            // tail -> [node]
            return this.tail = consolidateNode(this.tail, node, null);
        }

        // insert before
        if (mode == 'before' && anchor) {
            // prev -> [node] -> anchor -> next
            return consolidateNode(anchor.prev, node, anchor);
        }

        // insert after
        if (mode == 'before' && anchor) {
            // prev -> anchor -> [node] -> next
            return consolidateNode(anchor, node, anchor.next);
        }
    }

    nodeAt(index) {
        if (index < 0) {
            index = Math.abs(index) - 1;
            let node = this.tail;
            for (let i = 0; i < index && node; i++) {
                node = node.prev;
            }
            return node;
        } else {
            let node = this.head;
            for (let i = 0; i < index && node; i++) {
                node = node.next;
            }
            return node;
        }
    }

    * [Symbol.iterator]() {
        let node = this.head;
        while (node) {
            yield node;
            node = node.next;
        }
    }
}