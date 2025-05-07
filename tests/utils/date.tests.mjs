import '../../src/utils/date.mjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';

// Import the Date.prototype.format implementation
// Note: Assuming it's already loaded or imported elsewhere in your project

/**
 * Helper function to create a date with specific components for consistent testing
 * @returns {Date} - A fixed test date object
 */
function createTestDate() {
    // Create a date: 2023-04-05 06:07:08.909 (April 5th, 2023, 6:07:08.909 AM)
    const date = new Date(2023, 3, 5, 6, 7, 8, 909);
    return date;
}

/**
 * Helper function to create a date with specific components in the PM for testing
 * @returns {Date} - A fixed test date object in the afternoon
 */
function createPMTestDate() {
    // Create a date: 2023-04-05 16:07:08.909 (April 5th, 2023, 4:07:08.909 PM)
    const date = new Date(2023, 3, 5, 16, 7, 8, 909);
    return date;
}

/**
 * Helper function to create a date with single-digit components for testing
 * @returns {Date} - A fixed test date with single-digit components
 */
function createSingleDigitTestDate() {
    // Create a date: 2023-01-01 01:02:03.004 (January 1st, 2023, 1:02:03.004 AM)
    const date = new Date(2023, 0, 1, 1, 2, 3, 4);
    return date;
}

// Group 1: Basic format patterns
test('Basic format patterns', async (t) => {
    const date = createTestDate();

    await t.test('Full year format (yyyy)', () => {
        assert.equal(date.format('yyyy'), '2023', 'Should format full year correctly');
    });

    await t.test('Two-digit year format (yy)', () => {
        assert.equal(date.format('yy'), '23', 'Should format two-digit year correctly');
    });

    await t.test('Two-digit month format (MM)', () => {
        assert.equal(date.format('MM'), '04', 'Should format two-digit month correctly');
    });

    await t.test('Single-digit month format (M)', () => {
        assert.equal(date.format('M'), '4', 'Should format single-digit month correctly');
    });

    await t.test('Two-digit day format (dd)', () => {
        assert.equal(date.format('dd'), '05', 'Should format two-digit day correctly');
    });

    await t.test('Single-digit day format (d)', () => {
        assert.equal(date.format('d'), '5', 'Should format single-digit day correctly');
    });
});

// Group 2: Time format patterns
test('Time format patterns', async (t) => {
    const date = createTestDate();

    await t.test('Two-digit hour format (HH)', () => {
        assert.equal(date.format('HH'), '06', 'Should format two-digit hour correctly');
    });

    await t.test('Single-digit hour format (H)', () => {
        assert.equal(date.format('H'), '6', 'Should format single-digit hour correctly');
    });

    await t.test('Two-digit minute format (mm)', () => {
        assert.equal(date.format('mm'), '07', 'Should format two-digit minute correctly');
    });

    await t.test('Single-digit minute format (m)', () => {
        assert.equal(date.format('m'), '7', 'Should format single-digit minute correctly');
    });

    await t.test('Two-digit second format (ss)', () => {
        assert.equal(date.format('ss'), '08', 'Should format two-digit second correctly');
    });

    await t.test('Single-digit second format (s)', () => {
        assert.equal(date.format('s'), '8', 'Should format single-digit second correctly');
    });
});

// Group 3: Millisecond format patterns
test('Millisecond format patterns', async (t) => {
    const date = createTestDate();

    await t.test('Three-digit millisecond format (fff)', () => {
        assert.equal(date.format('fff'), '909', 'Should format three-digit milliseconds correctly');
    });

    await t.test('Two-digit millisecond format (ff)', () => {
        assert.equal(date.format('ff'), '90', 'Should format two-digit milliseconds correctly');
    });

    await t.test('Single-digit millisecond format (f)', () => {
        assert.equal(date.format('f'), '9', 'Should format single-digit milliseconds correctly');
    });

    // Test with a single-digit millisecond value
    await t.test('Padding for single-digit milliseconds', () => {
        const singleDigitDate = createSingleDigitTestDate();
        assert.equal(singleDigitDate.format('fff'), '004', 'Should pad milliseconds with leading zeros');
        assert.equal(singleDigitDate.format('ff'), '00', 'Should pad two-digit milliseconds with leading zeros');
        assert.equal(singleDigitDate.format('f'), '0', 'Should pad single-digit milliseconds with leading zeros');
    });
});

// Group 4: Month name format patterns
test('Month name format patterns', async (t) => {
    const date = createTestDate();

    await t.test('Full month name format (MMMM)', () => {
        assert.equal(date.format('MMMM'), 'April', 'Should format full month name correctly');
    });

    await t.test('Abbreviated month name format (MMM)', () => {
        assert.equal(date.format('MMM'), 'Apr', 'Should format abbreviated month name correctly');
    });

    await t.test('Month name with different locale', () => {
        assert.equal(date.format('MMMM', 'es-ES'), 'abril', 'Should format month name according to locale');
        assert.equal(date.format('MMM', 'fr-FR'), 'avr.', 'Should format abbreviated month name according to locale');
    });
});

// Group 5: Combined format patterns
test('Combined format patterns', async (t) => {
    const date = createTestDate();

    await t.test('ISO date format (yyyy-MM-dd)', () => {
        assert.equal(date.format('yyyy-MM-dd'), '2023-04-05', 'Should format ISO date correctly');
    });

    await t.test('US date format (MM/dd/yyyy)', () => {
        assert.equal(date.format('MM/dd/yyyy'), '04/05/2023', 'Should format US date correctly');
    });

    await t.test('Time format (HH:mm:ss)', () => {
        assert.equal(date.format('HH:mm:ss'), '06:07:08', 'Should format time correctly');
    });

    await t.test('DateTime format (yyyy-MM-dd HH:mm:ss)', () => {
        assert.equal(date.format('yyyy-MM-dd HH:mm:ss'), '2023-04-05 06:07:08', 'Should format datetime correctly');
    });

    await t.test('Full format with milliseconds (yyyy-MM-dd HH:mm:ss.fff)', () => {
        assert.equal(date.format('yyyy-MM-dd HH:mm:ss.fff'), '2023-04-05 06:07:08.909', 'Should format full datetime with milliseconds correctly');
    });
});

// Group 6: Edge cases and special scenarios
test('Edge cases and special scenarios', async (t) => {
    await t.test('Empty format string', () => {
        const date = createTestDate();
        assert.equal(date.format(''), '', 'Should return empty string for empty format');
    });

    await t.test('Format string with non-matching patterns', () => {
        const date = createTestDate();
        assert.equal(date.format('abc'), 'abc', 'Should return unchanged string for non-matching patterns');
    });

    await t.test('Format string with mixed matching and non-matching patterns', () => {
        const date = createTestDate();
        assert.equal(date.format('Year: yyyy, Month: MM'), 'Year: 2023, Month: 04', 'Should handle mixed patterns correctly');
    });

    await t.test('Multiple occurrences of the same pattern', () => {
        const date = createTestDate();
        assert.equal(date.format('yyyy-yyyy MM-MM'), '2023-2023 04-04', 'Should handle multiple occurrences of the same pattern');
    });
});

// Group 7: Different locales
test('Different locales', async (t) => {
    const date = createTestDate();

    await t.test('English locale (default)', () => {
        assert.equal(date.format('MMMM'), 'April', 'Should use English locale by default');
    });

    await t.test('Spanish locale', () => {
        assert.equal(date.format('MMMM', 'es-ES'), 'abril', 'Should respect Spanish locale');
    });

    await t.test('French locale', () => {
        assert.equal(date.format('MMMM', 'fr-FR'), 'avril', 'Should respect French locale');
    });

    await t.test('German locale', () => {
        assert.equal(date.format('MMMM', 'de-DE'), 'April', 'Should respect German locale');
    });

    await t.test('Japanese locale', () => {
        assert.equal(date.format('MMMM', 'ja-JP'), '4月', 'Should respect Japanese locale');
    });
});

// Group 8: Special date components
test('Single-digit date components', async (t) => {
    const date = createSingleDigitTestDate(); // 2023-01-01 01:02:03.004

    await t.test('Single-digit components with padding', () => {
        assert.equal(date.format('yyyy-MM-dd HH:mm:ss.fff'), '2023-01-01 01:02:03.004',
            'Should pad single-digit components with leading zeros when using two-character format');
    });

    await t.test('Single-digit components without padding', () => {
        assert.equal(date.format('yyyy-M-d H:m:s.f'), '2023-1-1 1:2:3.0',
            'Should not pad single-digit components when using single-character format');
    });
});