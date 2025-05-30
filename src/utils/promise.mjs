import {proxyThis} from "./proxy.mjs";

export async function sleep(ms) {
    const pwr = Promise.withResolvers();
    // Set up a timer to resolve the promise after the specified delay
    const timer = setTimeout(pwr.resolve, ms);
    // Ensure the timer is cleared when the promise is settled to prevent memory leaks
    return await pwr.promise.finally(() => clearTimeout(timer));
}

export function wrap(func) {
    return async function (...args) {
        const state = {
            pwr: Promise.withResolvers(),
        };
        const api = {
            then(resolve, reject) {
                return state.pwr.promise.then(resolve, reject);
            },
            catch(cb) {
                return state.pwr.promise.catch(cb);
            },
            finally(cb) {
                return state.pwr.promise.finally(cb);
            },
            timeout(mls) {
                sleep(mls).then(() => {
                    throw new Error('timeout');
                });
            },
        };
        const thisArg = proxyThis(this, api);

        try {
            const result = func.apply(thisArg, args);
            await state.pwr.resolve(result);
            return result;
        } catch (e) {
            await state.pwr.reject(e);
        }

        return await state.pwr.promise;
    };
}