export class Timeline {
    #marks = new Map();
    /**** @type {string[]}*/
    #sequence = [];
    /**** @type {null | string}*/
    #current = null;
    #timestamps = new Map();
    #transitions = [];

    constructor() {
        this.#current = null;
    }

    get #activeTransition() {
        const currentIndex = this.#sequence.indexOf(this.#current);

        for (const transition of this.#transitions) {
            // unknown transition
            if (!this.#sequence.includes(transition.to))
                continue;

            // unknown from or current step is earlier
            if (transition.from) {
                const i = this.#sequence.indexOf(transition.from);
                if (i < 0 || currentIndex < i) continue;
            }

            // unknown until or current step is later
            if (transition.until) {
                const i = this.#sequence.indexOf(transition.until);
                if (i < 0 || currentIndex > i) continue;
            }

            // cannot transit
            if (!transition.guard())
                continue;

            return transition;
        }
    }

    get current() {
        return this.#marks.get(this.#current);
    }

    #checkGuards(mark) {
        // Access guards from mark's internal state
        const guards = mark._guards || [];
        if (!guards || guards.length === 0) return true;

        return guards.every(guard => {
            try {
                return guard();
            } catch (e) {
                return false;
            }
        });
    }

    #createMarkApi(name) {
        const state = {
            name,
            guards: [],
            timeline: this,
            owner: this,
        };

        const markApi = {
            get name() {
                return name;
            },

            if(guard) {
                state.guards.push(guard);
                return this;
            },

            mark(markName) {
                return state.timeline.mark(markName);
            },

            transitionIf(name, guard) {
                state.owner.#transitions.push({
                    until: this.name,
                    to: name,
                    guard,
                });
                return this;
            },

            timestamp() {
                return state.owner.#timestamps.get(name);
            }
        };

        // Store reference for internal access
        markApi._guards = state.guards;

        return markApi;
    }

    mark(name) {
        if (this.#marks.has(name)) {
            return this.#marks.get(name);
        }

        const mark = this.#createMarkApi(name);
        this.#marks.set(name, mark);
        this.#sequence.push(name);

        // Set first mark as current if none set
        if (!this.#current) {
            this.#current = name;
            this.#timestamps.set(name, Date.now());
        }

        return mark;
    }

    next() {
        const nextIndex = (() => {
            const transition = this.#activeTransition;
            if (transition)
                return this.#sequence.indexOf(transition.to);

            if (this.#sequence.includes(this.#current))
                return this.#sequence.indexOf(this.#current) + 1;

            return -1;
        })();

        if (nextIndex === -1 || nextIndex >= this.#sequence.length) {
            return null;
        }

        // Find next mark with passing guards
        for (let i = nextIndex; i < this.#sequence.length; i++) {
            const markName = this.#sequence[i];
            const mark = this.#marks.get(markName);

            if (this.#checkGuards(mark)) {
                this.#current = markName;
                if (!this.#timestamps.has(markName))
                    this.#timestamps.set(markName, Date.now());
                return mark;
            }
        }

        return null;
    }

    // Iterator support for usage pattern 1
    * [Symbol.iterator]() {
        let current = this.current;
        while (current) {
            yield current;
            current = this.next();
        }
    }
}

// const timeline = new Timeline();
// timeline.mark('start')
//     .mark('before').if(() => true)
//     .mark('main').if(() => true)
//     .mark('after').if(() => false)
//     .transitIf('error', () => this.error)
//     .mark('error').if(() => this.error)
//     .mark('finally').if(() => true)
//     .mark('end');

// timeline.mark('start')
//     .mark('before').if(callbacksExists('before'))
//     .mark('main').if(callbacksExists('main'))
//     .mark('after').if(callbacksExists('after'))
//     .transitIf('error', () => this.error)
//     .mark('catch').if(() => this.error).if(callbacksExists('catch'))
//     .mark('finally').if(callbacksExists('finally'))
//     .transitIf('before', () => !this.error && callbacksExists('before')())
//     .mark('end');

// 1. usage
// for (let mark of timeline) {
//     switch (mark.name) {
//         case 'start':
//         case 'before':
//         case 'main':
//         case 'after':
//         case 'error':
//         case 'finally':
//             // some actions
//             break;
//     }
// }
//
// // 2. Generator usage
// while (!timeline.current) {
//     switch (timeline.current.name) {
//         case 'start':
//         case 'before':
//         case 'main':
//         case 'after':
//         case 'error':
//         case 'finally':
//             // some actions
//             // ...
//
//             // move timeline to next position
//             timeline.next();
//             break;
//     }
// }
