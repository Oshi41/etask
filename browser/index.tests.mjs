const map = new Map();

function run() {

}

map.set(function run() {

}, {});
map.set(function run() {

}, {a: 1});
map.set(run, {a: 1});
map.set(run, {a: 2});

console.log(map);