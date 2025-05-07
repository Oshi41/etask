export interface EnvInfo {
    /** The environment type: 'Deno', 'Bun', 'NodeJS', 'Browser', or 'Unknown' */
    env: 'Deno' | 'Bun' | 'NodeJS' | 'Browser' | 'Unknown';
    /** Whether the code is running in a test environment */
    test: boolean;
    /** Whether the code is running in a worker context */
    worker: boolean;
    /** Identifier for the current process/thread/context */
    id: string;
    /** Application identifier, typically the userAgent in browsers */
    app: string;
    /** The root path of the application */
    root: string;
}


export interface StackLocation {
    /** The file path where the function is defined */
    file: string;
    /** The function name */
    function: string | null;
    /** The line number in the file */
    line: number | null;
    /** The column number in the file */
    column: number | null;
    /** The class name (if applicable) */
    class: string | null;
    /** Function modifiers */
    modifiers: {
        /** Whether the function was called with 'new' */
        new: boolean;
        /** Whether the function is async */
        await: boolean;
    };
    /** Environment information */
    env: EnvInfo;
    /** Relative file path from the root */
    rel_file?: string;
    /** Formatted function information string */
    func_info: string;

}

/**
 * Returns function location and meta information
 * @param skip Number of stack frames to skip
 * @returns Location information object
 */
export function location(skip?: number): StackLocation;
