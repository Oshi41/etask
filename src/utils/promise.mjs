export async function sleep(ms) {
    const pwr = Promise.withResolvers();
    // Set up a timer to resolve the promise after the specified delay
    const timer = setTimeout(pwr.resolve, ms);
    // Ensure the timer is cleared when the promise is settled to prevent memory leaks
    return await pwr.promise.finally(() => clearTimeout(timer));
}

