import {async_runner, runner} from './util.mjs';

const writers = runner(function () {
    const map = new Map();
    const {prepareStackTrace: p, stackTraceLimit: l} = Error;

    this.finally(() => Error.prepareStackTrace = p);
    if (l > 0) {
        this.finally(() => Error.stackTraceLimit = l);
        Error.stackTraceLimit = 1;
    }

    Error.prepareStackTrace = (_, [{constructor: {prototype}}]) => {
        for (let prop of Object.getOwnPropertyNames(prototype).filter(x => x !== 'constructor')) {
            const fn = prototype[prop];
            if (typeof fn == 'function') {
                map.set(fn.name, function (callsite, info) {
                    info[fn.name] = fn.call(callsite, []);
                });
            }
        }
    };

    new Error().stack;

    return map;
});

const stacktrace = opts => runner(function () {
    const {prepareStackTrace: p, stackTraceLimit: l} = Error;

    this.finally(() => Error.prepareStackTrace = p);
    if ([l, opts?.limit].every(x => x > 0 && Number.isInteger(x))) {
        this.finally(() => Error.stackTraceLimit = l);
        Error.stackTraceLimit = opts.limit;
    }

    const fns = Object.keys(opts)
        .filter(x => opts[x])
        .map(x => writers.get(x))
        .filter(Boolean);

    const stack = [];

    Error.prepareStackTrace = (_, callsites) => {
        for (let callsite of callsites) {
            const info = Object.create(null);
            stack.push(info);

            for (let fn of fns) fn(callsite, info);
        }

        return stack;
    };

    new Error().stack;

    return stack;
});

const env = {
    env: 'Unknown',
    test: false,
    worker: false,
    id: 'unknown',
};

async_runner(async function () {
    env.test = typeof describe == 'function'
        && typeof it == 'function'
        && typeof before == 'function'
        && typeof after == 'function';
    env.worker = typeof self != 'undefined';
    env.env = typeof Deno != 'undefined' && 'Deno'
        || typeof Bun != 'undefined' && 'Bun'
        || typeof process != 'undefined' && 'NodeJS'
        || typeof window != 'undefined' && 'Browser'
        || 'Unknown';

    if (typeof process != 'undefined') {
        const wt = await import('worker_threads');
        env.id = wt.isMainThread ? process.pid : wt.threadId;
    } else {
        env.id = typeof window != 'undefined' && window.name
            || typeof self != 'undefined' && self.name
            || typeof global != 'undefined' && global.name
            || typeof globalSelf != 'undefined' && globalSelf.name
            || 'unknown';
    }
});

export function location(skip = 0) {
    const st = stacktrace({
        getFileName: true,
        getEvalOrigin: true,
        getScriptNameOrSourceURL: true,
        getTypeName: true,
        getFunctionName: true,
        getMethodName: true,
        getLineNumber: true,
        getColumnNumber: true,
        isConstructor: true,
        isAsync: true,

        limit: 5 + skip,
    }).at(-1);

    return {
        file: st.getEvalOrigin || st.getFileName || st.getScriptNameOrSourceURL,
        function: st.getFunctionName || st.getMethodName,
        line: st.getLineNumber,
        column: st.getColumnNumber,
        class: st.getTypeName,
        modifiers: {
            new: st.isConstructor,
            await: st.isAsync,
        },
        env: {...env},
        getFileLocation() {
            return `${this.file}:${this.line}:${this.column}`;
        },
        getFunctionInfo() {
            return [
                this.modifiers.new && 'new ',
                this.modifiers.await && 'await ',
                this.class ? `${this.class}.` : '',
                this.function,
                `:${this.line}:${this.column}`
            ].filter(Boolean).join('');
        },
    };
}