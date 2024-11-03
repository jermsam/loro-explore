const eitherIsNil = <T>(a: T | null | undefined, b: T | null | undefined): boolean =>
  a == null || b == null;

interface Hashable {
  hash(): any;
}

export const hashDiff = <T extends Hashable>(
  a: T | null | undefined,
  b: T | null | undefined
): boolean => {
  return eitherIsNil(a, b) || a!.hash() !== b!.hash();
};

export const shallowObjDiff = <T extends Record<string, any>>(
  a: T | null | undefined,
  b: T | null | undefined
): boolean => {
  if (eitherIsNil(a, b) && !(a == null && b == null)) {
    return true;
  }
  
  if (a === b) {
    // can't do a diff on the same obj
    return false;
  }
  
  // Non-object values can be compared with the equality operator
  if (typeof a !== 'object' || typeof b !== 'object' || a == null || b == null) {
    return a !== b;
  }
  
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  
  const mismatches = (key: string) => a[key] !== b[key];
  
  if (aKeys.length !== bKeys.length) {
    return true;
  }
  
  return aKeys.some(mismatches) || bKeys.some(mismatches);
  
};
