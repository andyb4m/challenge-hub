import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Challenge Hub",
    short_name: "Challenge Hub",
    description: "Compete in fitness challenges with friends, powered by Strava.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#0f0f23",
    theme_color: "#0f0f23",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
