import {gen_anything, proxy_this, run_anything} from './util.mjs';

class Runner {
    constructor(fn, thisArg, ...args) {
        this.fn = fn;
        this.args = args;
        this.state = {then: [], catch: [], finally: [],};
        this.thisArg = proxy_this(thisArg, this.#create_ctx());

        this.last_value = null;
        this.done = false;
        this.running = false;
        this.children = [];
        this.generator = this.#generator();
        this.runner = Promise.withResolvers();

        this.run();
    }

    then(resolve, reject) {
        typeof resolve == 'function' && this.state.then.push(resolve);
        typeof reject == 'function' && this.state.catch.push(reject);

        if (!this.running) this.run();

        return this;
    }

    catch(reject) {
        typeof reject == 'function' && this.state.catch.push(reject);
        return this;
    }

    finally(cb) {
        typeof cb == 'function' && this.state.finally.push(cb);
        return this;
    }

    sleep(mls) {
        const pwr = Promise.withResolvers();
        const timeout = setTimeout(pwr.resolve, mls);
        pwr.promise.finally(() => clearTimeout(timeout));
        return pwr.promise;
    }

    return(arg) {
        if (this.main_fn) {
            this.main_fn?.return(arg).then(() => {
                this.last_value = arg;
            })
        }

        this.last_value = arg;
        return this.last_value;
    }

    #create_ctx() {
        return {
            then: this.then.bind(this),
            catch: this.catch.bind(this),
            finally: this.finally.bind(this),
            sleep: this.sleep.bind(this),
            return: this.return.bind(this),
        };
    }

    async* #generator() {
        try {
            this.main_fn = gen_anything(this.fn.apply(this.thisArg, ...this.args));
            const result = yield* this.main_fn;

            for (let cb of this.state.then) {
                await run_anything(() => cb(result));
            }
            return result;
        } catch (e) {
            if (!this.state.catch.length)
                throw e;

            for (let cb of this.state.catch) {
                await run_anything(() => cb(e));
            }
        } finally {
            for (let cb of this.state.finally) {
                await run_anything(() => cb());
            }
        }
    }

    async next() {
        if (this.children.length) {
            const {done} = await this.children[0].next();
            if (done) this.children.unshift();
            return this.last_value;
        }

        if (!this.done) {
            const res = await this.generator.next(this.last_value);
            this.done = res.done;
            this.last_value = res.value;

            if (this.done)
                this.runner.resolve(this.last_value);
        }

        return this.last_value;
    }

    async run() {
        if (!this.done && !this.running) {
            this.running = true;

            while (!this.done)
                await this.next();
        }

        return await this.runner.promise;
    }
}

new Runner(function* () {
    this.then(function (v) {
        console.log('then', v);
    })
    this.catch(function (v) {
        console.error('catch', v);
    })
    this.finally(function () {
        console.log('finally');
    })

    console.log('Hello world!');
    this.return('BEFORE');
    yield 'hello';


    console.log('starting awaiting');
    yield this.sleep(1000);
    console.log('awaited');

    return 'hello';
})