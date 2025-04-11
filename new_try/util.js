/**
 * Gets uniq name for etask.
 * Generates a unique identifier including file name, function name, and code line
 * Format: 'file.func:line' for identification
 *
 * @param {Function} fn - The function to extract info from
 * @returns {string} - A unique name for the etask
 */
export function get_uniq_name(fn) {
    // Extract function name or use anonymous if not available
    const funcName = fn.name || 'anonymous';

    // Extract stack to get file and line information
    const stack = new Error().stack;
    let fileName = 'unknown';
    let lineNumber = 0;

    // Parse stack trace to extract file name and line number
    // Stack format varies across browsers but typically follows a pattern
    if (stack) {
        // Skip first line which is the Error message itself
        const stackLines = stack.split('\n').slice(1);

        // Find the caller line (usually the 3rd line in the stack, after get_uniq_name and constructor)
        for (const line of stackLines) {
            // Skip if it's internal to our etask implementation
            if (line.includes('etask.js') && !line.includes('get_uniq_name')) {
                continue;
            }

            // Extract file and line information
            const match = line.match(/at (?:.*\s+\()?(?:(.+?):(\d+)(?::\d+)?|([^)]+))\)?/);
            if (match) {
                // Extract file path and get just the file name
                const fullPath = match[1] || match[3] || 'unknown';
                fileName = fullPath.split(/[\/\\]/).pop() || fullPath;
                lineNumber = match[2] || '0';
                break;
            }
        }
    }

    // Create a base name
    return `${fileName}.${funcName}:${lineNumber}`;
}