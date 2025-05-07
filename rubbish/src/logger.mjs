import './util.mjs';
import {Queue} from './queue.mjs';
import {location} from './err.mjs';

export class Logger extends Queue {
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

        ['trace', 'debug', 'info', 'log', 'warn', 'error'].forEach(lvl => {
            this[lvl] = (...args) => {
                if (this.#can_log(lvl)) {
                    const item = {level: lvl, messages: args};
                    const enriched = [];

                    if (this.opts.enrich.date) {
                        enriched.push(new Date().format(this.opts.enrich.date), '|');
                    }

                    if (this.opts.enrich.location == 'stack') {
                        const loc = location(1);
                        enriched.push(loc.rel_file, '|');
                        enriched.push(loc.func_info, '|');
                    }

                    item.messages.unshift(...enriched);

                    const _ = new Promise(async resolve => {
                        if (await this._can_enqueue(item)) {
                            await this.enqueue(item);
                        }

                        resolve();
                    });
                }

                return this;
            }
        })
    }

    #can_log(level) {
        if (this.opts.levels == 'any') return true;
        if (this.opts.levels == 'none') return false;

        return this.opts.levels.includes(level);
    }

    async _can_enqueue(item) {
        return true;
    }

    async _process_item(item) {
        if (this.opts.providers.console) {
            console[item.level](...item.messages);
        }

        return true;
    }
}