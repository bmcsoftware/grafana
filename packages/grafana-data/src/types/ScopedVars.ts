export interface ScopedVar<T = unknown> {
  text: any;
  value: T;
  [key: string]: any;
}

export interface ScopedVars extends Record<string, ScopedVar> {}
