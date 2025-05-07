//
// function etask(fn, opts) {
//     const name = get_uniq_name(fn);
//     const max_concurrency = opts?.limit || 16;
//     const created = new date_time();
//
//     async function apply(...args) {
//     }
// }
//
// /**
//  *
//  * @param fn {() => Promise}
//  * @param args {any}
//  */
// function e_run(fn, ...args) {
//
// }

// class etask_metric {
//     label;
//     #parent;
//
//     constructor(label, parent) {
//         this.label = label;
//         this.#parent = parent;
//         this.timestamp = new date_time();
//
//         /**
//          * Enqueue historical metric on server
//          * @param details
//          */
//         this.post_metric = details => this.#enqueue_metric('post', {timestamp: this.timestamp, ...details});
//
//         /**
//          * enqueue counter metric posting
//          * @param delta
//          */
//         this.add_metric = delta => this.#enqueue_metric('counter', {delta});
//
//         /**
//          * Enqueue average metric update
//          * @param delta
//          */
//         this.average_metric = delta => this.#enqueue_metric('average', {delta});
//
//         this.log_trace = (...messages) => this.#enqueue_log('trace', ...messages);
//         this.log_debug = (...messages) => this.#enqueue_log('debug', ...messages);
//         this.log_log = (...messages) => this.#enqueue_log('log', ...messages);
//         this.log_info = (...messages) => this.#enqueue_log('info', ...messages);
//         this.log_warn = (...messages) => this.#enqueue_log('warn', ...messages);
//         this.log_error = (...messages) => this.#enqueue_log('error', ...messages);
//
//         /**
//          * mark label on timeline
//          * @returns {this}
//          */
//         this.track = () => {
//             this.#parent.timeline.track(this.label, this.timestamp);
//             return this;
//         };
//
//         /**
//          * perform measurement between already finished labels
//          *
//          * @param name {string} measure metric name
//          * @param end_label {string} label finish
//          * @returns {this}
//          */
//         this.measure_with_label = (name, end_label) => {
//             this.#parent.timeline.measure_labels(name, this.label, end_label);
//             return this;
//         };
//
//         /**
//          * recording custom event with full information provided from user
//          *
//          * @param start {number}
//          * @param end {number}
//          * @returns {this}
//          */
//         this.measure_event = (start, end) => {
//             this.#parent.timeline.measure_event(name, {start, end});
//             return this;
//         }
//     }
//
//     #enqueue_metric(type, details) {
//         metrics.queue.enqueue({name: this.label, _type: type, ...details});
//         return this;
//     }
//
//     #enqueue_log(level, ...messages) {
//         log.log(log_evt(level, new date_time(), ...messages));
//         return this;
//     }
// }
//
// class etask extends Function {
//     #name;
//     #max_concurrency;
//     #promise;
//     #resolve;
//     #reject;
//     #state = {
//         started: false,
//         running: false,
//         finished: false,
//         cancelled: false,
//         value: undefined,
//         error: null,
//     };
//     #child_promise_queue = [];
//     #fn;
//
//     constructor(fn, opts = {}) {
//         super();
//
//         this.#max_concurrency = opts?.limit || 16;
//         this.#name = get_uniq_name(fn);
//         this.#fn = fn;
//     }
//
//     _call
//
//     #create_this(thisArg) {
//         const self = this;
//         thisArg ??= typeof globalThis !== 'undefined' ? globalThis : {};
//         return new Proxy(thisArg, {
//             has(target, p) {
//                 return p in self || p in target;
//             },
//             get(target, p) {
//                 if (p in self) return self[p];
//                 return target[p];
//             }
//         });
//     }
//
//     apply(thisArg, argArray) {
//         // Task already started
//         if (this.#state.started) return this;
//
//         this.#state = {started: true};
//
//         this.timeline = tl.timeline(this);
//         this.metric('etask.start').track().log_info('etask started: ', this.#name);
//         this.#state.running = true;
//
//         const pwr = Promise.withResolvers();
//
//         this.#promise = pwr.promise;
//         this.#resolve = pwr.resolve;
//         this.#reject = pwr.reject;
//
//         try {
//             const promise = this.#fn.apply(this.#create_this(thisArg), argArray);
//
//             if (typeof promise?.next == 'function') {
//                 promise.then(
//                     val => this.#state.cancelled ? null : this.return(val),
//                     err => this.#state.cancelled ? null : this.throw(err),
//                 );
//             } else {
//                 this.return(promise);
//             }
//         } catch (error) {
//             this.throw(error);
//         }
//
//         return this;
//     }
//
//     call(thisArg, ...argArray) {
//         return this.apply(thisArg, argArray);
//     }
//
//     then(resolve, reject) {
//         this.#promise ??= Promise.resolve(this.#state.value);
//         return this.#promise.then(resolve, reject);
//     }
//
//     finally(fn) {
//         this.#promise ??= Promise.resolve(this.#state.value);
//         this.#promise.finally(() => {
//             if (!this.#state.cancelled) {
//                 return fn();
//             }
//         });
//         return this;
//     }
//
//     throw(err) {
//         if (this.#state.finished || this.#state.cancelled) return;
//
//         this.#state.finished = true;
//         this.#state.running = false;
//         this.#state.error = err;
//
//         this.metric('etask.error').track().log_error({etask: this.#name, error: err}, 'etask.error() called');
//
//         for (let child of this.children) {
//             child.cancel();
//         }
//
//         this.#reject?.(err);
//     }
//
//     return(value) {
//         if (this.#state.finished || this.#state.cancelled) return;
//
//         this.#state.finished = true;
//         this.#state.running = false;
//         this.#state.value = value;
//
//         this.metric('etask.return').track().log_info({etask: this.#name, value}, 'etask.return() called');
//
//         this.#resolve?.(value);
//     }
//
//     cancel() {
//         if (this.#state.finished || this.#state.cancelled) return;
//
//         this.#state.cancelled = true;
//         this.#state.running = false;
//
//         this.metric('etask.cancel').track().log_info({etask: this.#name}, 'etask.cancel() called');
//
//         // Cancel all child tasks
//         for (let child of this.children) {
//             child.cancel();
//         }
//
//         // We don't reject or resolve the promise
//         // The promise remains pending
//     }
//
//     async wait() {
//         return this.#promise;
//     }
//
//     children = new Set();
//
//     spawn(fn) {
//         if (this.#state.finished || this.#state.cancelled) {
//             return; // Don't spawn new children if the task is done or cancelled
//         }
//
//         // Handle concurrency limits by queuing child tasks
//         if (this.children.size >= this.#max_concurrency) {
//             this.#child_promise_queue.push(fn);
//             return;
//         }
//
//         const child_task = new etask(fn);
//         this.children.add(child_task);
//
//         // Remove child from parent when it completes
//         child_task.finally(() => {
//             this.metric('etask.child.finish').track().log_info({etask: this.#name, child: child_task.#name}, 'child task finished');
//
//             this.children.delete(child_task);
//
//             // If there are queued child tasks, spawn the next one
//             if (this.#child_promise_queue.length > 0) {
//                 const next_fn = this.#child_promise_queue.shift();
//                 this.spawn(next_fn);
//             }
//         });
//
//         // Start the child task
//         return child_task(...arguments);
//     }
//
//     async wait4children() {
//         // If new children were added during waiting, wait for them too
//         while (this.children.size) {
//             // Wait for all current children to complete
//             await Promise.all(Array.from(this.children).map(child => child.wait()));
//         }
//     }
//
//     sleep(mls) {
//         const pwr = Promise.withResolvers();
//         const timer = setTimeout(() => pwr.resolve(true), mls);
//         pwr.promise.finally(() => clearTimeout(timer));
//         return pwr.promise;
//     }
//
//     get state() {
//         return {...this.#state};
//     }
//
//     get name() {
//         return this.#name;
//     }
//
//     metric(name) {
//         return new etask_metric(name, this);
//     }
// }
//
// // Create a factory function to maintain the correct construction
// export default function etask_fn(fn, opts) {
//     return new etask(fn, opts);
// }
//
// etask_fn(async function() {
//     this.finally(() => this.metric('etask.finally.1').log_info('etask finished: ', this.name));
//     this.finally(() => this.metric('etask.finally.2').log_info('etask finished: ', this.name));
//
//
//     this.metric('etask.start').track().log_info('etask started: ', this.name);
// })();
