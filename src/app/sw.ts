import { defaultCache } from "@serwist/next/worker";
const { Serwist } = require("@serwist/sw");
import type { PrecacheEntry } from "@serwist/sw";

declare const self: ServiceWorkerGlobalScope & {
    __SW_MANIFEST: PrecacheEntry[];
};

const serwist = new Serwist({
    precacheEntries: self.__SW_MANIFEST,
    skipWaiting: true,
    clientsClaim: true,
    navigationPreload: true,
    runtimeCaching: [
        ...defaultCache,
        {
            // Cache Supabase API calls
            matcher: ({ url }: { url: URL }) => url.hostname.includes("supabase.co"),
            handler: "NetworkFirst",
            options: {
                cacheName: "supabase-api-cache",
                expiration: {
                    maxEntries: 100,
                    maxAgeSeconds: 60 * 60 * 24 * 7, // 1 week
                },
            },
        },
        {
            // Cache Price List Images (Cloudinary, X, etc.)
            matcher: ({ request }: { request: Request }) => request.destination === "image",
            handler: "CacheFirst",
            options: {
                cacheName: "item-image-cache",
                expiration: {
                    maxEntries: 50,
                    maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
                },
            },
        }
    ],
});

serwist.addEventListeners();
