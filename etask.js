/**
 * @typedef {Promise | Generator | AsyncGenerator | any} YieldFunctionResult
 */

/**
 * @function
 * @generator
 * @typedef {(this: ThisArg) => Generator | AsyncGenerator} GenFunc
 */

/**
 * @typedef {Object} ThisArg
 * @property {(cb: ()=>YieldFunctionResult)=>void} then - Callback executed after success execution
 * @property {(cb: ()=>YieldFunctionResult)=>void} finally - Callback executed after all
 * @property {(cb: (e: Error)=>YieldFunctionResult)=>void} catch - Catching errors
 * @property {(cb: (mls: number, cb: ()=>YieldFunctionResult)=>YieldFunctionResult)=>void} after - Execute after delay
 * if main function is still executing. Perfect place for timeout handling
 * @property {(e: Error) => void} throw Throws an error and stop execution
 * @property {(e: any) => void} return Returns value and stop execution
 * @property {(mls: number) => Promise} sleep - pause execution
 * @property {Date} stats.start - executing timestamp start
 * @property {Date} stats.end - end of successfull execution
 */

async function promisify(fn) {
    // generator
    if (fn?.next) {
        let step;
        while (!step?.done) {
            // possible async generator
            step = await promisify(fn.next());
            // possible yield new Promise()
            step.value = await promisify(step.value);
        }
        return step.value;

        // async
    } else if (fn?.then) {
        return await fn;
    }

    // sync
    return fn;
}

/**
 * @param arr {[]}
 * @param params {any}
 * @returns {Promise<void>}
 */
async function execute_array(arr, ...params) {
    if (!arr?.length) return;

    for (let fn of arr) {
        try {
            await promisify(fn(...params));
        } catch (e) {
            console.error('Error during callback execution:', e);
            throw e;
        }
    }
}

/**
 *
 * @param fn {(this: ThisArg) => Generator | AsyncGenerator} generator func
 * @returns {Promise<any>}
 */
export default function etask(fn) {
    const cb = {then: [], catch: [], finally: []};
    return new Promise(async (resolve, reject) => {
        let executed = false, promise_result;
        const this_arg = {
            sleep: mls => new Promise(resolve => setTimeout(resolve, mls)),
            throw: reject,
            return: resolve,
            then: fn => cb.then.push(fn),
            catch: fn => cb.catch.push(fn),
            finally: fn => cb.finally.push(fn),
            after: (mls, fn) => {
                this_arg.sleep(mls).then(() => {
                    // still running
                    if (!executed) {
                        return fn();
                    }
                });
            },
            stats: {
                start: new Date(),
            },
        };

        try {
            promise_result = await promisify(fn.call(this_arg));
            executed = true;
            this_arg.stats.end = new Date();
            await execute_array(cb.then);
        } catch (e) {
            executed = true;
            if (cb.catch?.length)
                await execute_array(cb.catch, e);
            else
                return reject(e);

        } finally {
            // executing then finally
            await execute_array(cb.finally);
        }

        return resolve(promise_result);
    });
}