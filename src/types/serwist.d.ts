declare module "@serwist/next/browser" {
    export const defaultCache: any;
}

declare module "@serwist/sw" {
    export class Serwist {
        constructor(config: any);
        addEventListeners(): void;
    }
    export type PrecacheEntry = any;
    export type RuntimeCaching = any;
}
