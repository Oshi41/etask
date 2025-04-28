/**
 * Creates a disposable object from various input types.
 * @param resourceOrFunction - A resource with a dispose method, a function to call on disposal, or nothing.
 * @param clearFunction - A function that will be called with the resource when disposing.
 * @returns A Disposable object.
 */
export function as_disposable<T>(disposable: { dispose(): void } | { [Symbol.dispose](): void }): Disposable;
export function as_disposable(clearFn: () => void): Disposable;
export function as_disposable<T>(arg: T, clearFunction: (arg: T) => void): Disposable;

/**
 * Represents a collection of disposable resources that can be disposed of together.
 * Implements the Disposable interface and provides methods to manage a group of disposable objects.
 * This is useful for tracking and cleaning up multiple resources at once in a single operation.
 */
export class CompositeDisposable implements Disposable {
    /**
     * Indicates whether this CompositeDisposable has been disposed.
     * Once disposed, it cannot be used to track additional resources.
     */
    readonly disposed: boolean;
    /**
     * The number of resources currently being tracked by this CompositeDisposable.
     */
    readonly size: number;

    /**
     * Disposes all resources being tracked by this CompositeDisposable and marks it as disposed.
     * After calling this method, the CompositeDisposable can no longer be used to track resources.
     */
    dispose(): void;

    [Symbol.dispose](): void;

    /**
     * Adds one or more disposable objects to be tracked by this CompositeDisposable.
     *
     * @param disposables - The disposable objects to add.
     * @returns This CompositeDisposable instance for method chaining.
     */
    add(...disposables: Disposable[]): this;

    /**
     * Adds a resource with a custom cleanup function to be tracked by this CompositeDisposable.
     * The cleanup function will be called with the resource when this CompositeDisposable is disposed.
     *
     * @param resource - The resource to be cleaned up.
     * @param clearFunction - A function that will be called to clean up the resource.
     * @returns This CompositeDisposable instance for method chaining.
     */
    add<T>(resource: T, clearFunction: (resource: T) => void): this;

    /**
     * Adds a cleanup function with no associated resource to be tracked by this CompositeDisposable.
     * The function will be called when this CompositeDisposable is disposed.
     *
     * @param clearFunction - A function that will be called during disposal.
     * @returns This CompositeDisposable instance for method chaining.
     */
    add(clearFunction: () => void): this;
}