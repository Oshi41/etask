
function get_prop_name(str) {
    for (let prefix of ['get', 'to']) {
        if (str.startsWith(prefix))
            str = str.substring(prefix.length);
    }
    
    return str;
}
const old = Error.prepareStackTrace;
Error.prepareStackTrace = (err, callsites) => {
    if (err.prepareStackTrace) {
        const opts = err.prepareStackTrace;
        
        if (Number.isInteger(opts.limit) && opts.limit > 0)
            callsites = callsites.slice(0, opts.limit);
            
        for (let i = 0, i < callsites.length; i++) {
            const info = {};
            for (let key of Object.keys(opts).filter(x => opts[x] && x in callsites[i])) {
                info[get_prop_name(key)] = callsites[i][fn]();
            }
            callsites[i] = info;
        }    
            
        return callsites;
    }
    
    if (old) return old(err, callsites);
    
    return err.stack;
};


export function detailed_stack_trace(opts = {toString: true}) {
    const prev =  opts.limit > 0 && Number.isInteger(opts.limit) && Error.stackTraceLimit > 0
        ? Error.stackTraceLimit
        : NaN;
    if (prev){
        Error.stackTraceLimit = opts.limit;
    }
    
    const result = {prepareStackTrace: opts};
    Error.captureStackTrace(result, detailed_stack_trace);
    
    if (prev){
        Error.stackTraceLimit = prev;
    }
    
    return result.stack;
}

