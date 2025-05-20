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
    app: 'unknown',
    root: '',
};

await async_runner(async function () {
    env.test = typeof describe == 'function'
        && typeof it == 'function'
        && typeof before == 'function'
        && typeof after == 'function';
    env.worker = typeof window == 'undefined' && typeof self != 'undefined';
    env.env = typeof Deno != 'undefined' && 'Deno'
        || typeof Bun != 'undefined' && 'Bun'
        || typeof process != 'undefined' && 'NodeJS'
        || (typeof window != 'undefined' || typeof self != 'undefined') && 'Browser'
        || 'Unknown';
    env.app = typeof navigator != 'undefined' && navigator.userAgent;

    if (typeof process != 'undefined') {
        const wt = await import('worker_threads');
        env.id = wt.isMainThread ? process.pid : wt.threadId;
        let root = process.cwd();
        const separator = root.includes('\\') ? '\\' : '/';
        root = root.split(separator);
        while (root.length) {
            root.pop();
            try {
                await import(['file:', separator, ...root, 'package.json'].join(separator), {with: {type: 'json'}});
                env.root = ['file:', separator, ...root.slice(0, -1)].join(separator);
                break;
            } catch (e) {
                // ignored
            }
        }
    } else {
        const _this = typeof window != 'undefined' && window
            || typeof self != 'undefined' && self
            || typeof global != 'undefined' && global
            || typeof globalSelf != 'undefined' && globalSelf;

        env.root = _this?.location?.href && URL.parse(_this.location.href).origin || '';
        env.id = _this?.name || env.root || 'unknown';
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
        isToplevel: true,

        limit: 5 + skip,
    }).nodeAt(-1);

    const result = {
        file: st.getEvalOrigin || st.getFileName || st.getScriptNameOrSourceURL,
        function: st.getFunctionName || st.getMethodName || (st.isToplevel && '<top_func>'),
        line: st.getLineNumber,
        column: st.getColumnNumber,
        class: st.getTypeName,
        modifiers: {
            new: st.isConstructor,
            await: st.isAsync,
            top: st.isToplevel,
        },
        env: {...env},
    };

    if ([env.root, result.file].every(x => URL.canParse(x))) {
        const root = URL.parse(env.root).pathname;
        const file = URL.parse(result.file).pathname;
        if (file?.startsWith(root))
            result.rel_file = file.substring(root.length);
    }

    result.func_info = [
        result.class ? `${result.class}` : '',
        result.function,
        `:${result.line}:${result.column}`
    ].filter(Boolean).join('');

    return result;
}