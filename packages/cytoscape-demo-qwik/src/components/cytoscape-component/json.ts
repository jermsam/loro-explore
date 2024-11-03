export const get = <T, K extends keyof T>(
  obj: T | null | undefined,
  key: K
): T[K] | null => (obj != null ? obj[key] : null);

export const toJson = <T>(obj: T): T => obj;

export const forEach = <T>(
  arr: T[],
  iterator: (value: T, index: number, array: T[]) => void
): void => arr.forEach(iterator);
