import './global.mjs';
import './date.mjs';
import {AsyncEventTarget} from './events.js';
import {getThread, isBrowser} from './env.mjs';

// saving original console methods
const _console = {...console};

export class Log {
    static ALL_LEVELS = ['debug', 'info', 'log', 'warn', 'error'];
    #events = new AsyncEventTarget();

    static defaultRender({level, timestamp, messages, location, thread} = {}) {
        const records = [];

        if (!isBrowser()) {
            records.push(
                timestamp.format('yyyy-MMM-dd HH:mm:ss.fff'),
                level.toUpperCase().padEnd(5, ' '),
            );
        }

        records.push(
            thread,
            `${location.line}:${location.column}`,
            `${location.function}():`
        );

        return [
            records.join(' | '),
            ...messages
        ];
    }

    //#region console API

    debug(...args) {
        this.#rise_event('debug', args);
    }

    info(...args) {
        this.#rise_event('info', args);
    }

    log(...args) {
        this.#rise_event('log', args);
    }

    warn(...args) {
        this.#rise_event('warn', args);
    }

    error(...args) {
        this.#rise_event('error', args);
    }

    //#endregion

    //#region Appenders

    console({levels = Log.ALL_LEVELS, render = Log.defaultRender} = {}) {
        levels = new Set(levels);
        this.#events.addEventListener('log', async function (evt) {
            if (!!evt?.detail?.level && !levels.has(evt?.detail?.level)) return;

            _console[evt?.detail?.level](...render(evt.detail));
        });
        return this;
    }

    file(filename, {levels = Log.ALL_LEVELS, render = Log.defaultRender} = {}) {
        levels = new Set(levels);
        this.#events.addEventListener('log', async function (evt) {
            if (!!evt?.detail?.level && !levels.has(evt?.detail?.level))
        });
        return this;
    }

    //#endregion

    #rise_event(level, args) {
        const _ = this.#events.dispatchEvent(new CustomEvent('log', {
            cancelable: true,
            bubbles: true,
            detail: {
                location: stacktrace(2),
                timestamp: new Date(),
                messages: args,
                thread: getThread(),
                level,
            }
        }))
    }
}

const log = new Log().console();
export default log;

log.debug('log')
log.log('log')
log.warn('log')
log.error('log')