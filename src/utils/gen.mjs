const Generator = Object.getPrototypeOf(function* () {

});

export function isGenerator(obj) {
    return obj instanceof Generator
        || obj?.constructor === Generator;
}

Generator.prototype.concat = function* (...others) {
    yield* this[Symbol.iterator]();

    for (let other of others) {
        if (other instanceof Generator)
            yield* other();
        else if (other?.constructor === Generator)
            yield* other;
    }
}