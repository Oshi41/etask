/**
 * Converts mostly anything to generator
 *
 * @param any {PromiseLike | Iterable | Iterator | AsyncIterable | AsyncIterator | Generator | AsyncGenerator}
 * @returns {AsyncGenerator<*, *, AsyncGenerator<*, *, *>>}
 */
export async function* to_gen(any) {
    if (typeof any?.next == 'function') {
        return yield* any;
    }
    
    if (typeof any?.then == 'function') {
        return yield* to_gen(await any);
    }
    
    if (typeof any == 'function') {
        yield;
        return yield* to_get(any());
    }

    return yield any;
}

export class EIterator extends Iterator {
    #start = -1;
    #end = -1;
    #error;
    #value;

    /*** @type {AsyncGenerator}*/
    #current;
    /*** @type {{priority: number, fn: (any)=>AsyncGenerator}[]}*/
    #queue = [];

    constructor({no_throw = false} = {}) {
        super();
        this.no_throw = no_throw;
    }

    //#region public

    get started() {
        return this.#start > 0;
    }

    get finished() {
        return this.#end > 0;
    }

    add(fn, priority = 0) {
        this.#queue.push({fn, priority});
    }

    //#endregion

    //#region private

    #can_next() {
        if (this.#current) return true;
        if (!this.#queue.length) return false;
        const priority = Math.min(...this.#queue.map(x => x.priority));
        const index = this.#queue.findIndex(x => x.priority === priority);
        const [{fn}] = this.#queue.splice(index, 1);
        this.#current = to_gen(fn(this.#value));
        return true;
    }

    //#region

    async next(...[value]) {
        if (!this.started) {
            this.#start = Date.now();
        }

        if (!this.finished) {
            
        }


        // if (this.finished) return {done: true};
        //
        // if (!this.started) {
        //     this.#start = Date.now();
        // }
        //
        // const iter = this.#peek_generator();
        // if (iter) {
        //     try {
        //         const step = await iter.next();
        //     } catch (e) {
        //
        //     }
        // }
        //
        // try {
        //
        //     this.#ret_val = step.value;
        // } catch (e) {
        //     return await this.throw(e);
        // }


    }

    async throw(e) {
        if (!this.finished) {
            this.#end = Date.now();
            this.#error = e;
            this.#value = null;
        }

        return await this.return();
    }

    async return(value) {
        if (!this.finished) {
            this.#end = Date.now();
            this.#value = value;
            this.#error = null;
        }

        if (!!this.#error && !this.no_throw)
            throw this.#error;

        return {done: true, error: this.#error, value: this.#value};
    }
}

