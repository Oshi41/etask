import {duration} from "./duration.js";

const perf_api = {
    now: () => performance.now(),
    mark: (label, start) => performance.mark(label, {startTime: start}),
}
let api = {...perf_api};
export const timeline_factory = {
    get_api: () => api,
    set_api: user_api => api = {...user_api},
    use_defaults: function () {
        return this.set_api(perf_api)
    },
    create: owner => new timeline(owner),
};

class timeline {
    #owner;
    /*** @type {{label, ts}[]}*/
    #events = [];
    #api = {};

    constructor(owner) {
        this.#owner = new WeakRef(owner);

        this.#api.now = () => timeline_factory.get_api().now.apply(this, []);
        this.#api.mark = (label, start) => timeline_factory.get_api().mark.apply(this, [label, start]);
    }

    // getters
    get owner() {
        return this.#owner.deref();
    }

    get start() {
        return Math.min(...this.#events.map(e => e.ts));
    }

    get end() {
        return Math.max(...this.#events.map(e => e.ts));
    }

    // api
    mark(label) {
        const now = this.#api.now();
        this.#events.push({
            label,
            ts: now,
        });
        this.#api.mark(label, now);
        return this;
    }

    total() {
        return new duration(this.end - this.start);
    }

    [Symbol.iterator]() {
        return this.#events
            .toSorted((a, b) => a?.ts - b?.ts)
            [Symbol.iterator]();
    }

    toJSON() {
        return {
            owner: this.owner?.name,
            duration: this.total().toTimeString(),
            items: Array.from(this),
        };
    }
}




