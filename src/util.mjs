export function runner(run) {
    const callbacks = {then: [], catch: [], finally: []};

    const _this = {
        finally: cb => callbacks.finally.push(cb),
        catch: cb => callbacks.catch.push(cb),
        then: cb => callbacks.then.push(cb),
    };

    try {
        const result = run.apply(_this);

        while (callbacks.then.length) {
            callbacks.then.pop()(result);
        }

        return result;
    } catch (e) {
        while (callbacks.catch.length) {
            callbacks.catch.pop()();
        }
    } finally {
        while (callbacks.finally.length) {
            callbacks.finally.pop()();
        }
    }
}

export async function async_runner(run) {
    const callbacks = {then: [], catch: [], finally: []};

    const _this = {
        finally: cb => callbacks.finally.push(cb),
        catch: cb => callbacks.catch.push(cb),
        then: cb => callbacks.then.push(cb),
    };

    try {
        const result = await run.apply(_this);

        while (callbacks.then.length) {
            await callbacks.then.pop()(result);
        }

        return result;
    } catch (e) {
        while (callbacks.catch.length) {
            await callbacks.catch.pop()();
        }
    } finally {
        while (callbacks.finally.length) {
            await callbacks.finally.pop()();
        }
    }
}