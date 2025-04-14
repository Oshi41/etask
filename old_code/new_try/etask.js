import {tl} from './timeline.js'

function etask_state({max_concurrency = 16} = {}) {

    const callbacks = {then: [], catch: [], finally: []};
    const timeline = tl.timeline(this);

    this.then = function (reject, resolve) {
        resolve && callbacks.then.push(resolve);
        reject && callbacks.catch.push(reject);
        return this;
    };
    this.catch = function (reject) {
        reject && callbacks.catch.push(reject);
        return this;
    };
    this.finally = function (cb) {
        callbacks.finally.push(cb);
        return this;
    };

    this.return = function (value) {
        timeline.track('return');
    };
    this.throw = function (error) {
        timeline.track('throw');
    };

    return this;
}