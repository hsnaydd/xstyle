/**
 * Turns a token record into the named-value pairs a rule's `values` expects,
 * preserving the token names as literal types. Exported for preset authors.
 */
export function toNamedValues<const T extends Record<string | number, string>>(
  obj: T,
): Array<
  { [K in keyof T & (string | number)]: readonly [`${K & (string | number)}`, T[K]] }[keyof T &
    (string | number)]
> {
  return Object.entries(obj).map(([k, v]) => [k, v] as const) as never;
}
