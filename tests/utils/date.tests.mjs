import {format} from "../../src/utils/date.mjs";
import {describe, it} from "node:test";
import assert from "assert";

describe("format", () => {
    it("should format full date with yyyy-MM-dd HH:mm:ss", () => {
        const date = new Date("2023-12-01T15:04:05");
        const formatted = format(date, "yyyy-MM-dd HH:mm:ss");
        assert.strictEqual(formatted, "2023-12-01 15:04:05");
    });

    it("should format date with short year (yy)", () => {
        const date = new Date("2023-01-15");
        const formatted = format(date, "yy-MM-dd");
        assert.strictEqual(formatted, "23-01-15");
    });

    it("should format date with full and abbreviated month names (MMMM, MMM)", () => {
        const date = new Date("2023-07-04");
        assert.strictEqual(format(date, "MMMM"), "July");
        assert.strictEqual(format(date, "MMM"), "Jul");
    });

    it("should format date with single digit month and day (M, d)", () => {
        const date = new Date("2023-03-05");
        assert.strictEqual(format(date, "M"), "3");
        assert.strictEqual(format(date, "d"), "5");
    });

    it("should format time with single and double digit hours, minutes, and seconds", () => {
        const date = new Date("2023-12-31T03:07:09");
        assert.strictEqual(format(date, "HH:mm:ss"), "03:07:09");
        assert.strictEqual(format(date, "H:m:s"), "3:7:9");
    });

    it("should format milliseconds with f, ff, and fff", () => {
        const date = new Date("2023-10-10T10:10:10.123");
        assert.strictEqual(format(date, "f"), "1");
        assert.strictEqual(format(date, "ff"), "12");
        assert.strictEqual(format(date, "fff"), "123");
    });

    it("should handle invalid format strings without modifying them", () => {
        const date = new Date("2023-12-01T12:00:00");
        assert.strictEqual(format(date, "invalid-string"), "invalid-string");
    });

    it("should format with a custom locale for month names", () => {
        const date = new Date("2023-12-25");
        const formatted = format(date, "MMMM", "fr-FR");
        assert.strictEqual(formatted, "décembre");
    });

    it("should handle edge case of Date at epoch (1970-01-01 00:00:00)", () => {
        // Epoch
        const date = new Date(new Date(0).toLocaleString('en-US', {timeZone: "UTC"}));
        const formatted = format(date, "yyyy-MM-dd HH:mm:ss");
        assert.strictEqual(formatted, "1970-01-01 00:00:00");
    });

    it("should handle incorrect input gracefully", () => {
        assert.throws(() => format(null, "yyyy-MM-dd"), /Cannot read properties of null/);
        assert.throws(() => format(undefined, "yyyy-MM-dd"), /Cannot read properties of undefined/);
    });
});