import {AsyncEventTarget} from "../utils/events.js";
import {stackLocation} from "../utils/global.mjs";
import {getThread} from "../utils/env.mjs";
import {Runner} from "../egen.mjs";
import {defaultConsoleFlusher, defaultConsoleRender} from "./console.js";

export class Log extends AsyncEventTarget {
    /**** @type {Runner[]}*/
    queue = [];

    constructor() {
        super();
    }

    async #loop(concurrency = 8) {
        if (this.isRunning) return;

        this.isRunning = true;

        try {
            while (this.queue.length) {
                await Promise.all(this.queue.splice(0, concurrency));
            }
        } finally {
            this.isRunning = false;
        }
    }

    #rise(level, ...args) {
        const message = {
            level,
            args,
            location: stackLocation(2),
            timestamp: new Date(),
            thread: getThread(),
        };
        const _logger = this;
        const gen = new Runner(async function* () {
            let state = yield* _logger.rise('filter', {message, canLog: true}, {stoppable: true});
            if (state && !state.canLog) return;

            state = yield* _logger.rise('render', {message, rendered: []}, {stoppable: true});
            message.rendered = state?.payload?.rendered || [];

            yield* _logger.rise('flush', message, {stoppable: true});
        });
        _logger.queue.push(gen);

        this.#loop(8);

        gen.finally(() => {
            const index = _logger.queue.indexOf(gen);
            if (index >= 0)
                _logger.queue.splice(index, 1);
        });
    }

    debug(...args) {
        this.#rise('debug', ...args);
    }

    info(...args) {
        this.#rise('info', ...args);
    }

    log(...args) {
        this.#rise('log', ...args);
    }

    warn(...args) {
        this.#rise('warn', ...args);
    }

    error(...args) {
        this.#rise('error', ...args);
    }
}

export const log = new Log();

log.add('render', defaultConsoleRender);
log.add('flush', defaultConsoleFlusher);