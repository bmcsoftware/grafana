import { useEffect, useRef } from 'react';

/*
 * Creates an array of integers from start to end, inclusive
 */
export function range(start: number, end: number) {
  const array: number[] = [];

  for (let i = start; i <= end; i++) {
    array.push(i);
  }

  return array;
}

/*
 * Sorts an array of numbers
 */
export function sort(array: number[]) {
  array.sort(function (a, b) {
    return a - b;
  });

  return array;
}

/*
 * Removes duplicate entries from an array
 */
export function dedup(array: number[]) {
  const result: number[] = [];

  array.forEach(function (i) {
    if (result.indexOf(i) < 0) {
      result.push(i);
    }
  });

  return result;
}

/*
 * React useEffect hook to return the previous value
 */
export function usePrevious(value: any) {
  const ref = useRef(value);

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
}
