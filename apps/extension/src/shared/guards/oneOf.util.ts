/** Whether `value` is one of `options`, narrowing it to that union. */
export function isOneOf<T extends string>(options: readonly T[], value: unknown): value is T {
  return (options as readonly unknown[]).includes(value);
}
