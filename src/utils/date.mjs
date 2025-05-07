/**
 * Formats a Date object according to a specified format string
 *
 * @param format {string} - The format pattern to use (e.g., "yyyy-MM-dd HH:mm:ss")
 * @param locale {string} - The locale to use for language-specific formatting (default: 'en-US')
 * @returns {string} - The formatted date string
 *
 * Supported format patterns:
 * yyyy - Full year (e.g., 2023)
 * yy   - Two-digit year (e.g., 23)
 * MMMM - Full month name (e.g., January)
 * MMM  - Abbreviated month name (e.g., Jan)
 * MM   - Two-digit month (01-12)
 * M    - Month without leading zero (1-12)
 * dd   - Two-digit day of month (01-31)
 * d    - Day of month without leading zero (1-31)
 * HH   - Two-digit hour in 24-hour format (00-23)
 * H    - Hour in 24-hour format without leading zero (0-23)
 * mm   - Two-digit minutes (00-59)
 * m    - Minutes without leading zero (0-59)
 * ss   - Two-digit seconds (00-59)
 * s    - Seconds without leading zero (0-59)
 * fff  - Milliseconds with three digits (000-999)
 * ff   - Milliseconds with two digits (00-99)
 * f    - Milliseconds with one digit (0-9)
 */
Date.prototype.format = function (format, locale = 'en-US') {
    return format.replace(/\b(yyyy|yy|MMMM|MMM|MM|M|dd|d|HH|H|mm|m|ss|s|fff|ff|f)\b/g, (match) => {

        switch (match) {
            case 'yyyy':
                return this.getFullYear();
            case 'yy':
                return this.getFullYear().toString().slice(-2);

            case 'MMMM':
                return new Intl.DateTimeFormat(locale, {month: 'long'}).format(this);
            case 'MMM':
                return new Intl.DateTimeFormat(locale, {month: 'short'}).format(this);
            case 'MM':
                return (this.getMonth() + 1).toString().padStart(2, '0');
            case 'M':
                return (this.getMonth() + 1);

            case 'dd':
                return this.getDate().toString().padStart(2, '0');
            case 'd':
                return this.getDate();

            case 'HH':
                return this.getHours().toString().padStart(2, '0');
            case 'H':
                return this.getHours();

            case 'mm':
                return this.getMinutes().toString().padStart(2, '0');
            case 'm':
                return this.getMinutes();

            case 'ss':
                return this.getSeconds().toString().padStart(2, '0');
            case 's':
                return this.getSeconds();

            case 'fff':
            case 'ff':
            case 'f':
                return this.getMilliseconds().toString().padStart(3, '0').slice(0, match.length);

            default:
                return match;
        }
    });
}

