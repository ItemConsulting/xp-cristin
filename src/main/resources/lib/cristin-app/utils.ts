export function notNullOrUndefined<T>(val: T | null | undefined | void): val is T {
  return val !== null && val !== undefined;
}

export function forceArray<A>(data: A | Array<A> | undefined): Array<A>;
export function forceArray<A>(data: A | ReadonlyArray<A> | undefined): ReadonlyArray<A>;
export function forceArray<A>(data: A | Array<A> | undefined): ReadonlyArray<A> {
  data = data || [];
  return Array.isArray(data) ? data : [data];
}

export function arrayToRecord<X>(xs: Array<X>, f: (x: X) => string): Record<string, X> {
  return xs.reduce<Record<string, X>>((rec, x) => {
    rec[f(x)] = x;
    return rec;
  }, {});
}
