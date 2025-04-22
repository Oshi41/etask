import './util.mjs';
import {Queue} from './queue.mjs';
import {location} from './err.mjs';

export class LogItem extends Queue {
    static {
        for (let lvl of ['trace', 'debug', 'info', 'log', 'warn', 'error']) {
            this.prototype[lvl] = function (...messages) {
                this.#log_event(lvl, messages);
            };
        }
    }

    constructor(opts) {
        super(Object.assign({
            levels: 'any',
            providers: {
                console: true,
            },
            enrich: {
                date: 'yyyy-MMM-dd HH:mm:ss.SSS',
                location: 'stack',
            },
        }, opts));
    }

    async _can_enqueue(item) {
        if (this.opts.levels == 'any') return true;
        if (this.opts.levels == 'none') return false;

        return this.opts.levels.includes(item.level);
    }

    async _process_item(item) {
        if (this.opts.providers.console) {
            console[item.level](...item.messages);
        }

        return true;
    }

    async _enrich_item(item) {
        const enriched = [];

        if (this.opts.enrich.date) {
            enriched.push(new Date().format(this.opts.enrich.date), '|');
        }

        if (this.opts.enrich.location) {
            const loc = location(3);
            enriched.push(loc.rel_file, '|');
            enriched.push(loc.func_info, '|');
        }

        item.messages.unshift(...enriched);
        return item;
    }

    async #log_event(level, messages) {
        await this.enqueue({level, messages});
    }
}