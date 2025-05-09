const Generator = Object.getPrototypeOf(function* () {

});

export function isGenerator(obj) {
    return obj instanceof Generator
        || obj?.constructor === Generator;
}

Generator.prototype.concat = function* (...others) {
    yield* this[Symbol.iterator]();

    for (let gen of others.filter(x => isGenerator(x))) {
        yield* gen;
    }
}

function* gen(end = 50) {
    for (let i = 0; i < end; i++) {
        yield i;
    }

    console.log('end');
}