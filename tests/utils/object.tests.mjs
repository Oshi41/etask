import assert from 'assert';
import '../../src/utils/object.mjs';

describe('Object Extensions', function () {
    describe('pathValidate', function () {
        // Note: pathValidate is private, but we can test it indirectly through the public methods

        // We'll test it through the behavior of Object.get and Object.set
    });

    describe('Object.get', function () {
        it('should retrieve a property using dot notation', function () {
            const obj = {user: {profile: {name: 'John'}}};
            assert.strictEqual(Object.get(obj, 'user.profile.name'), 'John');
        });

        it('should retrieve a property using array notation', function () {
            const obj = {user: {profile: {name: 'John'}}};
            assert.strictEqual(Object.get(obj, ['user', 'profile', 'name']), 'John');
        });

        it('should handle bracket notation', function () {
            const obj = {user: {profile: {name: 'John'}}};
            assert.strictEqual(Object.get(obj, 'user[profile][name]'), 'John');
        });

        it('should handle mixed notation', function () {
            const obj = {users: [{name: 'John'}]};
            assert.strictEqual(Object.get(obj, 'users[0].name'), 'John');
        });

        it('should return undefined for non-existent paths', function () {
            const obj = {user: {profile: {}}};
            assert.strictEqual(Object.get(obj, 'user.profile.name'), undefined);
        });

        it('should handle arrays', function () {
            const obj = {users: ['John', 'Jane']};
            assert.strictEqual(Object.get(obj, 'users.0'), 'John');
            assert.strictEqual(Object.get(obj, 'users.1'), 'Jane');
        });

        it('should return the input object when path is empty', function () {
            const obj = {name: 'John'};
            assert.strictEqual(Object.get(obj, ''), obj);
            assert.strictEqual(Object.get(obj, []), obj);
        });
    });

    describe('Object.set', function () {
        it('should set a property using dot notation', function () {
            const obj = {user: {profile: {}}};
            Object.set(obj, 'user.profile.name', 'John');
            assert.deepStrictEqual(obj, {user: {profile: {name: 'John'}}});
        });

        it('should set a property using array notation', function () {
            const obj = {user: {profile: {}}};
            Object.set(obj, ['user', 'profile', 'name'], 'John');
            assert.deepStrictEqual(obj, {user: {profile: {name: 'John'}}});
        });

        it('should create intermediate objects if they do not exist', function () {
            const obj = {};
            Object.set(obj, 'user.profile.name', 'John');
            assert.deepStrictEqual(obj, {user: {profile: {name: 'John'}}});
        });

        it('should handle bracket notation', function () {
            const obj = {};
            Object.set(obj, 'user[profile][name]', 'John');
            assert.deepStrictEqual(obj, {user: {profile: {name: 'John'}}});
        });

        it('should handle mixed notation', function () {
            const obj = {users: []};
            Object.set(obj, 'users[0].name', 'John');
            assert.deepStrictEqual(obj, {users: [{name: 'John'}]});
        });

        it('should overwrite existing values', function () {
            const obj = {user: {profile: {name: 'Jane'}}};
            Object.set(obj, 'user.profile.name', 'John');
            assert.deepStrictEqual(obj, {user: {profile: {name: 'John'}}});
        });

        it('should handle arrays', function () {
            const obj = {users: ['Jane']};
            Object.set(obj, 'users.0', 'John');
            assert.deepStrictEqual(obj, {users: ['John']});
        });

        it('should extend arrays when setting out-of-bounds indices', function () {
            const obj = {users: []};
            Object.set(obj, 'users.1', 'John');
            // Note: JavaScript arrays don't show empty items in deepStrictEqual
            assert.strictEqual(obj.users.length, 2);
            assert.strictEqual(obj.users[1], 'John');
        });
    });

    describe('Complex scenarios', function () {
        it('should allow getting and setting nested properties in a chain', function () {
            const obj = {};
            Object.set(obj, 'user.profile', {name: 'John'});
            Object.set(obj, 'user.settings', {theme: 'dark'});

            assert.strictEqual(Object.get(obj, 'user.profile.name'), 'John');
            assert.strictEqual(Object.get(obj, 'user.settings.theme'), 'dark');
        });

        it('should handle complex paths with multiple notations', function () {
            const obj = {
                companies: [
                    {
                        name: 'ABC Corp',
                        employees: [
                            {id: 1, name: 'John'},
                            {id: 2, name: 'Jane'}
                        ]
                    }
                ]
            };

            assert.strictEqual(Object.get(obj, 'companies[0].employees[1].name'), 'Jane');

            Object.set(obj, 'companies[0].employees[1].role', 'Manager');
            assert.strictEqual(Object.get(obj, 'companies[0].employees[1].role'), 'Manager');
        });
    });
});