/**
 * Constrains a number to be within a specified range.
 *
 * This utility function ensures that a value doesn't fall outside the specified minimum and maximum bounds.
 * It's useful for limiting values in animations, user inputs, calculations, and other scenarios where
 * a value needs to be constrained.
 *
 * @param {number} x - The number to constrain
 * @param {number} min - The lower boundary of the range
 * @param {number} max - The upper boundary of the range
 * @returns {number} A number between min and max (inclusive)
 *
 * @example
 * // Returns 5 (value within range)
 * Math.clamp(5, 0, 10);
 *
 * @example
 * // Returns 0 (clamped to min)
 * Math.clamp(-5, 0, 10);
 *
 * @example
 * // Returns 10 (clamped to max)
 * Math.clamp(15, 0, 10);
 */
Math.clamp = function clamp(x, min, max) {
    console.assert(min <= max, 'min must be less than or equal to max');
    if (x < min)
        return min;

    if (x > max)
        return max;

    return x;
};