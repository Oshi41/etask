// /**
//  * Same as TimeSpan in c# - with lots of helping methods
//  */
// class duration {
//     constructor(date_or_number) {
//         this.hours = this.minutes = this.seconds = this.milliseconds = this.ticks = date_or_number;
//     }
//
//     toString() {
//         return [
//             this.hours && this.hours.toString().padStart(2, '0') + ' hours',
//             this.minutes && this.minutes.toString().padStart(2, '0') + ' minutes',
//             this.seconds && this.seconds.toString().padStart(2, '0') + ' seconds',
//             this.milliseconds && this.milliseconds.toString().padStart(3, '0') + ' mls',
//             this.ticks && this.ticks.toString().padStart(4, '0') + ' ticks',
//         ].filter(Boolean)
//             .join(', ');
//     }
// }
//
// /**
//  * Try to make this class customizable.
//  * Maybe we can export this class to lalow users to overwrite it?
//  */
// class log_entry {
//     #name
//     #start
//
//     constructor(name, {start = Date.now()}) {
//         this.#name = name;
//         this.#start = start;
//     }
//
//     /**
//      * schedule or send historical metric record to server
//      * @param detail
//      * @returns {log_entry}
//      */
//     post_metric(detail) {
//         // todo implement
//         return this;
//     }
//
//     /**
//      * schedule or send counter metric to server
//      * @param add
//      * @returns {log_entry}
//      */
//     add_metric(add = 1) {
//         // todo implement
//         return this;
//     }
//
//     /**
//      * schedule or send average metric to server
//      * @param value
//      * @returns {log_entry}
//      */
//     average_metric(value = 0) {
//         // todo implement
//         return this;
//     }
//
//     /**
//      * Mark timeline entry
//      */
//     mark_timeline() {
//         // todo implement
//         return this;
//     }
//
//     /**
//      * Starting recording timeline execution
//      */
//     start_timeline() {
//         // todo implement
//         return this;
//     }
//
//     /**
//      * Starting recording timeline execution
//      */
//     end_timeline() {
//         // todo implement
//         return this;
//     }
//
//     /**
//      *
//      * @param lvl {'trace' | 'debug' | 'info' | 'log' | 'warn' | 'error'}
//      * @param additional {any}
//      */
//     log(lvl, additional) {
//         // todo implement
//         return this;
//     }
//
//     [Symbol.asyncDispose]() {
//         // flush metrics to server
//     }
// }
//
// /**
//  * Cancellable promise.
//  *
//  * Requirements:
//  *      Use as func wrapper (see const router)
//  *
//  * Ideally:
//  *      Works in every environment
//  */
// export class etask extends Function, Promise {
//     #fn
//
//     constructor(fn, opts = {}) {
//         super();
//         this.#fn = fn;
//         this.name = this.#get_uniq_name(fn);
//
//         if (opts.metric)
//             this.metric = opts.metric;
//     }
//
//     /**
//      * Gets uniq name for etask.
//      * Ideally: 'file.class.func' for identification
//      * @param fn
//      */
//     #get_uniq_name(fn) {
//         // todo implement
//     }
//
//     /**
//      * Working with etask metrics
//      *
//      * @param name
//      * @param start
//      * @returns {log_entry}
//      */
//     metric(name, start = 0) {
//         return new log_entry(name, {start: start || Date.now()});
//     }
//
//     /**
//      * Returns current etask state
//      *
//      * @returns {{running: true} | {success: true, value: any} | {failed: true, error: any}}
//      */
//     result() {
//         // todo implement
//     }
//
//     /**
//      * sleep execution for provided milliseconds
//      * @param mls
//      * @returns {etask}
//      */
//     sleep(mls) {
//         // todo implement
//     }
//
//     // see this.reject
//     throw(error) {
//         return this.reject(error)
//     }
//
//     // see this.resolve
//     return(value) {
//         return this.resolve(value);
//     }
//
//     /**
//      * Reject current task execution and immediately stops execution
//      *
//      * @param error
//      * @returns {*}
//      */
//     reject(error) {
//         this.metric('etask.reject')
//             .mark_timeline()
//             .log('error', {error, etask: name});
//         return this;
//     }
//
//     /**
//      * Set task as finished with provided value. Immediately stops execution
//      * @param value
//      * @returns {*}
//      */
//     resolve(value) {
//         // todo implement
//         this.metric('etask.resolve')
//             .mark_timeline()
//             .log('trace', {value, etask: name});
//         return this;
//     }
//
//     /**
//      * Adds finally callback to current task
//      * @param callback
//      * @returns {*}
//      */
//     finally(callback) {
//         // todo implement
//
//         this.metric('etask.finally')
//             .mark_timeline()
//             .log('trace', {etask: name, timeline: this.timeline});
//         return this;
//     }
//
//     /**
//      * PromiseLike impl
//      * Attached success \ failed callbacks to current task
//      * @param resolve
//      * @param reject
//      * @returns {*}
//      */
//     then(resolve, reject) {
//         // todo implement
//         return this;
//     }
//
//     /**
//      * Adds catch callback to current task
//      * @param callback
//      * @returns {*}
//      */
//     catch(callback) {
//         return this.then(null, callback);
//     }
//
//     /**
//      * Attaches function as children to current task.
//      * Parent task cannot finish until all the children finished
//      * @param fn
//      * @returns {*}
//      */
//     spawn(fn) {
//         if (!(fn instanceof etask))
//             fn = etask(fn);
//
//         const metric = this.metric('etask.spawn')
//             .add_metric(1)
//             .log('trace', {children: this.children.length, etask: this.name, child: fn.name});
//
//         fn.finally(() => metric.add_metric(-1)
//             .log('trace', {children: this.children.length, etask: this.name, child: fn.name})
//         );
//
//         // todo implement
//         return fn;
//     }
//
//     /**
//      * waits for all children to be executed
//      * @returns {etask}
//      */
//     wait4children() {
//         // todo implement
//     }
//
//     /**
//      * Waits the end of the task.
//      * To resolve explicitly use this.resolve \ this.reject
//      */
//     wait() {
//         // todo implement
//     }
// }
//
// /////////////////////
// // User experience //
// /////////////////////
// const api = {};
// const router = etask(async function express_router(req, res, next) {
//
//     // subscribe on request events
//     req.on('close', err => err ? this.reject(err) : this.resolve());
//
//     this.catch(async error => {
//         this.metric('response.error')
//             .post_metric({url: req.url, error, code: res.code})
//             .mark_timeline()
//             .log('error', {etask: this.name});
//
//         if (!req.headersSent) await req.code(500).send('Internal server error');
//     });
//     this.then(() => {
//         this.metric('response.success')
//             .post_metric({url: req.url, code: res.code})
//             .mark_timeline()
//             .log('trace', {etask: this.name});
//     });
//     this.finally(async () => {
//         this.metric('response.stats')
//             .post_metric({
//                 url: req.url,
//                 code: res.code,
//                 usage: {
//                     read: req.socket.bytesRead,
//                     sent: req.socket.bytesWritten,
//                 },
//                 timeline: this.metric.timeline,
//             })
//             .log('trace', {etask: this.name});
//
//         this.metric('response.time').average_metric(this.metric.timeline.total());
//
//         if (!req.headersSent) await res.code(200).send('ok');
//     });
//
//     // max awaiting time for request
//     this.sleep(1000 * 60 * 10).then(() => {
//         this.throw('timeout');
//     });
//
//     // spawn children in async way
//     // parent will not finish until
//     // all the children finished
//     this.spawn(async function () {
//         req.user = await api.v1.load_user(req.headers.get('user'));
//     });
//     this.spawn(async function () {
//         req.geo = await api.v1.load_position(req.headers.get('location'));
//     });
//
//     const metric = this.metric('response.api_requests').start_timeline()
//         .log('trace', {etask: this.name, msg: 'starting api requests'});
//
//     await this.wait4children();
//
//     metric.end_timeline().log('trace', {etask: this.name, msg: 'api requests finished'});
//
//     next();
//
//     // put itself into await step until explicit reject\resolve calls
//     return this.wait();
// })
//
// ///////////////
// // Use cases //
// ///////////////
// etask(async function prevent_next_code_execution(obj) {
//     this.sleep(1000).then(() => this.throw('timeout'));
//
//     // in case of long time response, timeout will be throws
//     const req = await fetch('some_url');
//     // but promise will continue executing and obj will be changed
//     obj.resp = await req.json();
// })
