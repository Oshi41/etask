function* runnerOld(fn, thisArg, ...args) {
    const state = {
        loc: null,
        then: [],
        catch: [],
        finally: [],
        gen: null,
    };
    const ctx = {
        then(resolve, reject) {
            typeof resolve == 'function' && state.then.push(resolve);
            typeof reject == 'function' && state.catch.push(reject);
            return this;
        },
        catch(reject) {
            typeof reject == 'function' && state.catch.push(reject);
            return this;
        },
        finally(cb) {
            typeof cb == 'function' && state.finally.push(cb);
            return this;
        },
        get stats() {
            return {
                location: state.loc,
            }
        },
    };

    try {
        const result = yield* _as_gen(() => fn.apply(create_this(thisArg, ctx), ...args));
        for (let cb of state.then) {
            yield* _as_gen(() => cb(result));
        }
        return result;
    } catch (e) {
        for (let cb of state.catch) {
            yield* _as_gen(() => cb(e));
        }
    } finally {
        for (let cb of state.finally) {
            yield* _as_gen(() => cb());
        }
    }
}

function runner(fn) {
    return function runner(...args) {
        const state = {
            loc: null,
            then: [],
            catch: [],
            finally: [],
            marks: [],
            measures: [],
            gen: null,
        };
        const ctx = {
            then(resolve, reject) {
                typeof resolve == 'function' && state.then.push(resolve);
                typeof reject == 'function' && state.catch.push(reject);
                return this;
            },
            catch(reject) {
                return this.then(null, reject);
            },
            finally(cb) {
                typeof cb == 'function' && state.finally.push(cb);
                return this;
            },
            get stats() {
                return {
                    location: state.loc,
                }
            },
        };

        const thisArg = create_this(this, ctx);


        function* _generator() {
            try {
                const result = yield* _as_gen(() => fn.apply(thisArg, ...args));
                for (let cb of state.then) {
                    yield* _as_gen(() => cb(result));
                }
                return result;
            } catch (e) {
                for (let cb of state.catch) {
                    yield* _as_gen(() => cb(e));
                }
            } finally {
                for (let cb of state.finally) {
                    yield* _as_gen(() => cb());
                }
            }
        }

        // Create the generator
        state.gen = _generator();

        // Run the generator to completion synchronously
        let lastValue;
        let isDone = false;

        while (!isDone) {
            const result = state.gen.next();
            lastValue = result.value;
            isDone = result.done;
        }

        state.gen = null;
        return lastValue;
    };
}


const func = runner(function* () {
    this.then(x => {
        console.log('than', x);
    });
    this.catch(x => {
        console.error('error', x);
    });
    this.finally(() => {
        console.log('finally');
    });

    console.log('hello');

    for (let i = 0; i < 100_000; i++) {
        yield 1;
    }

    console.log('goodbye');
    return 2;
});

await func()


// class Runner extends Function {
//     constructor(fn) {
//         super('...args', 'return this(...args);');
//
//         this.fn = fn;
//         this._callbacks = {then: [], catch: [], finally: [],};
//         this._location = null;
//         this._timeline = {
//             marks: [],
//             measures: [],
//         };
//     }
//
//     //#region API
//
//     then(resolve, reject) {
//         typeof resolve == 'function' && this._callbacks.then.push(resolve);
//         typeof reject == 'function' && this._callbacks.catch.push(reject);
//         return this;
//     }
//
//     catch(reject) {
//         return this.then(null, reject);
//     }
//
//     finally(cb) {
//         typeof cb == 'function' && this._callbacks.finally.push(cb);
//         return this;
//     }
//
//     mark(label, info = null) {
//         const full_label = `${this._location?.rel_file}:${this._location?.func_info}:${label}`;
//         const detail = {...this._location};
//
//         if (typeof info == 'object')
//             Object.assign(detail, info);
//         else if (info != null)
//             detail.info = info;
//
//         const mark = performance.mark(full_label, {detail});
//         this._timeline.push(mark);
//
//         if (mark.name.endsWith('.end')) {
//             const name = mark.name.replace('.end', '.start');
//             const open = this._timeline.marks.find(x => x.name === name);
//
//             if (open) {
//                 this._timeline.measures.push(performance.measure(
//                     mark.name.replace('.end', '.total'),
//                     open.name,
//                     mark.name
//                 ));
//             }
//         }
//     }
//
//     //#endregion
//
//     //#region Lifecycle
//
//     #before() {
//         this._disposables = new CompositeDisposable();
//
//         this._disposables.add(this._callbacks.catch, x => x.length = 0);
//         this._disposables.add(this._callbacks.then, x => x.length = 0);
//         this._disposables.add(this._callbacks.finally, x => x.length = 0);
//         this._disposables.add(() => this._location = null);
//         this._disposables.add(this._timeline, x => {
//             console.log(
//                 x.marks.map(x => x.toJSON()),
//                 x.measures.map(x => x.toJSON()),
//             );
//
//             while (x.marks.length)
//                 performance.clearMarks(x.marks.shift().name);
//
//             while (x.measures.length)
//                 performance.clearMeasures(x.measures.shift().name);
//         });
//     }
//
//     #run_callbacks(name, ...args) {
//         const arr = this._callbacks[name];
//         if (!arr.length) return false;
//
//         this.mark(`${name}.start`);
//
//         try {
//             for (let cb of arr) {
//                 cb(...args);
//             }
//         } finally {
//             this.mark(`${name}.end`);
//         }
//
//         return true;
//     }
//
//     #clear() {
//         this._disposables?.dispose();
//         this._disposables = new CompositeDisposable();
//     }
//
//     //#endregion Lifecycle
//
//     /**
//      * Creating this context
//      * @param thisArg
//      * @returns {*|{}}
//      */
//     #ctx(thisArg) {
//         const exposed = ['then', 'catch', 'finally', 'mark', '_timeline'];
//
//         thisArg ??= (typeof globalThis !== 'undefined' ? globalThis : {});
//         return new Proxy(thisArg, {
//             has: (target, prop) => exposed.includes(prop) || prop in target,
//             get: (target, prop, receiver) => exposed.includes(prop)
//                 ? this[prop]
//                 : Reflect.get(target, prop, receiver),
//             set: (target, prop, value, receiver) => Reflect.set(target, prop, value, receiver),
//         });
//     }
//
//     call(thisArg, ...argArray) {
//         return this.apply(thisArg, argArray);
//     }
//
//     apply(thisArg, argArray) {
//         this._location = location(1);
//         this.#before();
//         this.mark('run.start');
//
//         try {
//             const result = this.fn.apply(this.#ctx(thisArg), argArray);
//             this.#run_callbacks('then', result);
//             return result;
//         } catch (e) {
//             if (!this.#run_callbacks('catch', e))
//                 throw e;
//         } finally {
//             this.#run_callbacks('finally');
//
//             this.mark('run.end');
//             this.#clear();
//         }
//     }
// }

/**
 *
 * @param marks {PerformanceMark[]}
 * @param header {string}
 */
function pretty_timeline(marks, header) {
    const results = [];

    let start = marks[0].startTime;
    results.push(new Date(start + performance.timeOrigin).format('yyyy-MM-dd HH:mm:ss.fff'));

    for (let m of marks.toSorted((a, b) => a.startTime - b.startTime)) {
        const n_diff = m.startTime - start;
        const diff = new Date(n_diff);
        start = m.startTime;
        const name = m.name.slice(header.length);
        results.push([
            name,
            diff.getMilliseconds() > 0 ? diff.format('+ ss.fff') + 'mls' : '+0',
        ].filter(Boolean));
    }

    results.push(['total',
        new Date(start - marks[0].startTime).format('ss.fff') + 'mls'
    ])

    return results;
}


