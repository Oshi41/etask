import {location} from './err.mjs'

function runner(fn) {
    if (!(this instanceof runner)) return new runner(fn);

    const marks = [];
    const measures = [];

    this._callbacks = {then: [], catch: [], finally: []};
    this.then = function (reject, resolve) {
        resolve && this._callbacks.then.push(resolve);
        reject && this._callbacks.catch.push(reject);
        return this;
    }
    this.catch = function (reject) {
        return this.then(reject);
    };
    this.finally = function (cb) {
        this._callbacks.finally.push(cb);
        return this;
    };

    const self = this;

    this.run = function (...args) {
        const loc = location(1);
        self._measure_fn = function (fn, name) {
            const header = 'runner';
            const start = [header, name, 'start'].join('.');
            const end = [header, name, 'end'].join('.');
            const total = [header, name, 'total'].join('.');
            marks.push(performance.mark(start, {detail: loc}).name);
            try {
                return fn();
            } finally {
                marks.push(performance.mark(end, {detail: loc}).name);

                measures.push(performance.measure(total, start, end).name);
            }
        };

        try {
            const result = self._measure_fn(() => fn.apply(self, ...args), 'fn')

            if (this._callbacks.then.length) {
                self._measure_fn(() => {
                    for (let cb of this._callbacks.then) {
                        cb(result);
                    }
                }, 'then');
            }

            return result;
        } catch (e) {
            if (this._callbacks.catch.length) {
                self._measure_fn(() => {
                    for (let cb of this._callbacks.catch) {
                        cb(e);
                    }
                }, 'catch');
            }

        } finally {
            if (this._callbacks.finally.length) {
                self._measure_fn(() => {
                    for (let cb of this._callbacks.finally) {
                        cb();
                    }
                }, 'finally');
            }

            marks.push(performance.mark('runner.finish.end', {detail: loc}).name);
            measures.push(performance.measure('runner.total', 'runner.fn.start', 'runner.finish.end').name);

            while (marks.length)
                performance.clearMarks(marks.shift());

            while (measures.length)
                performance.clearMeasures(measures.shift());
        }
    };

    this.run_async = async function (...args) {
        const loc = location(1);
        self._measure_fn = async function (fn, name) {
            const header = 'async_runner';
            const start = [header, name, 'start'].join('.');
            const end = [header, name, 'end'].join('.');
            const total = [header, name, 'total'].join('.');
            marks.push(performance.mark(start, {detail: loc}).name);
            const result = await fn();
            marks.push(performance.mark(end, {detail: loc}).name);
            measures.push(performance.measure(total, start, end).name);
            return result;
        };

        try {
            const result = await self._measure_fn(() => fn.apply(self, ...args), 'fn');

            if (this._callbacks.then.length) {
                await self._measure_fn(async () => {
                    for (let cb of this._callbacks.then) {
                        await cb(result);
                    }
                }, 'then');
            }

            return result;
        } catch (e) {
            if (this._callbacks.catch.length) {
                await self._measure_fn(async () => {
                    for (let cb of this._callbacks.catch) {
                        await cb(e);
                    }
                }, 'catch');
            }

        } finally {
            if (this._callbacks.finally.length) {
                await self._measure_fn(async () => {
                    for (let cb of this._callbacks.finally) {
                        await cb();
                    }
                }, 'finally');
            }

            marks.push(performance.mark('async_runner.finish.end', {detail: loc}).name);
            measures.push(performance.measure('async_runner.total', 'async_runner.fn.start', 'async_runner.finish.end').name);

            while (marks.length)
                performance.clearMarks(marks.shift());

            while (measures.length)
                performance.clearMeasures(measures.shift());
        }
    }

    return this;
}

runner(function () {
    console.log('hello');
}).run();