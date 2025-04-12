import {date_time} from './date/date_time.js';
import {date_part} from "./date/part.js";

class timeline_api {
    track(label, ts) {
    }

    measure_labels(name, start_label, end_label) {

    }

    measure_event(name, {start, end}) {
    }
}

function timeline(owner) {
    if (!(this instanceof timeline)) return new timeline(owner);

    owner = new WeakRef(owner);
    this.times = [];

    Object.defineProperty(this, 'owner', {
        get() {
            return owner.deref()?.name;
        }
    });

    /**
     * Mark label on timeline.
     */
    this.track = function (label, ts = 0) {
        ts ??= new date_time().high_res_mls;
        this.times.push({label, ts});
        tl.api.track(label, ts);
        return this;
    };

    /**
     * Measure duration between labels. They must exist already!
     * @param name - meassure metric name
     * @param start_label
     * @param end_label
     */
    this.measure_labels = function (name, start_label, end_label) {
        const start = this.times.find(x => x.label === start_label)?.ts;
        const end = this.times.find(x => x.label === end_label)?.ts;

        if (!start) throw new Error(`Label ${start_label} not found`);
        if (!end) throw new Error(`Label ${end_label} not found`);

        const duration = new date_part(end - start);

        this.times.push({label: name, start, end, duration});

        tl.api.measure_labels(name, start_label, end_label);
        return this;
    };

    /**
     * Measure event with duration provided by user.
     */
    this.measure_event = function (name, {start, end}) {
        const ev = {start, end, duration: new date_part(end - start)};
        this.times.push({label: name, ...ev});
        tl.api.measure_event(name, ev);
        return this;
    }

    this.track('start');
    return this;
}

let api = new timeline_api();

export const tl = {
    /**
     *
     * @returns {timeline_api}
     */
    get api() {
        return api;
    },

    /**
     *
     * @param value {timeline_api}
     */
    set api(value) {
        api = value;
    },

    timeline: o => timeline(o),
};