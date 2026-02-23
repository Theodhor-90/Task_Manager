export interface App {
  get: (path: string, handler: () => unknown | Promise<unknown>) => void;
}

export function buildApp(): App {
  return {
    get: () => {
      // placeholder app implementation for this phase scaffold
    },
  };
}
