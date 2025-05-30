import {assert} from "./global.mjs";
import {isFunc} from "./types.mjs";

export const once = (func) => {
    assert(isFunc(func), 'func must be a function');

    let run;
    return function (...args) {
        if (!run) {
            try {
                run = {result: func.apply(this, args)};
            } catch (e) {
                run = {error: e};
            }
        }

        if (run?.error) throw run.error;

        return run.result;
    };
}

// /**
//  *
//  * @param func {function}
//  * @returns {function}
//  */
// export async function once(func) {
//     assert(isFunc(func), 'func must be a function');
//
//     // let res = {};
//     //
//     // return function (...args) {
//     //     if (res.error)
//     //         throw res.error;
//     //
//     //     if (res.value)
//     //         return res.value;
//     //
//     //     try {
//     //         return res.value = func.apply(this, args);
//     //     } catch (e) {
//     //         throw res.error = e;
//     //     }
//     // };
// }