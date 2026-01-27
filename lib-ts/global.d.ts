export {};

declare global {
  interface Dictionary<T> {
    [key: string]: T;
  }
}
