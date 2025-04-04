/** 
 * Converts mostly anything to generator
 *
 * @param any {PromiseLike | Iterable | Iterator | AsyncIterable | AsyncIterator | Generator | AsyncGenerator}
 * @returns {AsyncGenerator<*, *, AsyncGenerator<*, *, *>>}
 */
export async function* to_gen(gen) {
    if (typeof gen?.next == 'function') {
        gen = yield* gen;
        return yield* to_gen(gen);
    }
    
    if (typeof gen?.then == 'function') {
        gen = yield await gen;
        return yield* to_gen(gen);
    }

    return yield gen;
}

function e_listener(opts = {}) {
    const cbs = [];
    
    this.on = (cb, opts = {})=>{
        const {once = 0, priority = 0} = opts;
        const arr = cbs.find(x => x[0] === cb);
        if (arr) return false;
        
        cbs.push([cb, opts]);
    }
    this.off = (cb)=>{
        const i = cbs.findings(x => x[0] === cb);
        if (i < 0) return false;
        
        cbs.splice(i, 1);
        return true;
    }
    this.raise = function (payload){
        const ac = new AbortController();
        const ev = {
            payload,
            cancel: ()=>{
                if (opts.cancellable)
                    ac.abort("user");
            },
            get cancelled(){
                return ac.signal.aborted;
            }
        };
        
        return cbs.map(async * function(cb) {
            ac.signal.throwIfAborted();
            yield await cb(ev);
        });
    };
    
    return this;
}

function async_evt(owner, opts={}) {
    this.up = !!opts.up;
    this.down = !!opts.down;
    this.cancellable = !!opts.cancellable;
    this.owner = owner;
    
    this.set_parent = function (parent) {
        if (this.parent === this.
    }
    
    if (opts.parent) {
        this.parent = opts.parent;
    }
    
    return this;
}

function e_it(fn, {limit = 16}={}) {
    return function (...args) {
        this.children = [];
        this.listeners = {};
        const gen = to_gen(fn(...args));
        const pwr = Promise.withResolvers();
        
    
        const on_child_finished = async (ev)=>{
            const index = this.children.indexOf(ev.et);
            if (index < 0) return;
            
            this.children.splice(index, 1);
            ev.cancel();
        };
        this.wait = () => pwr.promise;
        this.return = function(value){
            this.end = Date.now();
            return this.gen.return(value);
        }
        this.throw = function(e) {
            this.end = Date.now();
            return this.gen.throw(e);
        }
        this.spawn = function(fn){
            if (!(fn instanceof e_it))
                fn = e_it(fn);
            
            this.children.push(fn);
            return fn.wait();
        }
        this.next = async function(rv) {
            if (!this.start) {
                this.start = Date.now();
            }
            
            if (!this.end) {
                const iteration = this.queue.slice(0, limit)
            }
            
            if (this.end) {
                if (this.parent) {
                    const index = 
                }
            }
            
            return {
                done: true, 
                value: await pwr.promise
            };
        }
    };
}

class e_ygit extends Iterator {
    #time = {start: 0, end: 0};
    #states = {};
    #gen;

    static* #recursive(any) {
        if (typeof any?.next == 'function') {
            let res;
            for await (let value of any) {
                res = yield* e_it.#recursive(value);
            }
            return res;
        }
        
        if (typeof any?.then == 'function') {
            any = yield* e_it.#recursive(await any);
            return any;
        }
        
        return yield any;
    }
    
    static* #safe(any){
        let step;
        
        while (step?.done) {
            try {
                step = await any.next();
            } catch (e) {
                step = {error: e, done: 1};
            }
            
            try {
                step = yield step;
            } catch (e) {
                step = {error: e, done: 1};
            }
        }
        
        return step;
    }
    
    static #it(any) {
        if (typeof any?.next == 'function') {
            const it = any;
            
            let step;
            
            while (step?.done) { 
                try {
                    step = await it.next();
                }
                catch (e) {
                    step = e_it.#it_err(e);
                }
                
                try {
                    step = yield step;
                }
                catch (e) {
                    step = e_it.#it_err(e);
                }
            }
            
            if(step.error) {
                step = yield * e_it.#it(step.error);
                return e_it.#it_err(step.value);
            } else {
                step = yield * e_it.#it(step.value);
                return step;
            }
        }
        
        if (typeof gen?.then == 'function') {
            
        }
    }
    
    constructor(fn) {
        super();
        this.#gen = async *function (...args) {
            yield;
            it = fn(...args);
            
        }();
    }
    
    async #on_start(){
        this.#time.start = Date.now();
        this.#pwr = Promise.withResolvers();
    }
    
    async #run(){
        if (this.#state.tick || this.#state.run)
            return this.#pwr.promise; 
        
    }
    
    async #next(rv){
        let step;
        
        try {
            step = await this.#gen.next(rv);
        }
        catch (e) {
            step = {done: 1, error: e};
        }
    }
    
    async #catch(e) {
        
    }
}

function etask(fn){
    this.
    
    return async function(...args){
        const it = to_gen(fn(...args));
        try {
            return yield* it;
        }
        catch (e){
            
        }
    };
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

