import {ETask, ETaskOptions} from "./etask";

export function etask<TArgs, TRes>(fn: (args: TArgs) => PromiseLike<TRes>, options?: ETaskOptions): (args: TArgs) => ETask<TArgs, TRes>;